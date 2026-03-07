"""
Unified CLI for yoga-scraper.

Usage:
    yoga-scraper seed [--cities ...] [--dry-run]
    yoga-scraper scrape [--school ID] [--city NAME] [--prices-only] [--force] [--dry-run] [--limit N]
    yoga-scraper scrape-schedules [--school ID] [--retry-empty] [--screenshot] [--engine ENGINE]
    yoga-scraper normalize [--school ID] [--city NAME] [--force] [--dry-run]
    yoga-scraper status [--missing prices|schedules|about]
    yoga-scraper log [--school ID] [--task TASK] [--limit N]
    yoga-scraper consolidate-styles [--dry-run]
"""

import argparse
import asyncio
import io
import logging
import sys

# Fix Windows console encoding for Polish chars and special symbols
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

log = logging.getLogger("yoga-scraper")


def cmd_seed(args):
    from .seed_from_places import run_seed
    asyncio.run(run_seed(
        cities=args.cities or None,
        dry_run=args.dry_run,
    ))


def cmd_scrape(args):
    from .scrape import run_scrape
    asyncio.run(run_scrape(
        school_id=args.school,
        city=args.city,
        prices_only=args.prices_only,
        force=args.force,
        dry_run=args.dry_run,
        limit=args.limit,
    ))


def cmd_scrape_schedules(args):
    from .scrape_fitssey import run_scrape_schedules
    asyncio.run(run_scrape_schedules(
        school_id=args.school,
        retry_empty=args.retry_empty,
        screenshot=args.screenshot,
        engine=args.engine,
    ))


def cmd_normalize(args):
    from .normalize import run_normalize
    asyncio.run(run_normalize(
        school_id=args.school,
        city=args.city,
        force=args.force,
        dry_run=args.dry_run,
        limit=args.limit,
    ))


def cmd_status(args):
    from .db import get_connection
    conn = get_connection()

    total = conn.execute("SELECT COUNT(*) FROM schools").rows[0][0]
    with_web = conn.execute(
        "SELECT COUNT(*) FROM schools WHERE website_url IS NOT NULL AND website_url != ''"
    ).rows[0][0]

    print(f"\n  Schools: {total} total, {with_web} with website\n")

    queries = [
        ("pricing_json", "SELECT COUNT(*) FROM schools WHERE pricing_json IS NOT NULL AND pricing_json != ''"),
        ("description_raw", "SELECT COUNT(*) FROM schools WHERE description_raw IS NOT NULL AND description_raw != ''"),
        ("description", "SELECT COUNT(*) FROM schools WHERE description IS NOT NULL AND description != ''"),
        ("email", "SELECT COUNT(*) FROM schools WHERE email IS NOT NULL AND email != ''"),
        ("phone", "SELECT COUNT(*) FROM schools WHERE phone IS NOT NULL AND phone != ''"),
        ("styles", "SELECT COUNT(DISTINCT school_id) FROM school_styles"),
        ("schedule", "SELECT COUNT(DISTINCT school_id) FROM schedule_entries"),
    ]

    for label, sql in queries:
        count = conn.execute(sql).rows[0][0]
        pct = f"{100 * count / with_web:.0f}%" if with_web else "0%"
        bar = "#" * int(30 * count / with_web) if with_web else ""
        print(f"  {label:<20s} {count:>4} ({pct:>4s}) {bar}")

    # Missing breakdown
    if args.missing:
        field_map = {
            "prices": "pricing_json IS NULL OR pricing_json = ''",
            "pricing": "pricing_json IS NULL OR pricing_json = ''",
            "about": "description_raw IS NULL OR description_raw = ''",
            "schedules": "id NOT IN (SELECT DISTINCT school_id FROM schedule_entries)",
        }
        cond = field_map.get(args.missing)
        if cond:
            rs = conn.execute(f"""
                SELECT id, name, city FROM schools
                WHERE website_url != '' AND ({cond})
                ORDER BY city, name LIMIT 30
            """)
            print(f"\n  Missing {args.missing} ({len(rs.rows)} shown):")
            for row in rs.rows:
                print(f"    {row[0]:<40s} {row[1]} ({row[2]})")

    conn.close()


def cmd_log(args):
    from .db import get_connection
    conn = get_connection()

    query = "SELECT school_id, task, status, message, duration_ms, created_at FROM scrape_log WHERE 1=1"
    params = []
    if args.school:
        query += " AND school_id = ?"
        params.append(args.school)
    if args.task:
        query += " AND task = ?"
        params.append(args.task)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(args.limit)

    rs = conn.execute(query, params)
    print(f"\n  {'School':<35s} {'Task':<20s} {'Status':<10s} {'Duration':>8s}  Message")
    print(f"  {'─'*35} {'─'*20} {'─'*10} {'─'*8}  {'─'*30}")
    for row in rs.rows:
        school_id, task, status, message, duration_ms, created_at = row
        dur = f"{duration_ms}ms" if duration_ms else "-"
        msg = (message or "")[:40]
        print(f"  {school_id:<35s} {task:<20s} {status:<10s} {dur:>8s}  {msg}")

    conn.close()


def cmd_recompute_prices(args):
    """Re-compute normalized monthly prices from existing pricing_json."""
    import json
    from .db import get_connection, compute_monthly_price
    conn = get_connection()

    rs = conn.execute("""
        SELECT id, name, price, pricing_json FROM schools
        WHERE pricing_json IS NOT NULL AND pricing_json != ''
    """)
    rows = [(r[0], r[1], r[2], r[3]) for r in rs.rows]

    print(f"\n  Schools with pricing_json: {len(rows)}")

    changed = 0
    for sid, name, old_price, pj in rows:
        tiers = json.loads(pj).get("tiers", []) if pj else []
        new_price, is_estimated = compute_monthly_price(tiers)

        if new_price != old_price:
            est_tag = " ~est" if is_estimated else ""
            old_str = f"{old_price}" if old_price is not None else "null"
            new_str = f"{new_price}" if new_price is not None else "null"
            print(f"  {sid:<45s} {old_str:>8s} -> {new_str:>8s}{est_tag}  {name[:35]}")
            changed += 1

            if not args.dry_run:
                conn.execute(
                    "UPDATE schools SET price = ?, price_estimated = ? WHERE id = ?",
                    [new_price, 1 if is_estimated else 0, sid],
                )

    print(f"\n  Changed: {changed} / {len(rows)}")
    if args.dry_run:
        print("  DRY RUN — no changes made.")

    conn.close()


def cmd_build_images(args):
    """Build image URLs from Google Places photo_reference."""
    import os
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        print("  ERROR: GOOGLE_MAPS_API_KEY not set in .env")
        return

    from .db import get_connection
    conn = get_connection()

    rs = conn.execute("""
        SELECT id, name, photo_reference FROM schools
        WHERE photo_reference IS NOT NULL AND photo_reference != ''
          AND (image_url IS NULL OR image_url = '')
    """)
    rows = [(r[0], r[1], r[2]) for r in rs.rows]
    print(f"\n  Schools with photo_reference but no image_url: {len(rows)}")

    if not rows:
        print("  Nothing to do.")
        conn.close()
        return

    # Google Places Photos API (New) URL format
    # photo_reference from Places API (New) is like "places/PLACE_ID/photos/PHOTO_REF"
    # URL: https://places.googleapis.com/v1/{photo_reference}/media?maxWidthPx=800&key=API_KEY
    updated = 0
    for sid, name, ref in rows:
        if ref.startswith("places/"):
            # New API format
            image_url = f"https://places.googleapis.com/v1/{ref}/media?maxWidthPx=800&key={api_key}"
        else:
            # Legacy API format
            image_url = (
                f"https://maps.googleapis.com/maps/api/place/photo"
                f"?maxwidth=800&photo_reference={ref}&key={api_key}"
            )

        if not args.dry_run:
            conn.execute("UPDATE schools SET image_url = ? WHERE id = ?", [image_url, sid])
        updated += 1

    print(f"  Updated: {updated}")
    if args.dry_run:
        print("  DRY RUN — no changes made.")
    else:
        print("  Done — image URLs built from photo_reference.")

    conn.close()


def cmd_consolidate_styles(args):
    """Consolidate existing styles in the DB to canonical names."""
    from .db import get_connection, normalize_style, CANONICAL_STYLES
    conn = get_connection()

    # Get all current styles
    rs = conn.execute("SELECT id, name FROM styles ORDER BY name")
    all_styles = [(row[0], row[1]) for row in rs.rows]

    print(f"\n  Current styles in DB: {len(all_styles)}")
    print(f"  Canonical styles: {len(CANONICAL_STYLES)}")

    # Build mapping: old_id -> canonical_name
    remap: dict[int, str] = {}  # old_id -> canonical name
    keep: dict[str, int] = {}   # canonical name -> id to keep
    drop_ids: list[int] = []     # style ids to remove

    for sid, name in all_styles:
        canonical = normalize_style(name)
        if canonical is None:
            print(f"  DROP: '{name}' (id={sid}) — not recognized")
            drop_ids.append(sid)
            continue
        if canonical == name and canonical not in keep:
            keep[canonical] = sid
        remap[sid] = canonical

    # Ensure canonical styles exist
    for style in CANONICAL_STYLES:
        if style not in keep:
            # Find an existing row with this canonical name
            rs = conn.execute("SELECT id FROM styles WHERE name = ?", [style])
            if rs.rows:
                keep[style] = rs.rows[0][0]

    # For styles that map to a canonical but aren't the kept id, remap their school_styles
    remaps_needed = []
    for sid, name in all_styles:
        canonical = remap.get(sid)
        if canonical is None:
            continue
        if sid == keep.get(canonical):
            continue  # This is the keeper
        # Need to remap school_styles from sid -> keep[canonical]
        target_id = keep.get(canonical)
        if target_id is None:
            # Create the canonical style
            if not args.dry_run:
                conn.execute("INSERT OR IGNORE INTO styles (name) VALUES (?)", [canonical])
                rs = conn.execute("SELECT id FROM styles WHERE name = ?", [canonical])
                target_id = rs.rows[0][0]
                keep[canonical] = target_id
            else:
                print(f"  CREATE: '{canonical}'")
                continue
        remaps_needed.append((sid, name, target_id, canonical))

    print(f"\n  Remaps needed: {len(remaps_needed)}")
    print(f"  Unrecognized to drop: {len(drop_ids)}")

    for sid, old_name, target_id, canonical in remaps_needed:
        print(f"  REMAP: '{old_name}' (id={sid}) -> '{canonical}' (id={target_id})")

    if args.dry_run:
        print("\n  DRY RUN — no changes made.")
        conn.close()
        return

    # Execute remaps
    for sid, old_name, target_id, canonical in remaps_needed:
        # Move school_styles to canonical id (ignore duplicates)
        conn.execute("""
            UPDATE OR IGNORE school_styles SET style_id = ? WHERE style_id = ?
        """, [target_id, sid])
        # Delete any school_styles that couldn't be moved (duplicates)
        conn.execute("DELETE FROM school_styles WHERE style_id = ?", [sid])
        # Delete the old style
        conn.execute("DELETE FROM styles WHERE id = ?", [sid])

    # Drop unrecognized styles
    for sid in drop_ids:
        conn.execute("DELETE FROM school_styles WHERE style_id = ?", [sid])
        conn.execute("DELETE FROM styles WHERE id = ?", [sid])

    # Verify
    rs = conn.execute("SELECT COUNT(*) FROM styles")
    print(f"\n  Styles after consolidation: {rs.rows[0][0]}")
    rs = conn.execute("SELECT name FROM styles ORDER BY name")
    for row in rs.rows:
        print(f"    {row[0]}")

    conn.close()
    print("\n  Done.")


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        prog="yoga-scraper",
        description="Data pipeline for szkolyjogi.pl",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # seed
    p = sub.add_parser("seed", help="Discover schools via Google Places API")
    p.add_argument("--cities", nargs="+", help="Cities to search")
    p.add_argument("--dry-run", action="store_true")

    # scrape
    p = sub.add_parser("scrape", help="Scrape websites for pricing, about, schedule")
    p.add_argument("--school", type=str, help="Single school ID")
    p.add_argument("--city", type=str, help="Filter by city")
    p.add_argument("--prices-only", action="store_true")
    p.add_argument("--force", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=0)

    # scrape-schedules
    p = sub.add_parser("scrape-schedules", help="Scrape Fitssey schedules")
    p.add_argument("--school", type=str)
    p.add_argument("--retry-empty", action="store_true")
    p.add_argument("--screenshot", action="store_true")
    p.add_argument("--engine", default="playwright", choices=["playwright", "crawl4ai"])

    # normalize
    p = sub.add_parser("normalize", help="Generate editorial descriptions from raw text")
    p.add_argument("--school", type=str)
    p.add_argument("--city", type=str)
    p.add_argument("--force", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=0)

    # status
    p = sub.add_parser("status", help="Show data coverage dashboard")
    p.add_argument("--missing", type=str, choices=["prices", "pricing", "about", "schedules"])

    # log
    p = sub.add_parser("log", help="View scrape history")
    p.add_argument("--school", type=str)
    p.add_argument("--task", type=str)
    p.add_argument("--limit", type=int, default=20)

    # recompute-prices
    p = sub.add_parser("recompute-prices", help="Re-normalize monthly prices from existing pricing_json")
    p.add_argument("--dry-run", action="store_true")

    # build-images
    p = sub.add_parser("build-images", help="Build image URLs from Google Places photo_reference")
    p.add_argument("--dry-run", action="store_true")

    # consolidate-styles
    p = sub.add_parser("consolidate-styles", help=" duplicate styles to canonical names")
    p.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    commands = {
        "seed": cmd_seed,
        "scrape": cmd_scrape,
        "scrape-schedules": cmd_scrape_schedules,
        "normalize": cmd_normalize,
        "status": cmd_status,
        "log": cmd_log,
        "recompute-prices": cmd_recompute_prices,
        "build-images": cmd_build_images,
        "consolidate-styles": cmd_consolidate_styles,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
