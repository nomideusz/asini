"""
Fitssey schedule scraper — extracts class schedules from Fitssey-powered
yoga/pilates studio frontoffice pages via XHR interception.

Engines:
    1. Playwright (default) — native response interception of /api/.../schedule
    2. crawl4ai — JS injection interceptor + markdown text fallback

Usage (via CLI):
    yoga-scraper scrape-schedules
    yoga-scraper scrape-schedules --school joga-centrum
    yoga-scraper scrape-schedules --retry-empty
    yoga-scraper scrape-schedules --screenshot
"""

import asyncio
import csv
import json
import logging
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from .db import _rows_to_dicts, get_connection
from .tracking import (
    STATUS_ERROR,
    STATUS_NO_DATA,
    STATUS_SUCCESS,
    TASK_SCRAPE_SCHEDULE,
    ensure_scrape_log_table,
    log_scrape,
)

log = logging.getLogger("yoga-scraper.fitssey")

# Max retries for empty results (navigate next week, then back)
MAX_RETRIES = 2
# How long (ms) to wait for schedule XHR after page load
INITIAL_WAIT_MS = 8_000
# Extra wait per retry attempt
RETRY_WAIT_MS = 5_000


# ═══════════════════════════════════════════════════════════════════════════
# Database helpers
# ═══════════════════════════════════════════════════════════════════════════


def get_fitssey_schools(
    conn,
    school_id: Optional[str] = None,
) -> list[dict]:
    """Fetch schools with Fitssey schedule URLs from the database."""
    if school_id:
        rs = conn.execute(
            "SELECT id, name, schedule_url FROM schools "
            "WHERE id = ? AND schedule_url LIKE '%fitssey.com%'",
            [school_id],
        )
    else:
        rs = conn.execute(
            "SELECT id, name, schedule_url FROM schools "
            "WHERE schedule_url LIKE '%fitssey.com%' "
            "ORDER BY name",
        )
    return _rows_to_dicts(rs)


# ═══════════════════════════════════════════════════════════════════════════
# Validation
# ═══════════════════════════════════════════════════════════════════════════


def _is_valid_response(captured: list[dict]) -> bool:
    """
    Check whether captured XHR responses contain real data.

    Returns False if:
    - No captures at all
    - All events arrays are empty AND all filter class names are empty strings
      (the hallmark of a skeleton/premature response)
    """
    if not captured:
        return False

    has_events = False
    has_named_filters = False

    for entry in captured:
        data = entry.get("data", {})
        if not isinstance(data, dict):
            continue

        # Check for events
        for day in data.get("schedule", []):
            for ev in day.get("scheduleEvents", []):
                if not ev.get("isHidden"):
                    has_events = True
                    break
            if has_events:
                break

        # Check for named filters
        filters = data.get("filters", {})
        for cls in filters.get("classes", []):
            name = cls.get("name", "")
            if isinstance(name, dict):
                # locale-object format
                for v in name.values():
                    if isinstance(v, dict) and v.get("value", ""):
                        has_named_filters = True
                        break
            elif name:
                has_named_filters = True
            if has_named_filters:
                break

    return has_events or has_named_filters


# ═══════════════════════════════════════════════════════════════════════════
# ENGINE 1 — Playwright (default, recommended)
# ═══════════════════════════════════════════════════════════════════════════


async def crawl_with_playwright(school: dict, screenshot: bool = False) -> dict:
    from playwright.async_api import async_playwright

    url = school.get("schedule_url")
    if not url:
        return _error(school, "no schedule_url")

    log.info("[%s] Playwright -> %s", school["id"], url)
    result = _blank(school)
    captured: list[dict] = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                locale="pl-PL",
            )
            page = await ctx.new_page()

            # ---- Intercept every response matching /api/.../schedule ----
            async def on_response(resp):
                if "/api/" in resp.url and "/schedule" in resp.url:
                    try:
                        body = await resp.json()
                        captured.append(
                            {"url": resp.url, "status": resp.status, "data": body}
                        )
                        log.debug(
                            "[%s] Captured schedule API (%s): %s",
                            school["id"],
                            resp.status,
                            resp.url[:100],
                        )
                    except Exception:
                        pass

            page.on("response", on_response)

            # Navigate
            try:
                await page.goto(url, wait_until="networkidle", timeout=60_000)
            except Exception as e:
                log.warning("[%s] Nav warning (may still work): %s", school["id"], e)

            # ---- Poll for valid data ----
            # Fitssey makes multiple XHR calls; first is often a skeleton.
            # We poll for up to 20s, checking every 2s for valid data.
            poll_interval = 2_000
            poll_max_time = 20_000
            poll_elapsed = 0

            while poll_elapsed < poll_max_time:
                await page.wait_for_timeout(poll_interval)
                poll_elapsed += poll_interval
                if _is_valid_response(captured):
                    log.info(
                        "[%s] Valid data found after %dms", school["id"], poll_elapsed
                    )
                    break

            # ---- Retry logic for empty responses ----
            for attempt in range(MAX_RETRIES):
                if _is_valid_response(captured):
                    break

                log.info(
                    "[%s] Empty data after attempt %d — trying next-week navigation",
                    school["id"],
                    attempt + 1,
                )

                # Try clicking the "next week" button, then "previous week" to
                # trigger a fresh schedule load. Fitssey uses various button
                # selectors for week navigation.
                nav_clicked = False
                for selector in [
                    "button[aria-label*='next']",
                    "button[aria-label*='Next']",
                    "button[aria-label*='następn']",
                    "[class*='next']",
                    "[class*='arrow-right']",
                    "[class*='chevron-right']",
                    # Generic: the right-side navigation arrow
                    ".schedule-navigation button:last-child",
                    ".navigation button:last-child",
                ]:
                    try:
                        btn = page.locator(selector).first
                        if await btn.is_visible(timeout=2_000):
                            await btn.click()
                            nav_clicked = True
                            log.debug(
                                "[%s] Clicked next-week: %s", school["id"], selector
                            )
                            # Poll again after navigation
                            poll_elapsed = 0
                            while poll_elapsed < poll_max_time:
                                await page.wait_for_timeout(poll_interval)
                                poll_elapsed += poll_interval
                                if _is_valid_response(captured):
                                    break

                            # Now go back to current week
                            back_selectors = [
                                "button[aria-label*='prev']",
                                "button[aria-label*='Prev']",
                                "button[aria-label*='poprzedn']",
                                "[class*='prev']",
                                "[class*='arrow-left']",
                                "[class*='chevron-left']",
                                ".schedule-navigation button:first-child",
                                ".navigation button:first-child",
                            ]
                            for back_sel in back_selectors:
                                try:
                                    back_btn = page.locator(back_sel).first
                                    if await back_btn.is_visible(timeout=2_000):
                                        await back_btn.click()
                                        poll_elapsed = 0
                                        while poll_elapsed < poll_max_time:
                                            await page.wait_for_timeout(poll_interval)
                                            poll_elapsed += poll_interval
                                            if _is_valid_response(captured):
                                                break
                                        break
                                except Exception:
                                    continue
                            break
                    except Exception:
                        continue

                if not nav_clicked:
                    # Fallback: reload the page entirely
                    log.info("[%s] No nav button found — reloading page", school["id"])
                    captured.clear()
                    try:
                        await page.reload(wait_until="networkidle", timeout=60_000)
                    except Exception:
                        pass
                    # Poll after reload
                    poll_elapsed = 0
                    while poll_elapsed < poll_max_time:
                        await page.wait_for_timeout(poll_interval)
                        poll_elapsed += poll_interval
                        if _is_valid_response(captured):
                            break

            # Screenshot
            if screenshot:
                ss = Path(f"output/{school['id']}_screenshot.png")
                ss.parent.mkdir(parents=True, exist_ok=True)
                await page.screenshot(path=str(ss), full_page=True)
                log.info("[%s] Screenshot -> %s", school["id"], ss)

            # ---- Parse results ----
            if captured and _is_valid_response(captured):
                events, filters = parse_api_responses(captured)
                result["events"] = events
                result["filters"] = filters
                result["method"] = "xhr_intercept"
                log.info("[%s] Parsed %d events from XHR", school["id"], len(events))
            else:
                if captured:
                    log.warning(
                        "[%s] XHR captured but data is empty -> text fallback",
                        school["id"],
                    )
                else:
                    log.warning("[%s] No XHR captured -> text fallback", school["id"])

                # Fallback: parse from rendered page text
                text = await page.inner_text("body")
                result["events"] = parse_from_text(text, school)
                result["raw_text"] = text[:50_000]
                result["method"] = "text_fallback"

            log.info(
                "[%s] %d events (via %s)",
                school["id"],
                len(result["events"]),
                result["method"],
            )
            await browser.close()

    except Exception as e:
        result["error"] = str(e)
        log.error("[%s] %s", school["id"], e, exc_info=True)

    return result


# ═══════════════════════════════════════════════════════════════════════════
# ENGINE 2 — crawl4ai
# ═══════════════════════════════════════════════════════════════════════════

INTERCEPTOR_JS = r"""
(function(){
  window.__c4a_captured = window.__c4a_captured || [];
  const _fetch = window.fetch;
  window.fetch = async function(...a){
    const r = await _fetch.apply(this, a);
    const u = typeof a[0]==='string' ? a[0] : a[0]?.url||'';
    if(u.includes('/api/') && u.includes('/schedule')){
      try{ const d=await r.clone().json(); window.__c4a_captured.push({url:u,data:d}); }catch(e){}
    }
    return r;
  };
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m,u,...r){ this.__u=u; return _open.call(this,m,u,...r); };
  XMLHttpRequest.prototype.send = function(...a){
    this.addEventListener('load', function(){
      if(this.__u && this.__u.includes('/api/') && this.__u.includes('/schedule')){
        try{ window.__c4a_captured.push({url:this.__u,data:JSON.parse(this.responseText)}); }catch(e){}
      }
    });
    return _send.apply(this, a);
  };
})();
"""


async def crawl_with_crawl4ai(school: dict, screenshot: bool = False) -> dict:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

    url = school.get("schedule_url")
    if not url:
        return _error(school, "no schedule_url")

    log.info("[%s] crawl4ai -> %s", school["id"], url)
    result = _blank(school)

    browser_cfg = BrowserConfig(
        headless=True, viewport_width=1920, viewport_height=1080
    )
    crawl_cfg = CrawlerRunConfig(
        page_timeout=60_000,
        js_code=INTERCEPTOR_JS,
        wait_for=(
            "js:() => {"
            "  if(window.__c4a_captured && window.__c4a_captured.length>0) return true;"
            "  return document.querySelectorAll('[class*=schedule],[class*=event],[class*=agenda]').length > 3;"
            "}"
        ),
        screenshot=screenshot,
        remove_overlay_elements=True,
    )

    try:
        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            cr = await crawler.arun(url=url, config=crawl_cfg)
            if not cr.success:
                result["error"] = "Crawl failed"
                return result

            log.info(
                "[%s] Page OK — HTML %s  MD %s",
                school["id"],
                f"{len(cr.html):,}",
                f"{len(cr.markdown):,}",
            )

            if screenshot and getattr(cr, "screenshot", None):
                import base64

                ss = Path(f"output/{school['id']}_screenshot.png")
                ss.parent.mkdir(parents=True, exist_ok=True)
                with open(ss, "wb") as f:
                    f.write(base64.b64decode(cr.screenshot))

            # crawl4ai's interceptor approach is less reliable for Fitssey.
            # Fall back to markdown parsing.
            result["events"] = parse_from_text(cr.markdown, school)
            result["raw_text"] = cr.markdown
            result["method"] = "crawl4ai_markdown"

            log.info("[%s] %d events", school["id"], len(result["events"]))

    except Exception as e:
        result["error"] = str(e)
        log.error("[%s] %s", school["id"], e, exc_info=True)

    return result


# ═══════════════════════════════════════════════════════════════════════════
# Parse intercepted Fitssey API JSON
# ═══════════════════════════════════════════════════════════════════════════


def parse_api_responses(captured: list[dict]) -> tuple[list[dict], dict]:
    """Parse schedule events from intercepted Fitssey API responses."""
    events = []
    filters = {}
    seen: set[str] = set()

    for entry in captured:
        data = entry.get("data", {})
        if not isinstance(data, dict):
            continue

        # Filters
        f = data.get("filters", {})
        if f:
            filters = {
                "classes": [
                    {"name": _name(c), "guid": c.get("guid")}
                    for c in f.get("classes", [])
                ],
                "members": [
                    {"name": m.get("qualifiedName", ""), "guid": m.get("guid")}
                    for m in f.get("members", [])
                ],
                "locations": [
                    {"name": _name(loc), "guid": loc.get("guid")}
                    for loc in f.get("locations", [])
                ],
            }

        # Events
        for day in data.get("schedule", []):
            date = day.get("date", "")
            for ev in day.get("scheduleEvents", []):
                if ev.get("isHidden"):
                    continue
                ref = ev.get("referenceId", "")
                if ref in seen:
                    continue
                seen.add(ref)

                meta = ev.get("scheduleMeta") or ev.get("meta") or {}
                cs = meta.get("classService") or {}
                member = ev.get("member") or {}
                room = (ev.get("room") or {}).get("location") or {}

                events.append(
                    {
                        "date": date,
                        "start_time": _time(ev.get("startsAt", "")),
                        "end_time": _time(ev.get("endsAt", "")),
                        "starts_at_iso": ev.get("startsAt"),
                        "ends_at_iso": ev.get("endsAt"),
                        "class_name": _name(cs),
                        "teacher": member.get("qualifiedName", ""),
                        "room": _name(room),
                        "total_capacity": ev.get("totalCapacity"),
                        "online_capacity": ev.get("onlineCapacity"),
                        "waiting_list_capacity": ev.get("waitingListCapacity"),
                        "is_free": ev.get("isFree", False),
                        "is_cancelled": ev.get("isCancelled", False),
                        "is_bookable_online": ev.get("isBookableOnline", True),
                        "color": ev.get("color"),
                        "reference_id": ref,
                    }
                )

    events.sort(key=lambda e: (e["date"], e["start_time"]))
    return events, filters


# ═══════════════════════════════════════════════════════════════════════════
# Fallback: parse from rendered page text
# ═══════════════════════════════════════════════════════════════════════════


def parse_from_text(text: str, school: dict) -> list[dict]:
    """Extract schedule events from rendered page text / markdown."""
    events = []
    time_re = re.compile(r"(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})")
    current_date = None
    buf: dict = {}

    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            if buf.get("class_name"):
                events.append(buf)
                buf = {}
            continue

        # Date detection
        iso = re.search(r"(\d{4})-(\d{2})-(\d{2})", line)
        dot = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{2,4})", line)
        if iso:
            current_date = iso.group(0)
            continue
        if dot:
            d, m, y = dot.groups()
            y = ("20" + y) if len(y) == 2 else y
            current_date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            continue

        # Polish weekday + inline date
        for wd in (
            "poniedziałek",
            "wtorek",
            "środa",
            "czwartek",
            "piątek",
            "sobota",
            "niedziela",
        ):
            if wd in line.lower():
                dm = re.search(r"(\d{1,2})[./](\d{1,2})", line)
                if dm:
                    d, m = dm.groups()
                    current_date = f"{datetime.now().year}-{m.zfill(2)}-{d.zfill(2)}"
                break

        # Time range -> new event
        tm = time_re.search(line)
        if tm:
            if buf.get("class_name"):
                events.append(buf)
            after = line[tm.end() :].strip(" -\u2013|:\u00b7\u2022")
            buf = {
                "date": current_date,
                "start_time": tm.group(1),
                "end_time": tm.group(2),
                "class_name": after,
                "teacher": "",
                "room": "",
            }
            continue

        # Continuation
        if buf:
            if not buf.get("class_name"):
                buf["class_name"] = line
            elif not buf.get("teacher"):
                buf["teacher"] = line
            elif not buf.get("room"):
                buf["room"] = line

    if buf.get("class_name"):
        events.append(buf)
    return events


# ═══════════════════════════════════════════════════════════════════════════
# Utilities
# ═══════════════════════════════════════════════════════════════════════════


def _name(obj: dict) -> str:
    """Handle Fitssey's deprecated locale-object name format."""
    n = obj.get("name", "")
    if isinstance(n, dict):
        for loc in ("pl_PL", "en_EN"):
            if loc in n:
                return n[loc].get("value", "")
        for v in n.values():
            if isinstance(v, dict) and "value" in v:
                return v["value"]
        return str(n)
    return n


def _time(iso: str) -> str:
    m = re.search(r"T(\d{2}:\d{2})", iso)
    return m.group(1) if m else ""


def _blank(school: dict) -> dict:
    return {
        "school_id": school["id"],
        "school_name": school.get("name", ""),
        "city": school.get("city", ""),
        "address": school.get("address", ""),
        "website": school.get("website", ""),
        "schedule_url": school.get("schedule_url", ""),
        "crawled_at": datetime.now().isoformat(),
        "method": None,
        "events": [],
        "filters": {},
        "raw_text": "",
        "error": None,
    }


def _error(school: dict, msg: str) -> dict:
    r = _blank(school)
    r["error"] = msg
    return r


# ═══════════════════════════════════════════════════════════════════════════
# Save results
# ═══════════════════════════════════════════════════════════════════════════


def save(results: list[dict], outdir: str = "output") -> Path:
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Combined JSON (no raw text)
    combined = out / f"schedules_{ts}.json"
    with open(combined, "w", encoding="utf-8") as f:
        json.dump(
            [{k: v for k, v in r.items() if k != "raw_text"} for r in results],
            f,
            ensure_ascii=False,
            indent=2,
        )

    for r in results:
        sid = r["school_id"]

        # Per-school JSON
        with open(out / f"{sid}_schedule.json", "w", encoding="utf-8") as f:
            json.dump(
                {k: v for k, v in r.items() if k != "raw_text"},
                f,
                ensure_ascii=False,
                indent=2,
            )

        # Raw text for debugging
        if r.get("raw_text"):
            with open(out / f"{sid}_raw.txt", "w", encoding="utf-8") as f:
                f.write(r["raw_text"])

        # CSV
        if r.get("events"):
            with open(
                out / f"{sid}_events.csv", "w", newline="", encoding="utf-8"
            ) as f:
                cols = [
                    "date",
                    "start_time",
                    "end_time",
                    "class_name",
                    "teacher",
                    "room",
                    "total_capacity",
                    "is_cancelled",
                ]
                w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
                w.writeheader()
                w.writerows(r["events"])

    log.info("Saved to %s", combined)
    return combined


# ═══════════════════════════════════════════════════════════════════════════
# Main runner
# ═══════════════════════════════════════════════════════════════════════════


async def run_scrape_schedules(
    school_id: Optional[str] = None,
    retry_empty: bool = False,
    needs_recrawl: bool = False,
    screenshot: bool = False,
    engine: str = "playwright",
    output: str = "output",
) -> None:
    """
    Scrape Fitssey schedules for schools in the database.

    Args:
        school_id:   Scrape only this school (must have a fitssey schedule_url)
        retry_empty: Only re-scrape schools that previously got 0 events
        screenshot:  Save debug screenshots
        engine:      "playwright" (default) or "crawl4ai"
        output:      Output directory for JSON/CSV files
    """
    conn = get_connection()
    try:
        schools = get_fitssey_schools(conn, school_id=school_id)
    finally:
        conn.close()

    if not schools:
        if school_id:
            log.error("School '%s' not found or has no Fitssey schedule URL", school_id)
        else:
            log.error("No schools with Fitssey schedule URLs found in database")
        return

    # If --retry-empty, filter to only schools with 0 events in latest output
    if retry_empty:
        outdir = Path(output)
        empty_ids = set()
        for s in schools:
            sfile = outdir / f"{s['id']}_schedule.json"
            if sfile.exists():
                try:
                    with open(sfile) as f:
                        data = json.load(f)
                    if not data.get("events"):
                        empty_ids.add(s["id"])
                except Exception:
                    empty_ids.add(s["id"])
            else:
                # Never scraped = treat as empty
                empty_ids.add(s["id"])

        schools = [s for s in schools if s["id"] in empty_ids]
        log.info("Retry-empty mode: %d schools to re-scrape", len(schools))

    # If --needs-recrawl, use data freshness to find schools needing schedule recrawl
    if needs_recrawl:
        from .data_freshness import DataField, get_schools_needing_recrawl

        conn = get_connection()
        try:
            fresh_schools = get_schools_needing_recrawl(
                conn, field=DataField.SCHEDULE, limit=0
            )
            # Filter to only Fitssey schools and merge with schedule_url
            fitssey_map = {s["id"]: s for s in schools}
            merged = []
            for fs in fresh_schools:
                if fs["id"] in fitssey_map:
                    merged.append(
                        {
                            "id": fs["id"],
                            "name": fs.get("name", fitssey_map[fs["id"]]["name"]),
                            "schedule_url": fitssey_map[fs["id"]]["schedule_url"],
                        }
                    )
            schools = merged
        finally:
            conn.close()
        log.info("Needs-recrawl mode: %d schools to scrape", len(schools))

    if not schools:
        log.info("Nothing to scrape.")
        return

    log.info("Scraping %d school(s) with engine=%s...", len(schools), engine)

    crawl_fn = crawl_with_playwright if engine == "playwright" else crawl_with_crawl4ai

    # Setup logging
    conn = get_connection()
    try:
        ensure_scrape_log_table(conn)
    finally:
        conn.close()

    results = []
    for school in schools:
        log.info("=" * 60)
        log.info("  %s", school["name"])
        log.info("=" * 60)

        start_time = time.monotonic()

        r = await crawl_fn(school, screenshot)
        results.append(r)

        # Log the scrape
        duration_ms = int((time.monotonic() - start_time) * 1000)
        event_count = len(r.get("events", []))

        conn = get_connection()
        try:
            if r.get("error"):
                log_scrape(
                    conn,
                    school["id"],
                    TASK_SCRAPE_SCHEDULE,
                    STATUS_ERROR,
                    message=r["error"],
                    duration_ms=duration_ms,
                )
            elif event_count == 0:
                log_scrape(
                    conn,
                    school["id"],
                    TASK_SCRAPE_SCHEDULE,
                    STATUS_NO_DATA,
                    message="No events found",
                    duration_ms=duration_ms,
                )
            else:
                log_scrape(
                    conn,
                    school["id"],
                    TASK_SCRAPE_SCHEDULE,
                    STATUS_SUCCESS,
                    message=f"{event_count} events via {r.get('method', '?')}",
                    fields_updated=f"events={event_count}",
                    duration_ms=duration_ms,
                )
        finally:
            conn.close()

        if len(schools) > 1:
            await asyncio.sleep(2)

    out = save(results, output)

    # Print summary
    print(f"\n{'=' * 60}")
    print("  RESULTS")
    print(f"{'=' * 60}")
    total = 0
    ok_count = 0
    empty_count = 0
    for r in results:
        n = len(r.get("events", []))
        total += n
        if n > 0:
            ok_count += 1
        else:
            empty_count += 1
        status = f"{n} events" if not r.get("error") else f"ERR: {r['error'][:50]}"
        print(f"  {r['school_id']}")
        print(f"    {status}  |  {r.get('method', '?')}")
        for ev in r.get("events", [])[:3]:
            # Use ASCII-safe output to avoid Windows console encoding issues
            class_name = ev.get("class_name", "")[:30]
            teacher = ev.get("teacher", "")[:20]
            print(
                f"      {ev['date']} {ev['start_time']}-{ev['end_time']}  "
                f"{class_name}  ({teacher})"
            )
        if n > 3:
            print(f"      ... and {n - 3} more")

    print(f"\n  Total: {total} events from {ok_count} schools ({empty_count} empty)")
    print(f"  Output: {out}\n")
