"""
Overnight batch scraper — runs all cities sequentially with logging.

Processes each city in a separate subprocess for memory safety (crawl4ai
can leak memory over hundreds of pages). Logs all output to a timestamped
file. Continues to next city even if one crashes.

Usage:
    python _overnight.py              # full run (all cities)
    python _overnight.py --dry-run    # preview what would run
    python _overnight.py --resume     # skip cities that already have >50% about coverage
"""

import subprocess
import sys
import os
import io
import time
import argparse
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Change to script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PYTHON = os.path.join(".venv", "Scripts", "python.exe")

# ── Get city list from DB ────────────────────────────────────────────────────

def get_city_stats():
    """Query DB for per-city enrichment stats, ordered by priority."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from src.db import get_connection

    conn = get_connection()
    rows = conn.execute("""
        SELECT 
            s.city,
            COUNT(*) as total,
            SUM(CASE WHEN s.pricing_json IS NOT NULL AND s.pricing_json != '' THEN 1 ELSE 0 END) as has_p,
            SUM(CASE WHEN s.description_raw IS NOT NULL AND s.description_raw != '' THEN 1 ELSE 0 END) as has_d,
            SUM(CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 1 ELSE 0 END) as has_e
        FROM schools s
        WHERE s.website_url IS NOT NULL AND s.website_url != ''
        GROUP BY s.city
        ORDER BY COUNT(*) DESC
    """).rows
    conn.close()

    stats = []
    for row in rows:
        city, total, has_p, has_d, has_e = row[0], row[1], row[2], row[3], row[4]
        if city:
            stats.append({
                "city": city,
                "total": total,
                "has_pricing": has_p,
                "has_about": has_d,
                "has_email": has_e,
                "needs_work": total - has_d,  # about is the most missing field
            })
    return stats


def get_needing_enrichment_count(city: str) -> int:
    """Check how many schools in a city still need enrichment."""
    from src.db import get_connection
    conn = get_connection()
    rs = conn.execute("""
        SELECT COUNT(*) FROM schools
        WHERE (last_price_check IS NULL
               OR (description_raw IS NULL OR description_raw = ''))
          AND LOWER(city) = LOWER(?)
          AND website_url IS NOT NULL AND website_url != ''
    """, [city])
    count = rs.rows[0][0]
    conn.close()
    return count


# ── Run scraper for one city ─────────────────────────────────────────────────

def scrape_city(city: str, log_file, dry_run: bool = False):
    """Run scraper for a single city in a subprocess. Returns (ok, duration_sec)."""
    
    # Check remaining work
    remaining = get_needing_enrichment_count(city)
    if remaining == 0:
        msg = f"  ⏭ {city}: nothing to scrape (fully enriched)"
        print(msg)
        log_file.write(msg + "\n")
        log_file.flush()
        return True, 0

    msg = f"\n{'='*60}\n  🏙 Starting: {city} ({remaining} schools to enrich)\n{'='*60}"
    print(msg)
    log_file.write(msg + "\n")
    log_file.flush()

    start = time.time()

    cmd = [PYTHON, "-u", "-m", "src.scrape", "--city", city]
    if dry_run:
        cmd.append("--dry-run")

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            encoding="utf-8",
            errors="replace",
        )

        # Stream output line by line
        for line in proc.stdout:
            line = line.rstrip("\n")
            print(f"  [{city}] {line}")
            log_file.write(f"[{city}] {line}\n")
            log_file.flush()

        proc.wait()
        duration = time.time() - start

        if proc.returncode == 0:
            msg = f"  ✅ {city}: completed in {duration/60:.1f} min"
        else:
            msg = f"  ⚠️ {city}: exited with code {proc.returncode} after {duration/60:.1f} min"

        print(msg)
        log_file.write(msg + "\n")
        log_file.flush()
        return proc.returncode == 0, duration

    except Exception as e:
        duration = time.time() - start
        msg = f"  ❌ {city}: CRASHED after {duration/60:.1f} min — {e}"
        print(msg)
        log_file.write(msg + "\n")
        log_file.flush()
        return False, duration


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Overnight batch scraper")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB")
    parser.add_argument("--resume", action="store_true",
                        help="Skip cities where >50%% of schools have about data")
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = os.path.join("output", f"overnight_{timestamp}.txt")
    os.makedirs("output", exist_ok=True)

    print(f"\n  Overnight Batch Scraper")
    print(f"  Log: {log_path}")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    stats = get_city_stats()

    # Priority order:
    # 1. Big cities with zero or low about coverage (most bang for buck)
    # 2. Cities with pricing-only (need about/email)
    # 3. Small cities
    # Sort: cities needing more work first, then by total size
    cities_to_process = sorted(stats, key=lambda s: (-s["needs_work"], -s["total"]))

    if args.resume:
        cities_to_process = [
            c for c in cities_to_process
            if c["total"] == 0 or (c["has_about"] / c["total"]) < 0.5
        ]

    # Show plan
    print(f"\n  Cities to process: {len(cities_to_process)}")
    print(f"  {'City':<20s} {'Total':>5} {'NeedAbout':>9} {'Price':>5} {'About':>5}")
    print(f"  {'─'*20} {'─'*5} {'─'*9} {'─'*5} {'─'*5}")

    total_schools = 0
    for c in cities_to_process:
        remaining = c["needs_work"]
        total_schools += remaining
        print(f"  {c['city']:<20s} {c['total']:>5} {remaining:>9} {c['has_pricing']:>5} {c['has_about']:>5}")

    est_hours = (total_schools * 45) / 3600  # ~45 sec per school
    print(f"\n  Total schools needing about: ~{total_schools}")
    print(f"  Estimated time: ~{est_hours:.1f} hours")
    print(f"  {'(DRY RUN)' if args.dry_run else ''}")

    with open(log_path, "w", encoding="utf-8") as log_file:
        log_file.write(f"Overnight Batch Scraper\n")
        log_file.write(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        log_file.write(f"Cities: {len(cities_to_process)}\n")
        log_file.write(f"Est. schools: ~{total_schools}\n\n")

        results = []
        total_start = time.time()

        for i, city_stat in enumerate(cities_to_process, 1):
            city = city_stat["city"]
            progress = f"[{i}/{len(cities_to_process)}]"
            msg = f"\n{progress} Processing {city}..."
            print(msg)
            log_file.write(msg + "\n")

            ok, duration = scrape_city(city, log_file, dry_run=args.dry_run)
            results.append((city, ok, duration))

        # ── Summary ──
        total_duration = time.time() - total_start
        summary = [
            f"\n{'='*60}",
            f"  OVERNIGHT BATCH COMPLETE",
            f"  Total time: {total_duration/3600:.1f} hours ({total_duration/60:.0f} min)",
            f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"{'='*60}",
            f"  {'City':<20s} {'Status':<12s} {'Duration':>12s}",
            f"  {'─'*20} {'─'*12} {'─'*12}",
        ]
        for city, ok, dur in results:
            status = "✅ OK" if ok else "❌ FAIL"
            dur_str = f"{dur/60:.1f} min" if dur > 0 else "skipped"
            summary.append(f"  {city:<20s} {status:<12s} {dur_str:>12s}")

        succeeded = sum(1 for _, ok, _ in results if ok)
        failed = sum(1 for _, ok, dur in results if not ok and dur > 0)
        skipped = sum(1 for _, ok, dur in results if ok and dur == 0)
        summary.append(f"\n  {succeeded} succeeded, {failed} failed, {skipped} skipped")

        for line in summary:
            print(line)
            log_file.write(line + "\n")

    print(f"\n  Full log saved to: {log_path}")

    # Run dashboard at end
    print(f"\n  Running final dashboard...\n")
    subprocess.run([PYTHON, "_dashboard.py"], env={**os.environ, "PYTHONIOENCODING": "utf-8"})


if __name__ == "__main__":
    main()
