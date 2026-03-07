"""
Website Scraper — crawl4ai + LLM extraction pipeline.

Crawls yoga school websites using crawl4ai (AsyncWebCrawler),
extracts pricing/about/schedule via OpenAI structured output,
and writes enriched data to the Turso database.

Usage:
    python -m src.scrape                        # all schools needing data
    python -m src.scrape --school yoga-republic
    python -m src.scrape --prices-only
    python -m src.scrape --city Kraków
    python -m src.scrape --force --limit 5
"""

import asyncio
import json
import logging
import os
import re
from typing import Optional
from urllib.parse import urljoin, urlparse

from openai import AsyncOpenAI
from pydantic import BaseModel

from .db import (
    get_connection,
    validate_schema,
    get_school,
    get_schools_needing_enrichment,
    get_all_schools,
    get_school_styles,
    update_pricing,
    update_about,
    replace_schedule,
    has_schedule,
)
from .tracking import (
    ensure_scrape_log_table,
    track_scrape,
    TASK_SCRAPE_PRICING,
    TASK_SCRAPE_ABOUT,
    TASK_SCRAPE_SCHEDULE,
)
from .models import PricingData, ScheduleData, AboutData

log = logging.getLogger("yoga-scraper.scrape")

MAX_MD_CHARS = 48_000

# ── Day mapping for schedule ─────────────────────────────────────────────────

DAY_MAP = {
    "poniedziałek": 0, "wtorek": 1, "środa": 2, "czwartek": 3,
    "piątek": 4, "sobota": 5, "niedziela": 6,
}

# ── Content quality checks ────────────────────────────────────────────────────

TIME_PATTERN = re.compile(r'\b\d{1,2}[:.]\d{2}\b')
POLISH_DAY_PATTERN = re.compile(
    r'poniedzia[łl]ek|wtorek|[śs]roda|czwartek|pi[ąa]tek|sobota|niedziela|'
    r'monday|tuesday|wednesday|thursday|friday|saturday|sunday',
    re.IGNORECASE,
)


def _has_schedule_signals(markdown: str) -> bool:
    """
    Check if markdown plausibly contains schedule data.
    Looks for time patterns (HH:MM) and day-of-week mentions.
    Returns False if the page is likely empty/JS-only/cookie-banner.
    """
    times_found = len(TIME_PATTERN.findall(markdown))
    days_found = len(POLISH_DAY_PATTERN.findall(markdown))

    # Need at least 2 time mentions and 1 day mention to be a real schedule
    if times_found >= 2 and days_found >= 1:
        return True

    log.debug("Schedule content check failed: %d times, %d days in %d chars",
              times_found, days_found, len(markdown))
    return False


# ── LLM prompts ──────────────────────────────────────────────────────────────

PRICING_INSTRUCTION = (
    "Extract ALL pricing from this yoga/fitness studio page. The page may be in Polish or English.\n\n"
    "Common pricing structures in Polish yoga studios:\n"
    "- Karnety (passes): 'Karnet Open' (unlimited), pakiety N wejść (4/8/10/12 entries)\n"
    "- Different prices per class TYPE: regular yoga vs joga w hamakach vs pilates na reformerze\n"
    "- Single drop-in (wejście jednorazowe)\n"
    "- Trial offers: pierwsza wizyta gratis, tydzień próbny, klasa próbna\n"
    "- Intro packs: pakiet startowy, pakiet powitalny\n"
    "- Private sessions: zajęcia indywidualne/prywatne\n"
    "- Discounts: studenci, seniorzy, pary\n"
    "- Validity periods: ważny 30/60/90 dni\n\n"
    "Extract EVERY tier. Each needs: name, price_pln, tier_type.\n"
    "Also fill headline numbers:\n"
    "- monthly_pass_pln = price of the standard ~30-day unlimited/open pass for REGULAR yoga classes. "
    "NOT quarterly (90-day), NOT yearly, NOT reformer-only or premium-only. "
    "If no ~30-day unlimited pass exists, leave null.\n"
    "- single_class_pln = single drop-in price for regular classes.\n"
    "- trial_price_pln = trial/intro class price (0 = free, null = not offered).\n"
    "Prices are in PLN (zł). DO NOT return empty tiers if prices are visible."
)

SCHEDULE_INSTRUCTION = (
    "You are extracting a yoga/fitness studio weekly class schedule from a web page.\n\n"
    "CRITICAL RULES:\n"
    "1. ONLY extract classes that are EXPLICITLY listed in the text with a visible day + time.\n"
    "2. If the page has NO schedule data (e.g. only navigation, cookie banners, or a heading), "
    "return {\"classes\": []}.\n"
    "3. NEVER invent or guess class names, times, or instructor names. "
    "If you cannot see them in the text, do NOT fabricate them.\n"
    "4. Common fake/generic instructor names you must NOT output unless they literally appear: "
    "'Anna Kowalska', 'Jan Nowak', 'Katarzyna Wiśniewska'.\n\n"
    "Each entry needs: day (Polish: Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela), "
    "time range (e.g. '07:00-08:30'), class name, instructor (only if shown), level (only if shown).\n"
    "Extract ALL classes visible on the page."
)

ABOUT_INSTRUCTION = (
    "Extract the yoga/fitness studio's info from this page. The page is in Polish.\n\n"
    "EXTRACT:\n"
    "1. **description_raw**: The studio's own description/about text. Look for paragraphs describing "
    "the studio, its philosophy, what it offers, who runs it. Copy the most relevant 2-5 paragraphs "
    "VERBATIM in Polish. If the homepage has introductory text about the studio, use that.\n"
    "2. **styles**: Yoga/fitness styles offered. ONLY use these exact canonical names: "
    "Ashtanga, Vinyasa, Hatha, Iyengar, Kundalini, Yin, Yin/Restorative, Aerial, "
    "Hot Yoga, Pregnancy, Nidra, Mysore, Power Yoga, Jivamukti, Pilates, "
    "Pilates Reformer, Stretching, Meditation. "
    "Map Polish names: joga w hamakach=Aerial, joga dla ciężarnych=Pregnancy, "
    "rozciąganie=Stretching, medytacja=Meditation. Include a style if ANY class or mention of it appears.\n"
    "3. **phone**: Phone number (look for 'tel:', '+48', 9-digit numbers).\n"
    "4. **email**: Email address (look for '@' or 'mailto:').\n\n"
    "If something is not found, leave it empty/null. NEVER invent data."
)


# ── Crawl4AI fetching ────────────────────────────────────────────────────────


async def crawl_urls(
    urls: list[str],
    concurrency: int = 5,
    keep_nav_footer: bool = False,
) -> dict[str, str]:
    """
    Crawl multiple URLs and return {url: markdown} dict.
    Uses crawl4ai AsyncWebCrawler with arun_many for concurrency.

    Args:
        keep_nav_footer: If True, don't exclude nav/footer/header tags
                         (useful for homepage/about pages with contact info).
    """
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

    # Deduplicate and filter
    unique = list(dict.fromkeys(u for u in urls if u))
    if not unique:
        return {}

    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=800,
    )

    excluded = ["aside"] if keep_nav_footer else ["nav", "footer", "aside", "header"]

    crawl_config = CrawlerRunConfig(
        cache_mode=CacheMode.ENABLED,
        page_timeout=30_000,
        remove_overlay_elements=True,
        excluded_tags=excluded,
        word_count_threshold=10,
    )

    results: dict[str, str] = {}
    async with AsyncWebCrawler(config=browser_config) as crawler:
        crawl_results = await crawler.arun_many(
            urls=unique,
            config=crawl_config,
            max_concurrent=concurrency,
        )
        for r in crawl_results:
            if r.success and r.markdown:
                md = r.markdown
                if len(md) > MAX_MD_CHARS:
                    md = md[:MAX_MD_CHARS]
                results[r.url] = md
            else:
                log.warning("Failed to crawl %s: %s", r.url, getattr(r, 'error_message', 'unknown'))

    return results


async def crawl_single(url: str) -> Optional[str]:
    """Crawl a single URL and return markdown or None."""
    result = await crawl_urls([url])
    return result.get(url)


async def crawl_schedule_page(url: str) -> Optional[str]:
    """
    Crawl a schedule page with JS-rendering support.
    Waits longer and scrolls to trigger lazy-loaded calendar widgets.
    Falls back to regular crawl if no schedule signals found.
    """
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=1200,
    )

    # JS to scroll page and wait for dynamic content
    scroll_js = """
    await new Promise(r => setTimeout(r, 2000));
    window.scrollTo(0, document.body.scrollHeight / 2);
    await new Promise(r => setTimeout(r, 1000));
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1500));
    """

    crawl_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,  # Always fresh for schedules
        page_timeout=45_000,
        remove_overlay_elements=True,
        excluded_tags=["nav", "footer", "aside", "header"],
        word_count_threshold=5,
        js_code=scroll_js,
    )

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=crawl_config)
        if result.success and result.markdown:
            md = result.markdown
            if len(md) > MAX_MD_CHARS:
                md = md[:MAX_MD_CHARS]
            return md
        else:
            log.warning("JS crawl failed for %s: %s", url, getattr(result, 'error_message', 'unknown'))
            return None


# ── LLM extraction ───────────────────────────────────────────────────────────


async def extract_with_llm(
    markdown: str,
    schema_cls: type[BaseModel],
    instruction: str,
    label: str = "",
) -> Optional[dict]:
    """
    Extract structured data from markdown using OpenAI structured output.
    Returns parsed dict or None on failure.
    """
    if not markdown or len(markdown.strip()) < 50:
        log.debug("Skipping LLM extraction for %s — content too short", label)
        return None

    model = os.getenv("LLM_MODEL_FIND", "gpt-4o-mini")
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    schema = schema_cls.model_json_schema()

    for attempt in range(3):
        try:
            response = await client.chat.completions.create(
                model=model,
                temperature=0.1,
                max_tokens=2000,
                messages=[
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": markdown},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": schema_cls.__name__,
                        "schema": schema,
                        "strict": False,
                    },
                },
            )
            raw = response.choices[0].message.content
            data = json.loads(raw)
            # Validate through Pydantic to enforce schema types
            try:
                validated = schema_cls.model_validate(data)
                data = validated.model_dump()
            except Exception as ve:
                log.warning("Pydantic validation failed for %s, using raw: %s", label, ve)
            log.debug("LLM extracted %s: %d keys", label, len(data))
            return data
        except Exception as e:
            log.warning("LLM attempt %d/%d for %s failed: %s", attempt + 1, 3, label, e)
            if attempt < 2:
                await asyncio.sleep(1 * (attempt + 1))

    return None


# ── URL discovery (lightweight, built-in) ────────────────────────────────────

PRICING_LINK_PATTERNS = re.compile(
    r'cennik|ceny|price|pricing|karnet|oferta|pakiet', re.IGNORECASE
)
SCHEDULE_LINK_PATTERNS = re.compile(
    r'grafik|harmonogram|rozk[łl]ad|plan.?zaj|schedule|timetable|kalend|zajecia|zaj[ęe]cia',
    re.IGNORECASE,
)
ABOUT_LINK_PATTERNS = re.compile(
    r'o.?nas|about|kontakt|contact|o.?studiu|o.?szkole|o.?pracowni',
    re.IGNORECASE,
)


def discover_subpage_urls(
    markdown: str, base_url: str, existing_pricing: Optional[str], existing_schedule: Optional[str],
) -> dict[str, Optional[str]]:
    """
    Scan crawled markdown for pricing/schedule/about subpage links.
    Returns dict with 'pricing_url', 'schedule_url', 'about_url' (or None).
    Only fills in missing URLs.
    """
    discovered: dict[str, Optional[str]] = {
        "pricing_url": existing_pricing or None,
        "schedule_url": existing_schedule or None,
        "about_url": None,
    }

    # Extract markdown links: [text](url)
    links = re.findall(r'\[([^\]]*)\]\(([^)]+)\)', markdown)

    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc.replace("www.", "")

    for text, href in links:
        # Resolve relative URLs
        full_url = urljoin(base_url, href)
        parsed = urlparse(full_url)
        link_domain = parsed.netloc.replace("www.", "")

        # Skip external domains
        if link_domain != base_domain:
            continue

        combined = f"{text} {parsed.path}"

        if not discovered["pricing_url"] and PRICING_LINK_PATTERNS.search(combined):
            discovered["pricing_url"] = full_url
            log.debug("Discovered pricing URL: %s", full_url)

        if not discovered["schedule_url"] and SCHEDULE_LINK_PATTERNS.search(combined):
            discovered["schedule_url"] = full_url
            log.debug("Discovered schedule URL: %s", full_url)

        if not discovered["about_url"] and ABOUT_LINK_PATTERNS.search(combined):
            discovered["about_url"] = full_url
            log.debug("Discovered about URL: %s", full_url)

    return discovered


# ── Convert LLM schedule to DB entries ───────────────────────────────────────


def _convert_schedule_entries(classes: list[dict], school_id: str) -> list[dict]:
    """Convert LLM schedule output to schedule_entries format expected by db.replace_schedule."""
    entries = []
    for cls in classes:
        day_str = cls.get("day", "").lower().strip()
        day_of_week = DAY_MAP.get(day_str, 0)

        time_str = cls.get("time", "")
        start_time, end_time = "", None
        if "-" in time_str or "–" in time_str:
            parts = re.split(r"[-–]", time_str, maxsplit=1)
            start_time = parts[0].strip()
            end_time = parts[1].strip() if len(parts) > 1 else None

        entries.append({
            "school_id": school_id,
            "schedule_type": "weekly",
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "class_name": cls.get("class_name", ""),
            "teacher": cls.get("instructor"),
            "level": cls.get("level"),
            "source": "crawl4ai",
        })
    return entries


# ── Scrape a single school ───────────────────────────────────────────────────


async def scrape_school(
    school: dict,
    conn,
    prices_only: bool = False,
    force: bool = False,
    dry_run: bool = False,
    crawled_pages: Optional[dict[str, str]] = None,
) -> dict:
    """
    Scrape a single school: crawl pages → LLM extract → save to DB.

    Args:
        school: dict from DB (full row)
        conn: DB connection
        prices_only: only extract pricing
        force: re-scrape even if data exists
        dry_run: don't write to DB
        crawled_pages: pre-crawled {url: markdown} to avoid re-crawling

    Returns summary dict.
    """
    school_id = school["id"]
    website = school.get("website_url", "")
    pricing_url = school.get("pricing_url", "")
    schedule_url = school.get("schedule_url", "")

    log.info("━━━ %s (%s) ━━━", school["name"], school.get("city", ""))

    needs_pricing = force or school.get("last_price_check") is None
    needs_about = not prices_only and (
        force or not school.get("description_raw") or school.get("description_raw") == ""
    )
    _has_sched = has_schedule(conn, school_id)
    needs_schedule = not prices_only and (force or not _has_sched)

    summary = {"id": school_id, "pricing": None, "about": None, "schedule": None}

    if crawled_pages is None:
        crawled_pages = {}

    # ── Collect URLs to crawl ──
    urls_to_crawl = set()
    homepage_urls = set()  # These need nav/footer kept for contact info
    content_urls = set()   # These can strip nav/footer

    if website:
        homepage_urls.add(website)
    if pricing_url and needs_pricing:
        content_urls.add(pricing_url)
    if schedule_url and needs_schedule and "fitssey.com" not in (schedule_url or ""):
        content_urls.add(schedule_url)

    # Crawl homepage with nav/footer kept (for contact info extraction)
    missing_home = [u for u in homepage_urls if u not in crawled_pages]
    if missing_home:
        new_pages = await crawl_urls(missing_home, keep_nav_footer=True)
        crawled_pages.update(new_pages)

    # Crawl content pages with nav/footer stripped
    missing_content = [u for u in content_urls if u not in crawled_pages]
    if missing_content:
        new_pages = await crawl_urls(missing_content)
        crawled_pages.update(new_pages)

    # ── Discover subpage URLs from homepage ──
    homepage_md = crawled_pages.get(website, "")
    discovered = {"pricing_url": pricing_url, "schedule_url": schedule_url, "about_url": None}
    if homepage_md and website:
        discovered = discover_subpage_urls(homepage_md, website, pricing_url, schedule_url)
        if discovered.get("pricing_url") and discovered["pricing_url"] != pricing_url:
            pricing_url = discovered["pricing_url"]
            log.info("  Discovered pricing URL: %s", pricing_url)
            if not dry_run:
                conn.execute(
                    "UPDATE schools SET pricing_url = ? WHERE id = ? AND (pricing_url IS NULL OR pricing_url = '')",
                    [pricing_url, school_id],
                )
        if discovered.get("schedule_url") and discovered["schedule_url"] != schedule_url:
            schedule_url = discovered["schedule_url"]
            log.info("  Discovered schedule URL: %s", schedule_url)
            if not dry_run:
                conn.execute(
                    "UPDATE schools SET schedule_url = ? WHERE id = ? AND (schedule_url IS NULL OR schedule_url = '')",
                    [schedule_url, school_id],
                )

        # Crawl newly discovered URLs
        new_urls = []
        if pricing_url and pricing_url not in crawled_pages:
            new_urls.append(pricing_url)
        if schedule_url and schedule_url not in crawled_pages and "fitssey.com" not in schedule_url:
            new_urls.append(schedule_url)
        if new_urls:
            new_pages = await crawl_urls(new_urls)
            crawled_pages.update(new_pages)

    # ── Pricing extraction ──
    if needs_pricing:
        with track_scrape(conn, school_id, TASK_SCRAPE_PRICING) as tracker:
            md = crawled_pages.get(pricing_url) or crawled_pages.get(website, "")
            if not md:
                tracker.set_no_data("no page content")
                log.info("  pricing: no content")
            else:
                data = await extract_with_llm(md, PricingData, PRICING_INSTRUCTION, f"{school_id}/pricing")
                if data and data.get("tiers"):
                    summary["pricing"] = data
                    tiers_str = f"{len(data['tiers'])} tiers"
                    price_str = f"price={data.get('monthly_pass_pln')}"
                    log.info("  pricing: %s, %s", tiers_str, price_str)
                    if not dry_run:
                        update_pricing(conn, school_id, data)
                    tracker.set_success(f"{tiers_str}, {price_str}", fields="price,trial_price,pricing_json")
                elif data and data.get("monthly_pass_pln"):
                    summary["pricing"] = data
                    log.info("  pricing: price=%s (no tiers)", data["monthly_pass_pln"])
                    if not dry_run:
                        update_pricing(conn, school_id, data)
                    tracker.set_success(f"price={data['monthly_pass_pln']}", fields="price")
                else:
                    tracker.set_no_data("LLM returned no pricing")
                    log.info("  pricing: none found")
    else:
        log.debug("  pricing: skip (already scraped)")

    # ── About extraction ──
    if needs_about:
        with track_scrape(conn, school_id, TASK_SCRAPE_ABOUT) as tracker:
            # Merge homepage + about/contact page content for richer extraction
            about_parts = []
            homepage_md = crawled_pages.get(website, "")
            if homepage_md:
                about_parts.append(homepage_md)

            # Crawl discovered about/contact page if found
            about_url = discovered.get("about_url") if homepage_md else None
            if about_url and about_url != website and about_url not in crawled_pages:
                new_pages = await crawl_urls([about_url], keep_nav_footer=True)
                crawled_pages.update(new_pages)
            if about_url and about_url in crawled_pages and about_url != website:
                about_parts.append(crawled_pages[about_url])

            combined_md = "\n\n---\n\n".join(about_parts)
            if not combined_md:
                tracker.set_no_data("no homepage content")
                log.info("  about: no content")
            else:
                # Truncate combined to fit LLM context
                if len(combined_md) > MAX_MD_CHARS:
                    combined_md = combined_md[:MAX_MD_CHARS]
                data = await extract_with_llm(combined_md, AboutData, ABOUT_INSTRUCTION, f"{school_id}/about")
                if data and (data.get("description_raw") or data.get("styles")):
                    summary["about"] = data
                    desc_len = len(data.get("description_raw", ""))
                    styles_count = len(data.get("styles", []))
                    log.info("  about: %d chars, %d styles, phone=%s, email=%s",
                             desc_len, styles_count, data.get("phone"), data.get("email"))
                    if not dry_run:
                        update_about(conn, school_id, data)
                    tracker.set_success(
                        f"desc={desc_len}ch, styles={styles_count}",
                        fields="description_raw,phone,email,styles",
                    )
                else:
                    tracker.set_no_data("LLM returned no about data")
                    log.info("  about: none found")
    else:
        log.debug("  about: skip")

    # ── Schedule extraction ──
    if needs_schedule and schedule_url and "fitssey.com" not in schedule_url:
        with track_scrape(conn, school_id, TASK_SCRAPE_SCHEDULE) as tracker:
            md = crawled_pages.get(schedule_url, "")

            # If regular crawl returned nothing useful, try JS-aware crawl
            if not md or not _has_schedule_signals(md):
                log.info("  schedule: regular crawl insufficient (%d chars), trying JS-aware crawl...",
                         len(md) if md else 0)
                js_md = await crawl_schedule_page(schedule_url)
                if js_md:
                    md = js_md
                    crawled_pages[schedule_url] = md

            if not md:
                tracker.set_no_data("no schedule page content")
                log.info("  schedule: no content (even after JS crawl)")
            elif not _has_schedule_signals(md):
                tracker.set_no_data("page has no schedule data (likely embedded widget/iframe)")
                log.info("  schedule: no time/day patterns found (%d chars) — skipping LLM", len(md))
            else:
                data = await extract_with_llm(md, ScheduleData, SCHEDULE_INSTRUCTION, f"{school_id}/schedule")
                classes = data.get("classes", []) if data else []
                if classes:
                    entries = _convert_schedule_entries(classes, school_id)
                    summary["schedule"] = {"count": len(entries)}
                    log.info("  schedule: %d classes", len(entries))
                    if not dry_run:
                        replace_schedule(conn, school_id, entries)
                    tracker.set_success(f"{len(entries)} classes", fields="schedule_entries")
                else:
                    tracker.set_no_data("LLM returned no schedule")
                    log.info("  schedule: none found")
    elif needs_schedule and schedule_url and "fitssey.com" in schedule_url:
        log.debug("  schedule: fitssey URL — use scrape-schedules command")
    else:
        log.debug("  schedule: skip")

    return summary


# ── Batch runner ─────────────────────────────────────────────────────────────


async def run_scrape(
    school_id: Optional[str] = None,
    city: Optional[str] = None,
    prices_only: bool = False,
    force: bool = False,
    dry_run: bool = False,
    limit: int = 0,
):
    """Main entry point — scrape schools needing enrichment."""
    from dotenv import load_dotenv
    load_dotenv()

    conn = get_connection()
    validate_schema(conn)
    ensure_scrape_log_table(conn)

    # Select schools
    if school_id:
        school = get_school(conn, school_id)
        if not school:
            log.error("School '%s' not found", school_id)
            return
        schools = [school]
    elif force:
        schools = get_all_schools(conn, city)
    else:
        schools = get_schools_needing_enrichment(conn, city)

    # Only schools with a website
    schools = [s for s in schools if s.get("website_url")]

    if limit > 0:
        schools = schools[:limit]

    if not schools:
        log.info("No schools need scraping. Use --force to re-scrape.")
        return

    log.info("Scraping %d school(s)%s%s",
             len(schools),
             f" in {city}" if city else "",
             " (dry run)" if dry_run else "")

    ok, errors = 0, 0
    for school in schools:
        try:
            result = await scrape_school(
                school, conn,
                prices_only=prices_only,
                force=force,
                dry_run=dry_run,
            )
            has_data = any(v for k, v in result.items() if k != "id")
            if has_data:
                ok += 1
        except Exception as e:
            log.error("Failed %s: %s", school["id"], e)
            errors += 1

        # Brief pause between schools
        await asyncio.sleep(0.5)

    log.info("Done: %d enriched, %d errors out of %d schools", ok, errors, len(schools))
    conn.close()


# ── CLI entrypoint ───────────────────────────────────────────────────────────


def main():
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Scrape yoga school websites via crawl4ai")
    parser.add_argument("--school", type=str, help="Single school ID")
    parser.add_argument("--city", type=str, help="Filter by city")
    parser.add_argument("--prices-only", action="store_true", help="Only extract pricing")
    parser.add_argument("--force", action="store_true", help="Re-scrape even if data exists")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB")
    parser.add_argument("--limit", type=int, default=0, help="Max schools (0=all)")
    args = parser.parse_args()

    asyncio.run(run_scrape(
        school_id=args.school,
        city=args.city,
        prices_only=args.prices_only,
        force=args.force,
        dry_run=args.dry_run,
        limit=args.limit,
    ))


if __name__ == "__main__":
    main()
