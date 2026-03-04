"""Analyze schedule URLs and pick validation samples."""
import random
from urllib.parse import urlparse
from collections import Counter
from src.db import get_connection

conn = get_connection()

rs = conn.execute("""
    SELECT s.id, s.name, s.city, s.schedule_url, s.pricing_url, s.website_url
    FROM schools s
    WHERE s.schedule_url IS NOT NULL AND s.schedule_url != ''
      AND s.schedule_url NOT LIKE '%fitssey.com%'
    ORDER BY s.city, s.name
""")
schools = [dict(zip(rs.columns, r)) for r in rs.rows]
print(f"Total non-Fitssey schedule URLs: {len(schools)}")

# URL path patterns
patterns = Counter()
for s in schools:
    path = urlparse(s["schedule_url"]).path.lower()
    if "grafik" in path: patterns["grafik"] += 1
    elif "harmonogram" in path: patterns["harmonogram"] += 1
    elif "plan" in path or "rozklad" in path: patterns["plan/rozklad"] += 1
    elif "zajecia" in path or "classes" in path: patterns["zajecia/classes"] += 1
    elif "schedule" in path or "timetable" in path: patterns["schedule/timetable"] += 1
    elif "kalendarz" in path or "calendar" in path: patterns["calendar"] += 1
    else: patterns["other"] += 1

print("\nURL path patterns:")
for p, c in patterns.most_common():
    print(f"  {p}: {c}")

# Booking systems
booking_kw = [
    ("booksy", "booksy.com"), ("fitprofit", "fitprofit"),
    ("supersalon", "supersalon"), ("reservio", "reservio"),
    ("momoyoga", "momoyoga"), ("mindbody", "mindbody"),
    ("fitogram", "fitogram"), ("google_cal", "calendar.google"),
    ("calendly", "calendly"), ("wodnify", "wodnify"),
    ("wodify", "wodify"), ("zenoti", "zenoti"),
]
sys_counts = {}
for s in schools:
    url = s["schedule_url"].lower()
    for name, kw in booking_kw:
        if kw in url:
            sys_counts.setdefault(name, []).append(s["id"])

if sys_counts:
    print("\nBooking systems in schedule URLs:")
    for name, ids in sorted(sys_counts.items(), key=lambda x: -len(x[1])):
        print(f"  {name}: {len(ids)} schools")

# Domains with >1 school
domains = Counter()
for s in schools:
    d = urlparse(s["schedule_url"]).netloc.replace("www.", "")
    domains[d] += 1
print("\nDomains with >1 school (possible shared platforms):")
for d, c in domains.most_common(20):
    if c > 1:
        print(f"  {d}: {c}")

# Sample for validation
random.seed(42)
sample = random.sample(schools, min(15, len(schools)))
print("\n=== SAMPLE SCHOOLS FOR VALIDATION ===")
for s in sample:
    print(f"  {s['id']}: {s['name']} ({s['city']})")
    print(f"    schedule: {s['schedule_url']}")
    print(f"    pricing:  {s['pricing_url'] or '-'}")
    print(f"    website:  {s['website_url']}")
    print()

# Also get 5 schools with pricing that we already scraped (for comparison)
rs = conn.execute("""
    SELECT id, name, city, pricing_url, website_url, price, pricing_json
    FROM schools
    WHERE pricing_json IS NOT NULL AND pricing_json != ''
    LIMIT 5
""")
print("=== SCHOOLS WITH EXISTING PRICING (for validation) ===")
for r in rs.rows:
    d = dict(zip(rs.columns, r))
    pj = d["pricing_json"]
    import json
    tiers = json.loads(pj).get("tiers", []) if pj else []
    print(f"  {d['id']}: {d['name']} ({d['city']}) price={d['price']}")
    print(f"    pricing_url: {d['pricing_url']}")
    print(f"    tiers: {len(tiers)}")
    for t in tiers[:3]:
        print(f"      {t['name']}: {t['price_pln']} PLN ({t['tier_type']})")
    if len(tiers) > 3:
        print(f"      ... +{len(tiers) - 3} more")
    print()

conn.close()
