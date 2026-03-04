"""Dashboard — see what data we have & what's missing, to plan enrichment runs."""
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from src.db import get_connection

conn = get_connection()

def q(sql, params=None):
    r = conn.execute(sql, params or [])
    return r.rows

def q1(sql, params=None):
    return q(sql, params)[0][0]

print("=" * 70)
print("  YOGA SCRAPER — DATA DASHBOARD")
print("=" * 70)

total = q1("SELECT COUNT(*) FROM schools")
with_web = q1("SELECT COUNT(*) FROM schools WHERE website_url IS NOT NULL AND website_url != ''")
print(f"\n  Schools: {total} total, {with_web} with website")

# ── Enrichment coverage ──
has_pricing = q1("SELECT COUNT(*) FROM schools WHERE pricing_json IS NOT NULL AND pricing_json != ''")
has_desc = q1("SELECT COUNT(*) FROM schools WHERE description_raw IS NOT NULL AND description_raw != ''")
has_email = q1("SELECT COUNT(*) FROM schools WHERE email IS NOT NULL AND email != ''")
has_phone = q1("SELECT COUNT(*) FROM schools WHERE phone IS NOT NULL AND phone != ''")
has_styles = q1("SELECT COUNT(DISTINCT school_id) FROM school_styles")
has_sched = q1("SELECT COUNT(DISTINCT school_id) FROM schedule_entries")
sched_total = q1("SELECT COUNT(*) FROM schedule_entries")

print(f"\n  ┌─────────────────────────────────────────┐")
print(f"  │  ENRICHMENT COVERAGE (of {with_web} w/ website)  │")
print(f"  ├─────────────────────────────────────────┤")
print(f"  │  pricing_json   {has_pricing:>4} ({100*has_pricing/with_web:.0f}%){'█' * int(30*has_pricing/with_web)}  │")
print(f"  │  description    {has_desc:>4} ({100*has_desc/with_web:.0f}%){'█' * int(30*has_desc/with_web)}  │")
print(f"  │  email          {has_email:>4} ({100*has_email/with_web:.0f}%){'█' * int(30*has_email/with_web)}  │")
print(f"  │  phone          {has_phone:>4} ({100*has_phone/with_web:.0f}%){'█' * int(30*has_phone/with_web)}  │")
print(f"  │  styles         {has_styles:>4} ({100*has_styles/with_web:.0f}%){'█' * int(30*has_styles/with_web)}  │")
print(f"  │  schedule       {has_sched:>4} ({100*has_sched/with_web:.0f}%){'█' * int(30*has_sched/with_web)}  │")
print(f"  │  schedule rows  {sched_total:>4}                        │")
print(f"  └─────────────────────────────────────────┘")

# ── What's missing ──
need_pricing = q1("SELECT COUNT(*) FROM schools WHERE website_url != '' AND (pricing_json IS NULL OR pricing_json = '')")
need_about = q1("SELECT COUNT(*) FROM schools WHERE website_url != '' AND (description_raw IS NULL OR description_raw = '')")
need_email = q1("SELECT COUNT(*) FROM schools WHERE website_url != '' AND (email IS NULL OR email = '')")

easy_pricing = q1("""SELECT COUNT(*) FROM schools 
    WHERE pricing_url IS NOT NULL AND pricing_url != '' 
    AND (pricing_json IS NULL OR pricing_json = '')""")

has_sched_url = q1("SELECT COUNT(*) FROM schools WHERE schedule_url IS NOT NULL AND schedule_url != ''")
fitssey_count = q1("SELECT COUNT(*) FROM schools WHERE schedule_url LIKE '%fitssey.com%'")
non_fitssey = q1("SELECT COUNT(*) FROM schools WHERE schedule_url IS NOT NULL AND schedule_url != '' AND schedule_url NOT LIKE '%fitssey.com%'")
need_sched = q1("""SELECT COUNT(*) FROM schools s 
    WHERE s.schedule_url IS NOT NULL AND s.schedule_url != ''
    AND s.id NOT IN (SELECT DISTINCT se.school_id FROM schedule_entries se)""")

print(f"\n  ┌─────────────────────────────────────────┐")
print(f"  │  WORK REMAINING                          │")
print(f"  ├─────────────────────────────────────────┤")
print(f"  │  Need pricing:     {need_pricing:>4} (have URL: {easy_pricing})  │")
print(f"  │  Need description: {need_about:>4}                      │")
print(f"  │  Need email:       {need_email:>4}                      │")
print(f"  │  Need schedule:    {need_sched:>4} of {has_sched_url} w/ URL    │")
print(f"  │    ├ fitssey:      {fitssey_count:>4}                      │")
print(f"  │    └ other:        {non_fitssey:>4}                      │")
print(f"  └─────────────────────────────────────────┘")

# ── Per-city breakdown ──
print(f"\n  PER-CITY ENRICHMENT:")
print(f"  {'City':<20s} {'Total':>5} {'Price':>5} {'About':>5} {'Email':>5} {'Sched':>5}")
print(f"  {'─'*20} {'─'*5} {'─'*5} {'─'*5} {'─'*5} {'─'*5}")
cities = q("""
    SELECT 
        s.city,
        COUNT(*) as total,
        SUM(CASE WHEN s.pricing_json IS NOT NULL AND s.pricing_json != '' THEN 1 ELSE 0 END) as has_p,
        SUM(CASE WHEN s.description_raw IS NOT NULL AND s.description_raw != '' THEN 1 ELSE 0 END) as has_d,
        SUM(CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 1 ELSE 0 END) as has_e,
        0 as has_s
    FROM schools s
    WHERE s.website_url IS NOT NULL AND s.website_url != ''
    GROUP BY s.city
    ORDER BY COUNT(*) DESC
""")
for row in cities:
    city, total, p, d, e, s = row[0] or "?", row[1], row[2], row[3], row[4], row[5]
    print(f"  {city:<20s} {total:>5} {p:>5} {d:>5} {e:>5} {s:>5}")

# ── Scrape log summary ──
print(f"\n  RECENT SCRAPE LOG:")
try:
    logs = q("""SELECT task, status, COUNT(*) as cnt, MAX(scraped_at) as latest
        FROM scrape_log GROUP BY task, status ORDER BY latest DESC LIMIT 12""")
    for row in logs:
        print(f"    {row[0]:<25s} {row[1]:<12s} {row[2]:>4}x  last: {row[3]}")
except:
    print("    (no scrape_log table)")

# ── Sample enriched schools ──
print(f"\n  SAMPLE ENRICHED SCHOOLS (with pricing):")
try:
    samples = q("SELECT id, name, city, email, phone FROM schools WHERE pricing_json IS NOT NULL AND pricing_json != '' LIMIT 8")
    for row in samples:
        sid, name, city = row[0], row[1], row[2]
        email, phone = row[3] or "-", row[4] or "-"
        print(f"    {name} ({city})  email={email}  phone={phone}")
except Exception as ex:
    print(f"    (query failed: {ex})")

# ── Schools with NO data at all ──
try:
    no_data = q1("SELECT COUNT(*) FROM schools WHERE website_url IS NOT NULL AND website_url != '' AND pricing_json IS NULL AND description_raw IS NULL")
    print(f"\n  Schools with website but ZERO enrichment: {no_data}")
except Exception as ex:
    print(f"\n  (zero-enrichment query failed: {ex})")

conn.close()
print("\nDone.")
