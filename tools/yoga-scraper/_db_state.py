"""Quick DB state check."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from src.db import get_connection

conn = get_connection()

queries = [
    ("Total schools", "SELECT COUNT(*) FROM schools"),
    ("With website_url", "SELECT COUNT(*) FROM schools WHERE website_url IS NOT NULL AND website_url != ''"),
    ("With pricing_url", "SELECT COUNT(*) FROM schools WHERE pricing_url IS NOT NULL AND pricing_url != ''"),
    ("With schedule_url", "SELECT COUNT(*) FROM schools WHERE schedule_url IS NOT NULL AND schedule_url != ''"),
    ("Have pricing (last_price_check)", "SELECT COUNT(*) FROM schools WHERE last_price_check IS NOT NULL"),
    ("Have pricing_json", "SELECT COUNT(*) FROM schools WHERE pricing_json IS NOT NULL AND pricing_json != ''"),
    ("Have description_raw", "SELECT COUNT(*) FROM schools WHERE description_raw IS NOT NULL AND description_raw != ''"),
    ("Have email", "SELECT COUNT(*) FROM schools WHERE email IS NOT NULL AND email != ''"),
    ("Have styles (school_styles)", "SELECT COUNT(DISTINCT school_id) FROM school_styles"),
    ("Schedule entries total", "SELECT COUNT(*) FROM schedule_entries"),
    ("Schools with schedule entries", "SELECT COUNT(DISTINCT school_id) FROM schedule_entries"),
    ("Scrape log entries", "SELECT COUNT(*) FROM scrape_log"),
]

print("=" * 50)
print("DB STATE REPORT")
print("=" * 50)
for label, sql in queries:
    try:
        r = conn.execute(sql)
        print(f"  {label:40s} {r.rows[0][0]}")
    except Exception as e:
        print(f"  {label:40s} ERROR: {e}")
print("=" * 50)

# Check what needs work
r = conn.execute("SELECT COUNT(*) FROM schools WHERE website_url != '' AND last_price_check IS NULL")
print(f"\n  NEED pricing:  {r.rows[0][0]}")
r = conn.execute("SELECT COUNT(*) FROM schools WHERE website_url != '' AND (description_raw IS NULL OR description_raw = '')")
print(f"  NEED about:    {r.rows[0][0]}")
r = conn.execute("""SELECT COUNT(*) FROM schools s 
    WHERE s.website_url != '' 
    AND s.schedule_url IS NOT NULL AND s.schedule_url != ''
    AND NOT EXISTS (SELECT 1 FROM schedule_entries se WHERE se.school_id = s.id)""")
print(f"  NEED schedule: {r.rows[0][0]} (have schedule_url but 0 entries)")


# Cities
r = conn.execute("SELECT city, COUNT(*) as cnt FROM schools GROUP BY city ORDER BY cnt DESC LIMIT 15")
print("\nTOP CITIES:")
for row in r.rows:
    print(f"  {row[0]:20s} {row[1]}")

# Source breakdown
r = conn.execute("SELECT source, COUNT(*) FROM schools GROUP BY source")
print("\nSOURCES:")
for row in r.rows:
    print(f"  {str(row[0]):20s} {row[1]}")

# Schedule sources
r = conn.execute("SELECT source, COUNT(*) FROM schedule_entries GROUP BY source")
print("\nSCHEDULE SOURCES:")
for row in r.rows:
    print(f"  {str(row[0]):20s} {row[1]}")

# Sample pricing_url patterns
r = conn.execute("SELECT pricing_url FROM schools WHERE pricing_url IS NOT NULL AND pricing_url != '' LIMIT 8")
print("\nSAMPLE PRICING URLs:")
for row in r.rows:
    print(f"  {row[0]}")

# Sample schedule_url patterns
r = conn.execute("SELECT schedule_url FROM schools WHERE schedule_url IS NOT NULL AND schedule_url != '' LIMIT 8")
print("\nSAMPLE SCHEDULE URLs:")
for row in r.rows:
    print(f"  {row[0]}")

# Fitssey vs non-fitssey schedules
r = conn.execute("SELECT COUNT(*) FROM schools WHERE schedule_url LIKE '%fitssey.com%'")
fitssey = r.rows[0][0]
r = conn.execute("SELECT COUNT(*) FROM schools WHERE schedule_url IS NOT NULL AND schedule_url != '' AND schedule_url NOT LIKE '%fitssey.com%'")
non_fitssey = r.rows[0][0]
print(f"\nSCHEDULE URL TYPES: fitssey={fitssey}, other={non_fitssey}")

conn.close()
