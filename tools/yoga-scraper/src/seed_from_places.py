"""
Google Places API (New) Seeder — discovers yoga schools and writes them to the DB.

Usage (via CLI):
    yoga-scraper seed                           # discover in all default cities
    yoga-scraper seed --cities Warszawa Kraków
    yoga-scraper seed --dry-run
"""

import os
import re
import asyncio
import logging
from typing import Optional

import httpx
import yaml

from .db import get_connection, validate_schema, upsert_school
from .tracking import ensure_scrape_log_table, track_scrape, TASK_SEED

log = logging.getLogger("yoga-scraper.seed")

SEEDS_PATH = os.getenv("SEEDS_PATH", "seeds.yaml")

API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.googleMapsUri",
    "places.types",
    "places.editorialSummary",
    "places.regularOpeningHours",
    "places.photos",
    "places.addressComponents",
    "nextPageToken",
])

DEFAULT_CITIES = [
    "Warszawa", "Kraków", "Wrocław", "Poznań", "Gdańsk",
    "Łódź", "Katowice", "Lublin", "Szczecin", "Bydgoszcz",
    "Białystok", "Gdynia", "Częstochowa", "Rzeszów", "Toruń",
    "Sopot", "Opole", "Kielce", "Gliwice", "Olsztyn",
]

SEARCH_QUERIES = [
    "szkoła jogi {city}",
    "studio jogi {city}",
    "yoga studio {city}",
]


# ── Google Places API ────────────────────────────────────────────────────────


async def text_search(client: httpx.AsyncClient, query: str, page_token: Optional[str] = None) -> dict:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body: dict = {"textQuery": query, "languageCode": "pl", "regionCode": "PL", "pageSize": 20}
    if page_token:
        body["pageToken"] = page_token

    resp = await client.post(PLACES_TEXT_SEARCH_URL, headers=headers, json=body)
    if resp.status_code != 200:
        log.error("API error %d for '%s': %s", resp.status_code, query, resp.text[:500])
        return {}
    return resp.json()


async def search_city(client: httpx.AsyncClient, city: str) -> list[dict]:
    seen_ids: set[str] = set()
    results: list[dict] = []

    for query_template in SEARCH_QUERIES:
        query = query_template.format(city=city)
        log.info("  Searching: '%s'", query)

        page_token = None
        pages = 0
        while pages < 3:
            data = await text_search(client, query, page_token)
            places = data.get("places", [])
            if not places:
                break
            for place in places:
                pid = place.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    results.append(place)
            page_token = data.get("nextPageToken")
            if not page_token:
                break
            pages += 1
            await asyncio.sleep(0.5)
        await asyncio.sleep(0.3)

    return results


# ── Helpers ──────────────────────────────────────────────────────────────────


def slugify(name: str) -> str:
    slug = name.lower().strip()
    tr = {"ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z"}
    for k, v in tr.items():
        slug = slug.replace(k, v)
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug


def extract_city(address: str, search_city: str) -> str:
    parts = [p.strip() for p in address.split(",")]
    if len(parts) >= 2:
        candidate = parts[-2] if parts[-1].strip().lower() in ("polska", "poland") else parts[-1]
        candidate = re.sub(r"^\d{2}-\d{3}\s*", "", candidate).strip()
        if candidate:
            return candidate
    return search_city


def is_yoga_related(place: dict) -> bool:
    types = set(place.get("types", []))
    name = (place.get("displayName", {}).get("text", "") or "").lower()
    exclude_types = {"hospital", "doctor", "pharmacy", "restaurant", "bar", "cafe",
                     "clothing_store", "shopping_mall", "supermarket", "hotel",
                     "lodging", "park", "church", "museum"}
    if types & exclude_types:
        return False
    yoga_keywords = {"joga", "yoga", "jogi", "jogini", "studio jogi", "szkoła jogi",
                     "ashtanga", "vinyasa", "hatha", "iyengar", "kundalini", "pilates"}
    if any(kw in name for kw in yoga_keywords):
        return True
    fitness_types = {"gym", "health", "fitness_center", "yoga_studio", "spa"}
    if types & fitness_types:
        return True
    return True


def _extract_neighborhood(place: dict) -> str:
    for comp in place.get("addressComponents", []):
        types = comp.get("types", [])
        if "sublocality" in types or "neighborhood" in types:
            return comp.get("longText", "")
    return ""


def _extract_opening_hours(place: dict) -> str:
    descriptions = place.get("regularOpeningHours", {}).get("weekdayDescriptions", [])
    return " | ".join(descriptions) if descriptions else ""


def _extract_photo_reference(place: dict) -> str:
    photos = place.get("photos", [])
    return photos[0].get("name", "") if photos else ""


def place_to_db_school(place: dict, city: str) -> dict:
    """Convert a Google Places result to the dict format expected by db.upsert_school."""
    name = place.get("displayName", {}).get("text", "Unknown")
    address = place.get("formattedAddress", "")
    short_address = place.get("shortFormattedAddress", address)
    location = place.get("location", {})

    return {
        "id": slugify(name),
        "name": name,
        "city": extract_city(address, city),
        "address": short_address or address,
        "website_url": place.get("websiteUri", ""),
        "phone": place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber"),
        "email": None,
        "rating": place.get("rating"),
        "reviews": place.get("userRatingCount"),
        "editorial_summary": place.get("editorialSummary", {}).get("text", ""),
        "opening_hours": _extract_opening_hours(place),
        "photo_reference": _extract_photo_reference(place),
        "neighborhood": _extract_neighborhood(place),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "google_place_id": place.get("id", ""),
        "google_maps_url": place.get("googleMapsUri", ""),
        "source": "google-places",
    }


def place_to_seed(place: dict, city: str) -> dict:
    """Convert a Google Places result to a seeds.yaml entry."""
    name = place.get("displayName", {}).get("text", "Unknown")
    address = place.get("formattedAddress", "")
    return {
        "id": slugify(name),
        "name": name,
        "city": extract_city(address, city),
        "address": address,
        "website": place.get("websiteUri", "") or "",
        "pricing_url": "",
        "schedule_url": "",
        "google_place_id": place.get("id", ""),
    }


# ── Seeds file I/O ───────────────────────────────────────────────────────────


def load_seeds() -> dict:
    from pathlib import Path
    p = Path(SEEDS_PATH)
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"schools": []}
    return {"schools": []}


def merge_seeds(existing: dict, new_seeds: list[dict]) -> dict:
    by_id = {s["id"]: s for s in existing.get("schools", [])}
    added = 0
    for seed in new_seeds:
        sid = seed["id"]
        if sid not in by_id:
            by_id[sid] = seed
            added += 1
        else:
            if not by_id[sid].get("google_place_id") and seed.get("google_place_id"):
                by_id[sid]["google_place_id"] = seed["google_place_id"]
    log.info("Seeds: %d existing + %d new = %d total", len(existing.get("schools", [])), added, len(by_id))
    schools = sorted(by_id.values(), key=lambda s: (s.get("city", ""), s.get("name", "")))
    return {"schools": schools}


def write_seeds(seeds_data: dict) -> None:
    from pathlib import Path
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with open(Path(SEEDS_PATH), "w", encoding="utf-8") as f:
        f.write(f"# Seed list of yoga schools.\n")
        f.write(f"# Updated by yoga-scraper seed on {today}\n")
        f.write(f"# Source: Google Places API (New)\n\n")
        yaml.dump(seeds_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)


# ── Main ─────────────────────────────────────────────────────────────────────


async def run_seed(cities: Optional[list[str]] = None, dry_run: bool = False, min_rating: float = 0, min_reviews: int = 0):
    if not API_KEY:
        log.error("GOOGLE_PLACES_API_KEY not set — aborting")
        return

    cities = cities or DEFAULT_CITIES
    log.info("Searching %d cities for yoga schools...", len(cities))

    all_places: list[tuple[dict, str]] = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for city in cities:
            log.info("━━━ %s ━━━", city)
            places = await search_city(client, city)
            log.info("  Found %d unique places in %s", len(places), city)
            for p in places:
                all_places.append((p, city))
            await asyncio.sleep(1.0)

    # Deduplicate & filter
    global_seen: dict[str, tuple[dict, str]] = {}
    for place, city in all_places:
        pid = place.get("id", "")
        if pid and pid not in global_seen and is_yoga_related(place):
            global_seen[pid] = (place, city)

    filtered = list(global_seen.values())
    log.info("Total unique yoga-related places: %d", len(filtered))

    if min_rating > 0 or min_reviews > 0:
        before = len(filtered)
        filtered = [
            (p, c) for p, c in filtered
            if (p.get("rating") or 0) >= min_rating
            and (p.get("userRatingCount") or 0) >= min_reviews
        ]
        log.info("After filters: %d (removed %d)", len(filtered), before - len(filtered))

    if dry_run:
        log.info("DRY RUN — %d schools discovered, not writing.", len(filtered))
        for place, city in filtered[:10]:
            name = place.get("displayName", {}).get("text", "?")
            log.info("  %s (%s)", name, extract_city(place.get("formattedAddress", ""), city))
        return

    # Connect to DB and write
    conn = get_connection()
    validate_schema(conn)
    ensure_scrape_log_table(conn)

    new_seeds = [place_to_seed(p, c) for p, c in filtered]
    db_schools = [place_to_db_school(p, c) for p, c in filtered]

    # Write to DB
    written = 0
    for school in db_schools:
        with track_scrape(conn, school["id"], TASK_SEED) as tracker:
            try:
                upsert_school(conn, school)
                tracker.set_success(f"city={school['city']}")
                written += 1
            except Exception as e:
                tracker.set_error(str(e))
                log.error("Failed to upsert %s: %s", school["id"], e)

    log.info("Wrote %d schools to database", written)

    # Update seeds.yaml
    existing_seeds = load_seeds()
    merged_seeds = merge_seeds(existing_seeds, new_seeds)
    write_seeds(merged_seeds)
    log.info("Updated seeds.yaml with %d entries", len(merged_seeds["schools"]))
