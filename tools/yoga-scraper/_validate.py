"""
Validation script — crawl a few schools, show markdown + LLM output for manual review.
Helps verify extraction quality before bulk runs.
"""
import asyncio
import json
import logging
import sys
import io

# Fix Windows console encoding for Polish chars
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

from src.scrape import (
    crawl_urls, crawl_schedule_page, extract_with_llm,
    discover_subpage_urls, _has_schedule_signals,
    PRICING_INSTRUCTION, SCHEDULE_INSTRUCTION, ABOUT_INSTRUCTION,
)
from src.models import PricingData, ScheduleData, AboutData
from src.db import get_connection

# Schools to validate — mix of cities, with both pricing + schedule URLs
VALIDATION_SCHOOLS = [
    # Had hallucinated schedule (cookie banner page) — should now be BLOCKED
    "luna-pilates-house",
    # Had empty about despite rich homepage — should now extract about+contact
    "z-milosci-studio-joga-swiadomosc-czestochowa",
]


async def validate():
    conn = get_connection()

    for school_id in VALIDATION_SCHOOLS:
        rs = conn.execute("SELECT * FROM schools WHERE id = ?", [school_id])
        if not rs.rows:
            print(f"\n{'='*80}\nSKIPPED: {school_id} not found\n")
            continue
        school = dict(zip(rs.columns, rs.rows[0]))

        print(f"\n{'='*80}")
        print(f"  {school['name']} ({school['city']})")
        print(f"  website:  {school.get('website_url', '-')}")
        print(f"  pricing:  {school.get('pricing_url', '-')}")
        print(f"  schedule: {school.get('schedule_url', '-')}")
        print(f"{'='*80}")

        # Collect URLs
        website = school.get("website_url", "")
        pricing_url = school.get("pricing_url", "")
        schedule_url = school.get("schedule_url", "")

        # Crawl homepage with nav/footer kept (for contact info)
        pages = {}
        if website:
            home_pages = await crawl_urls([website], keep_nav_footer=True)
            pages.update(home_pages)

        # Crawl content pages (pricing) with nav/footer stripped
        content_urls = []
        if pricing_url and pricing_url != website:
            content_urls.append(pricing_url)
        if content_urls:
            content_pages = await crawl_urls(content_urls)
            pages.update(content_pages)

        print(f"\n  Crawled {len(pages)} pages")

        for url, md in pages.items():
            label = "homepage" if url == website else "pricing" if url == pricing_url else "other"
            print(f"\n  --- {label} ({url}) ---")
            print(f"  Markdown length: {len(md)} chars")
            preview = md[:600].replace('\n', '\n  | ')
            print(f"  | {preview}")
            if len(md) > 600:
                print(f"  | ... ({len(md) - 600} more chars)")

        # ── Discover about/contact URLs from homepage ──
        homepage_md = pages.get(website, "")
        discovered = {"about_url": None}
        if homepage_md and website:
            discovered = discover_subpage_urls(homepage_md, website, pricing_url, schedule_url)
            if discovered.get("about_url"):
                print(f"\n  Discovered about URL: {discovered['about_url']}")

        # ── Pricing extraction ──
        if pricing_url and pages.get(pricing_url):
            print(f"\n  >>> PRICING EXTRACTION <<<")
            data = await extract_with_llm(pages[pricing_url], PricingData, PRICING_INSTRUCTION, f"{school_id}/pricing")
            if data:
                print(f"  monthly_pass: {data.get('monthly_pass_pln')} PLN")
                print(f"  single_class: {data.get('single_class_pln')} PLN")
                print(f"  trial_price:  {data.get('trial_price_pln')} PLN")
                print(f"  trial_info:   {data.get('trial_info')}")
                print(f"  discounts:    {data.get('discounts')}")
                print(f"  notes:        {data.get('pricing_notes')}")
                tiers = data.get("tiers", [])
                print(f"  tiers ({len(tiers)}):")
                for t in tiers:
                    entry_str = f" ({t['entries']} entries)" if t.get("entries") else ""
                    valid_str = f" valid {t['validity_days']}d" if t.get("validity_days") else ""
                    cls_str = f" [{', '.join(t['class_types'])}]" if t.get("class_types") else ""
                    print(f"    {t['name']}: {t['price_pln']} PLN ({t['tier_type']}){entry_str}{valid_str}{cls_str}")
            else:
                print("  [NO DATA EXTRACTED]")

        # ── Schedule extraction (with signal check + JS fallback) ──
        if schedule_url and "fitssey" not in schedule_url:
            print(f"\n  >>> SCHEDULE EXTRACTION <<<")

            # First try: regular crawl (may already be in pages)
            sched_md = pages.get(schedule_url)
            if not sched_md:
                sched_result = await crawl_urls([schedule_url])
                sched_md = sched_result.get(schedule_url)

            has_signals = _has_schedule_signals(sched_md) if sched_md else False
            print(f"  Regular crawl: {len(sched_md) if sched_md else 0} chars, schedule signals: {has_signals}")

            # If no signals, try JS-aware crawl
            if not has_signals:
                print(f"  Trying JS-aware crawl...")
                js_md = await crawl_schedule_page(schedule_url)
                if js_md:
                    sched_md = js_md
                    has_signals = _has_schedule_signals(sched_md)
                    print(f"  JS crawl: {len(sched_md)} chars, schedule signals: {has_signals}")
                else:
                    print(f"  JS crawl: failed or empty")

            if sched_md and has_signals:
                # Show what the LLM will see
                sched_preview = sched_md[:800].replace('\n', '\n  | ')
                print(f"  Schedule markdown preview:")
                print(f"  | {sched_preview}")

                data = await extract_with_llm(sched_md, ScheduleData, SCHEDULE_INSTRUCTION, f"{school_id}/schedule")
                classes = data.get("classes", []) if data else []
                print(f"  Extracted: {len(classes)} classes")
                by_day = {}
                for c in classes:
                    day = c.get("day", "?")
                    by_day.setdefault(day, []).append(c)
                for day, day_classes in by_day.items():
                    print(f"    {day}:")
                    for c in day_classes[:4]:
                        print(f"      {c['time']}  {c['class_name']}  ({c.get('instructor', '-')})")
                    if len(day_classes) > 4:
                        print(f"      ... +{len(day_classes) - 4} more")
            else:
                print(f"  SKIPPED: no schedule signals detected — would NOT send to LLM (prevents hallucination)")
        elif schedule_url and "fitssey" in schedule_url:
            print(f"\n  >>> SCHEDULE: Fitssey URL — skip (use scrape-schedules)")
        else:
            print(f"\n  >>> NO SCHEDULE PAGE TO EXTRACT")

        # ── About extraction (merged homepage + about page) ──
        print(f"\n  >>> ABOUT EXTRACTION <<<")
        about_parts = []
        if homepage_md:
            about_parts.append(homepage_md)

        about_url = discovered.get("about_url")
        if about_url and about_url != website:
            about_pages = await crawl_urls([about_url], keep_nav_footer=True)
            if about_url in about_pages:
                about_parts.append(about_pages[about_url])
                print(f"  Also crawled about page: {about_url} ({len(about_pages[about_url])} chars)")

        combined_md = "\n\n---\n\n".join(about_parts)
        if combined_md:
            print(f"  Combined about content: {len(combined_md)} chars")
            data = await extract_with_llm(combined_md, AboutData, ABOUT_INSTRUCTION, f"{school_id}/about")
            if data:
                print(f"  styles: {data.get('styles', [])}")
                desc = data.get("description_raw", "")
                print(f"  description ({len(desc)} chars): {desc[:300]}...")
                print(f"  phone: {data.get('phone')}")
                print(f"  email: {data.get('email')}")
            else:
                print("  [NO ABOUT DATA]")
        else:
            print("  [NO HOMEPAGE CONTENT]")

    conn.close()


if __name__ == "__main__":
    asyncio.run(validate())
