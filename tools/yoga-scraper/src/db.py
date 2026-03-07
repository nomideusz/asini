"""
Database connection and schema validation for yoga-scraper.

Uses libsql_client (HTTP-based) to connect to Turso or local SQLite.
Validates that all columns the scraper writes to exist before any operation.
"""

import os
import logging
from typing import Optional

import libsql_client
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("yoga-scraper.db")

# ── Canonical yoga styles (whitelist) ─────────────────────────────────────────
# Only these styles are allowed in the `styles` table.
# The STYLE_ALIASES map normalizes LLM output and Polish names to canonical form.

CANONICAL_STYLES = [
    "Ashtanga", "Vinyasa", "Hatha", "Iyengar", "Kundalini", "Yin",
    "Yin/Restorative", "Aerial", "Hot Yoga", "Pregnancy", "Nidra",
    "Mysore", "Power Yoga", "Jivamukti", "Pilates", "Pilates Reformer",
    "Stretching", "Meditation", "Pranayama", "Therapeutic", "Tai Chi",
    "Barre",
]

STYLE_ALIASES: dict[str, str] = {
    # Canonical (lowercase) → Canonical
    s.lower(): s for s in CANONICAL_STYLES
} | {
    # Common LLM variations
    "hatha yoga": "Hatha",
    "ashtanga yoga": "Ashtanga",
    "ashtanga vinyasa": "Ashtanga",
    "vinyasa yoga": "Vinyasa",
    "vinyasa flow": "Vinyasa",
    "flow yoga": "Vinyasa",
    "flow": "Vinyasa",
    "iyengar yoga": "Iyengar",
    "kundalini yoga": "Kundalini",
    "yin yoga": "Yin",
    "restorative": "Yin/Restorative",
    "restorative yoga": "Yin/Restorative",
    "yin restorative": "Yin/Restorative",
    "aerial yoga": "Aerial",
    "joga w hamakach": "Aerial",
    "hamaki": "Aerial",
    "antigravity": "Aerial",
    "antigravity yoga": "Aerial",
    "hot yoga": "Hot Yoga",
    "bikram": "Hot Yoga",
    "bikram yoga": "Hot Yoga",
    "joga dla ciężarnych": "Pregnancy",
    "joga dla kobiet w ciąży": "Pregnancy",
    "prenatal": "Pregnancy",
    "prenatal yoga": "Pregnancy",
    "yoga nidra": "Nidra",
    "joga nidra": "Nidra",
    "mysore ashtanga": "Mysore",
    "power yoga": "Power Yoga",
    "power": "Power Yoga",
    "jivamukti yoga": "Jivamukti",
    "pilates matowy": "Pilates",
    "pilates mat": "Pilates",
    "pilates na reformerze": "Pilates Reformer",
    "reformer": "Pilates Reformer",
    "reformer pilates": "Pilates Reformer",
    "rozciąganie": "Stretching",
    "stretching": "Stretching",
    "medytacja": "Meditation",
    "meditation": "Meditation",
    "mindfulness": "Meditation",
    # Pranayama
    "pranayama": "Pranayama",
    "pranajama": "Pranayama",
    # Therapeutic
    "therapeutic": "Therapeutic",
    "therapeutic yoga": "Therapeutic",
    "yoga therapy": "Therapeutic",
    "joga terapeutyczna": "Therapeutic",
    # Tai Chi / Qigong
    "tai chi": "Tai Chi",
    "tai-chi": "Tai Chi",
    "taichi": "Tai Chi",
    "qigong": "Tai Chi",
    "qi-gong": "Tai Chi",
    "qi gong": "Tai Chi",
    # Barre
    "barre": "Barre",
    "barre fitness": "Barre",
    "barre pilates": "Barre",
    # Polish generic names
    "joga": "Hatha",
    "yoga": "Hatha",
}


def normalize_style(name: str) -> Optional[str]:
    """Map a style name to its canonical form. Returns None if not recognized."""
    if not name or not isinstance(name, str):
        return None
    key = name.strip().lower()
    return STYLE_ALIASES.get(key)


# ── Required columns per table (the scraper reads/writes these) ──────────────
# This is the contract with the SvelteKit Drizzle schema.
# If a column is renamed/removed there, the scraper will fail loudly at startup.

REQUIRED_COLUMNS = {
    "schools": [
        "id", "name", "city", "address", "website_url", "phone", "email",
        "price", "trial_price", "single_class_price", "pricing_notes", "pricing_json",
        "rating", "reviews",
        "description_raw", "description", "editorial_summary",
        "opening_hours", "image_url", "photo_reference",
        "neighborhood", "latitude", "longitude",
        "google_place_id", "google_maps_url",
        "pricing_url", "schedule_url", "schedule_source", "last_schedule_crawl",
        "last_price_check", "last_updated", "source",
        "created_at",
    ],
    "styles": ["id", "name"],
    "school_styles": ["school_id", "style_id"],
    "schedule_entries": [
        "id", "school_id",
        "schedule_type", "day_of_week", "date", "start_time", "end_time", "duration",
        "class_name", "class_description", "teacher", "level", "style", "location",
        "total_capacity", "spots_left", "waiting_list_capacity",
        "is_cancelled", "is_free", "is_bookable_online",
        "source", "external_id", "booking_url", "metadata",
        "last_seen_at", "created_at",
    ],
    "scrape_log": [
        "id", "school_id", "task", "status", "message",
        "fields_updated", "duration_ms", "created_at",
    ],
}


def get_connection() -> libsql_client.ClientSync:
    """
    Connect to the database (Turso remote or local SQLite file).

    Uses env vars:
        TURSO_DATABASE_URL  – libsql:// URL or file:path.db
        TURSO_AUTH_TOKEN    – required for remote Turso
    """
    url = os.getenv("TURSO_DATABASE_URL", "file:local.db")
    token = os.getenv("TURSO_AUTH_TOKEN", "")

    if url.startswith("libsql://") or url.startswith("https://"):
        # libsql_client uses wss:// for libsql:// URLs which Turso may reject.
        # Convert to https:// for reliable HTTP transport.
        http_url = url.replace("libsql://", "https://")
        log.info("Connecting to remote Turso: %s", http_url.split("@")[-1] if "@" in http_url else http_url)
        conn = libsql_client.create_client_sync(url=http_url, auth_token=token)
    else:
        log.info("Connecting to local DB: %s", url)
        conn = libsql_client.create_client_sync(url=url)

    return conn


def _rows_to_dicts(rs: libsql_client.ResultSet) -> list[dict]:
    """Convert a ResultSet to a list of dicts using column names."""
    return [dict(zip(rs.columns, row)) for row in rs.rows]


def validate_schema(conn: libsql_client.ClientSync) -> None:
    """
    Validate that all required columns exist in the database.
    Raises RuntimeError with a clear message listing missing columns.

    Call this once at startup before any scraping begins.
    """
    errors: list[str] = []

    for table, required_cols in REQUIRED_COLUMNS.items():
        try:
            rs = conn.execute(f"PRAGMA table_info({table})")
            if not rs.rows:
                errors.append(f"Table '{table}' does not exist")
                continue
            db_cols = {row[1] for row in rs.rows}  # column name is index 1
            missing = set(required_cols) - db_cols
            if missing:
                errors.append(f"Table '{table}' missing columns: {sorted(missing)}")
        except Exception as e:
            errors.append(f"Cannot inspect table '{table}': {e}")

    if errors:
        msg = "Schema validation failed!\n" + "\n".join(f"  • {e}" for e in errors)
        msg += "\n\nThe Drizzle schema in the web project may have changed."
        msg += "\nRun 'pnpm db:push' in the yoga web project, then retry."
        raise RuntimeError(msg)

    log.info("Schema validation passed (%d tables, %d columns)",
             len(REQUIRED_COLUMNS),
             sum(len(cols) for cols in REQUIRED_COLUMNS.values()))


# ── Query helpers ────────────────────────────────────────────────────────────


def get_school(conn: libsql_client.ClientSync, school_id: str) -> Optional[dict]:
    """Fetch a school row from the database."""
    rs = conn.execute("SELECT * FROM schools WHERE id = ?", [school_id])
    if not rs.rows:
        return None
    return dict(zip(rs.columns, rs.rows[0]))


def get_all_schools(conn: libsql_client.ClientSync, city: Optional[str] = None) -> list[dict]:
    """Fetch all schools, optionally filtered by city."""
    if city:
        rs = conn.execute(
            "SELECT * FROM schools WHERE LOWER(city) = LOWER(?) ORDER BY city, name",
            [city],
        )
    else:
        rs = conn.execute("SELECT * FROM schools ORDER BY city, name")
    return _rows_to_dicts(rs)


def get_school_styles(conn: libsql_client.ClientSync, school_id: str) -> list[str]:
    """Get style names for a school."""
    rs = conn.execute("""
        SELECT st.name FROM school_styles ss
        JOIN styles st ON ss.style_id = st.id
        WHERE ss.school_id = ?
    """, [school_id])
    return [row[0] for row in rs.rows]


def get_schools_needing_enrichment(
    conn: libsql_client.ClientSync, city: Optional[str] = None,
) -> list[dict]:
    """Find schools that need enrichment (no pricing scraped or no description)."""
    if city:
        rs = conn.execute("""
            SELECT * FROM schools
            WHERE (last_price_check IS NULL
                   OR (description_raw IS NULL OR description_raw = ''))
              AND LOWER(city) = LOWER(?)
            ORDER BY city, name
        """, [city])
    else:
        rs = conn.execute("""
            SELECT * FROM schools
            WHERE (last_price_check IS NULL
                   OR (description_raw IS NULL OR description_raw = ''))
            ORDER BY city, name
        """)
    return _rows_to_dicts(rs)


def get_schools_for_normalization(
    conn: libsql_client.ClientSync,
    school_id: Optional[str] = None,
    city: Optional[str] = None,
    force: bool = False,
) -> list[dict]:
    """Get schools that need description normalization."""
    query = "SELECT * FROM schools WHERE 1=1"
    params: list = []
    if school_id:
        query += " AND id = ?"
        params.append(school_id)
    if city:
        query += " AND LOWER(city) = LOWER(?)"
        params.append(city)
    if not force:
        query += " AND (description IS NULL OR description = '')"
    query += " ORDER BY city, name"
    rs = conn.execute(query, params)
    return _rows_to_dicts(rs)


def has_schedule(conn: libsql_client.ClientSync, school_id: str) -> bool:
    """Check if a school has any schedule entries."""
    rs = conn.execute(
        "SELECT COUNT(*) FROM schedule_entries WHERE school_id = ?",
        [school_id],
    )
    return rs.rows[0][0] > 0


# ── Write helpers ────────────────────────────────────────────────────────────


def upsert_school(conn: libsql_client.ClientSync, school: dict) -> None:
    """Insert or update a school row. Only non-None fields are updated on conflict."""
    conn.execute("""
        INSERT INTO schools (id, name, city, address, website_url, phone, email,
            rating, reviews, editorial_summary, opening_hours, photo_reference,
            neighborhood, latitude, longitude, google_place_id, google_maps_url,
            last_updated, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = COALESCE(excluded.name, name),
            city = COALESCE(excluded.city, city),
            address = CASE WHEN excluded.address != '' THEN excluded.address ELSE address END,
            website_url = CASE WHEN excluded.website_url != '' THEN excluded.website_url ELSE website_url END,
            phone = COALESCE(excluded.phone, phone),
            email = COALESCE(excluded.email, email),
            rating = COALESCE(excluded.rating, rating),
            reviews = COALESCE(excluded.reviews, reviews),
            editorial_summary = CASE WHEN excluded.editorial_summary != '' THEN excluded.editorial_summary ELSE editorial_summary END,
            opening_hours = CASE WHEN excluded.opening_hours != '' THEN excluded.opening_hours ELSE opening_hours END,
            photo_reference = CASE WHEN excluded.photo_reference != '' THEN excluded.photo_reference ELSE photo_reference END,
            neighborhood = CASE WHEN excluded.neighborhood != '' THEN excluded.neighborhood ELSE neighborhood END,
            latitude = COALESCE(excluded.latitude, latitude),
            longitude = COALESCE(excluded.longitude, longitude),
            google_place_id = CASE WHEN excluded.google_place_id != '' THEN excluded.google_place_id ELSE google_place_id END,
            google_maps_url = CASE WHEN excluded.google_maps_url != '' THEN excluded.google_maps_url ELSE google_maps_url END,
            last_updated = CURRENT_DATE
    """, [
        school["id"], school["name"], school["city"],
        school.get("address", ""), school.get("website_url", ""),
        school.get("phone"), school.get("email"),
        school.get("rating"), school.get("reviews"),
        school.get("editorial_summary", ""), school.get("opening_hours", ""),
        school.get("photo_reference", ""),
        school.get("neighborhood", ""),
        school.get("latitude"), school.get("longitude"),
        school.get("google_place_id", ""), school.get("google_maps_url", ""),
        school.get("source", "google-places"),
    ])


def compute_monthly_price(tiers: list[dict]) -> tuple[Optional[float], bool]:
    """Pick the best monthly-equivalent price from pricing tiers.

    Returns (price, is_estimated) tuple.
    Skips discounted tiers (Multisport, Medicover, student, per-class packs)
    and premium-only tiers (reformer, aerial).

    Priority:
    1. 'unlimited' tier with validity_days ~30, full price (not discounted)
    2. 'membership' tier with validity_days ~30, full price
    3. Any unlimited/membership tier — divide price by (validity_days/30)
    4. Estimate from pack/single tiers: cheapest per-class × 12 classes/month
    5. Fall back to (None, False)
    """
    PREMIUM_KEYWORDS = {"reformer", "aerial", "hamak", "hammock", "silk", "jedwab"}
    DISCOUNT_KEYWORDS = {
        "multisport", "medicover", "fitprofit", "gofit", "fit&more",
        "student", "studenc", "senior", "emeryt", "promo", "promoc",
        "porann",  # morning-only passes
    }

    def _is_premium_only(tier: dict) -> bool:
        class_types = tier.get("class_types") or []
        if not class_types:
            return False
        return all(
            any(kw in ct.lower() for kw in PREMIUM_KEYWORDS)
            for ct in class_types
        )

    def _is_discounted(tier: dict) -> bool:
        name_lower = (tier.get("name") or "").lower()
        notes_lower = (tier.get("notes") or "").lower()
        combined = f"{name_lower} {notes_lower}"
        return any(kw in combined for kw in DISCOUNT_KEYWORDS)

    def _is_per_class_membership(tier: dict) -> bool:
        """Skip memberships that are really per-class packs (e.g. '2-5 zajęć')."""
        name_lower = (tier.get("name") or "").lower()
        entries = tier.get("entries")
        if entries and entries < 20:
            return True
        # Pattern: "od X do Y zajęć" or "X zajęć"
        import re
        if re.search(r'\d+\s*(do\s*\d+\s*)?(zajęci|wejś|entries|classes)', name_lower):
            return True
        return False

    standard_monthly: list[float] = []
    normalizable: list[float] = []

    for tier in tiers:
        tier_type = (tier.get("tier_type") or "").lower()
        if tier_type not in ("unlimited", "membership"):
            continue
        if _is_premium_only(tier):
            continue
        if _is_discounted(tier):
            continue
        if _is_per_class_membership(tier):
            continue

        price = tier.get("price_pln")
        validity = tier.get("validity_days")
        if not price or price <= 0:
            continue

        if validity and 25 <= validity <= 35:
            standard_monthly.append(price)
        elif validity and validity > 35:
            normalized = round(price * 30 / validity, 2)
            normalizable.append(normalized)
        elif validity is None:
            name_lower = (tier.get("name") or "").lower()
            # Explicit monthly keywords
            if any(kw in name_lower for kw in ("miesi", "month", "30 dni")):
                standard_monthly.append(price)
            elif "open" in name_lower and tier_type == "unlimited":
                standard_monthly.append(price)
            elif not any(kw in name_lower for kw in ("rok", "year", "kwartal", "quarter", "półrocz", "6 mies", "12 mies")):
                # No validity, no long-term keywords → assume monthly
                standard_monthly.append(price)

    # Prefer direct monthly; pick the MOST EXPENSIVE standard monthly
    # (cheapest is often a limited/discounted tier that slipped through)
    if standard_monthly:
        # Among standard monthly tiers, the main "Karnet Open" is typically
        # the most expensive non-premium one. Use max.
        best = max(standard_monthly)
        return (best, False) if best <= 600 else (None, False)

    if normalizable:
        best = max(normalizable)
        return (best, False) if best <= 600 else (None, False)

    # Fallback: estimate from pack tiers (e.g. "8 wejść" → per-class × 12)
    # Assumes ~12 classes/month (3x/week) for a comparable monthly cost
    CLASSES_PER_MONTH = 12
    pack_per_class: list[float] = []

    for tier in tiers:
        tier_type = (tier.get("tier_type") or "").lower()
        if tier_type not in ("pack", "single"):
            continue
        if _is_premium_only(tier):
            continue
        if _is_discounted(tier):
            continue

        price = tier.get("price_pln")
        entries = tier.get("entries")
        if not price or price <= 0:
            continue

        if tier_type == "single" and (entries is None or entries == 1):
            pack_per_class.append(price)
        elif tier_type == "pack" and entries and entries >= 4:
            pack_per_class.append(price / entries)

    if pack_per_class:
        # Use the cheapest per-class rate (bulk discount = best deal)
        best_per_class = min(pack_per_class)
        estimated = round(best_per_class * CLASSES_PER_MONTH, 2)
        # Floor at 100 PLN — below that is likely bad data (single cheap class)
        if estimated < 100:
            return (None, False)
        return (estimated, True) if estimated <= 600 else (None, False)

    return (None, False)


def update_pricing(conn: libsql_client.ClientSync, school_id: str, pricing: dict) -> None:
    """Update pricing fields for a school.

    Stores both the headline numbers (for filtering) and the full
    structured pricing JSON (for display).
    """
    import json

    # Build the full JSON payload (tiers + metadata)
    pricing_json = None
    if pricing.get("tiers"):
        pricing_json = json.dumps({
            "tiers": pricing["tiers"],
            "trial_info": pricing.get("trial_info"),
            "discounts": pricing.get("discounts"),
            "pricing_notes": pricing.get("pricing_notes"),
        }, ensure_ascii=False)

    # Build concise notes from structured data
    notes = pricing.get("pricing_notes") or ""
    if pricing.get("discounts"):
        notes = f"{notes} | Zniżki: {pricing['discounts']}" if notes else f"Zniżki: {pricing['discounts']}"
    if pricing.get("trial_info"):
        notes = f"{notes} | {pricing['trial_info']}" if notes else pricing["trial_info"]

    # Compute normalized monthly price from tiers, with LLM fallback
    tiers = pricing.get("tiers") or []
    normalized_price, is_estimated = compute_monthly_price(tiers)
    if normalized_price is None:
        raw = pricing.get("monthly_pass_pln")
        if raw is not None and raw <= 600:
            normalized_price = raw
            is_estimated = False

    conn.execute("""
        UPDATE schools SET
            price = ?,
            price_estimated = ?,
            trial_price = ?,
            single_class_price = ?,
            pricing_notes = ?,
            pricing_json = ?,
            last_price_check = CURRENT_DATE,
            last_updated = CURRENT_DATE,
            source = CASE WHEN source = 'google-places' THEN 'crawl4ai' ELSE source END
        WHERE id = ?
    """, [
        normalized_price,
        1 if is_estimated else 0,
        pricing.get("trial_price_pln"),
        pricing.get("single_class_pln"),
        notes or pricing.get("pricing_notes"),
        pricing_json,
        school_id,
    ])


def update_about(conn: libsql_client.ClientSync, school_id: str, about: dict) -> None:
    """Update about/contact fields and styles for a school."""
    conn.execute("""
        UPDATE schools SET
            description_raw = CASE WHEN ? != '' THEN ? ELSE description_raw END,
            phone = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE phone END,
            email = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE email END,
            last_updated = CURRENT_DATE,
            source = CASE WHEN source = 'google-places' THEN 'crawl4ai' ELSE source END
        WHERE id = ?
    """, [
        about.get("description_raw", ""),
        about.get("description_raw", ""),
        about.get("phone"),
        about.get("phone"),
        about.get("phone"),
        about.get("email"),
        about.get("email"),
        about.get("email"),
        school_id,
    ])

    # Update styles (normalized to canonical whitelist)
    raw_styles = about.get("styles", [])
    if raw_styles:
        existing = set(get_school_styles(conn, school_id))
        for raw in raw_styles:
            # Defensive: LLM may return dicts instead of strings
            if isinstance(raw, dict):
                raw = raw.get("name", raw.get("style", ""))
            if not isinstance(raw, str) or not raw.strip():
                continue
            canonical = normalize_style(raw)
            if canonical is None:
                log.debug("Ignoring unrecognized style '%s' for %s", raw, school_id)
                continue
            if canonical in existing:
                continue
            rs = conn.execute("SELECT id FROM styles WHERE name = ?", [canonical])
            if rs.rows:
                style_id = rs.rows[0][0]
            else:
                conn.execute("INSERT INTO styles (name) VALUES (?)", [canonical])
                rs = conn.execute("SELECT id FROM styles WHERE name = ?", [canonical])
                style_id = rs.rows[0][0]
            conn.execute(
                "INSERT OR IGNORE INTO school_styles (school_id, style_id) VALUES (?, ?)",
                [school_id, style_id],
            )
            existing.add(canonical)


def update_description(conn: libsql_client.ClientSync, school_id: str, description: str) -> None:
    """Write normalized description to DB."""
    conn.execute(
        "UPDATE schools SET description = ? WHERE id = ?",
        [description, school_id],
    )


def replace_schedule(conn: libsql_client.ClientSync, school_id: str, entries: list[dict]) -> None:
    """Replace all schedule entries for a school."""
    if not entries:
        return
    conn.execute("DELETE FROM schedule_entries WHERE school_id = ?", [school_id])
    for e in entries:
        conn.execute("""
            INSERT INTO schedule_entries (
                school_id, schedule_type, day_of_week, date, start_time, end_time, duration,
                class_name, class_description, teacher, level, style, location,
                total_capacity, spots_left, waiting_list_capacity,
                is_cancelled, is_free, is_bookable_online,
                source, external_id, booking_url, metadata,
                last_seen_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, [
            school_id,
            e.get("schedule_type", "weekly"),
            e.get("day_of_week", 0),
            e.get("date"),
            e.get("start_time", ""),
            e.get("end_time"),
            e.get("duration"),
            e.get("class_name", ""),
            e.get("class_description"),
            e.get("teacher"),
            e.get("level"),
            e.get("style"),
            e.get("location"),
            e.get("total_capacity"),
            e.get("spots_left"),
            e.get("waiting_list_capacity"),
            e.get("is_cancelled", False),
            e.get("is_free", False),
            e.get("is_bookable_online", True),
            e.get("source", "manual"),
            e.get("external_id"),
            e.get("booking_url"),
            e.get("metadata"),
        ])


def sync_seed_urls(conn: libsql_client.ClientSync, school_id: str, urls: dict) -> list[str]:
    """
    Sync pricing_url and schedule_url from seeds.yaml into the DB.
    Only updates if the DB value is currently empty.

    Args:
        urls: dict with optional 'pricing_url' and 'schedule_url' keys

    Returns:
        List of field names that were updated.
    """
    updated = []
    for field in ("pricing_url", "schedule_url"):
        value = urls.get(field)
        if not value:
            continue
        conn.execute(
            f"UPDATE schools SET {field} = ? WHERE id = ? AND ({field} IS NULL OR {field} = '')",
            [value, school_id],
        )
        updated.append(field)
    return updated
