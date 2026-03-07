"""
Description normalizer — generates editorial descriptions from raw scraped text.

Takes `description_raw` (verbatim studio text) and produces `description`
(clean, consistent editorial summary) using an LLM.

Usage (via CLI):
    yoga-scraper normalize
    yoga-scraper normalize --school yoga-republic
    yoga-scraper normalize --force
"""

import asyncio
import logging
import os
from typing import Optional

from openai import AsyncOpenAI

from .db import get_connection, get_schools_for_normalization, update_description
from .tracking import ensure_scrape_log_table, track_scrape, TASK_NORMALIZE

log = logging.getLogger("yoga-scraper.normalize")

NORMALIZE_INSTRUCTION = (
    "You are writing a short editorial description for a yoga/fitness studio listing on szkolyjogi.pl.\n\n"
    "INPUT: The studio's own description text (in Polish).\n\n"
    "OUTPUT: A clean, professional 2-4 sentence summary in Polish that:\n"
    "- Describes what the studio offers and what makes it unique\n"
    "- Mentions key styles/classes if the original text mentions them\n"
    "- Uses third person ('Studio oferuje...' not 'Oferujemy...')\n"
    "- Is factual — do NOT invent information not in the source text\n"
    "- Keeps proper nouns and brand names as-is\n\n"
    "Return ONLY the description text, no JSON, no markdown, no quotes."
)


async def normalize_description(raw: str) -> Optional[str]:
    """Generate an editorial description from raw studio text."""
    if not raw or len(raw.strip()) < 30:
        return None

    model = os.getenv("LLM_MODEL_NORMALIZE", "gpt-4o-mini")
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    try:
        response = await client.chat.completions.create(
            model=model,
            temperature=0.3,
            max_tokens=500,
            messages=[
                {"role": "system", "content": NORMALIZE_INSTRUCTION},
                {"role": "user", "content": raw[:8000]},
            ],
        )
        desc = response.choices[0].message.content.strip()
        # Remove surrounding quotes if LLM added them
        if desc.startswith('"') and desc.endswith('"'):
            desc = desc[1:-1]
        return desc if len(desc) > 20 else None
    except Exception as e:
        log.warning("Normalize LLM failed: %s", e)
        return None


async def run_normalize(
    school_id: Optional[str] = None,
    city: Optional[str] = None,
    force: bool = False,
    dry_run: bool = False,
    limit: int = 0,
):
    """Normalize descriptions for schools that have raw text but no editorial description."""
    from dotenv import load_dotenv
    load_dotenv()

    conn = get_connection()
    ensure_scrape_log_table(conn)

    schools = get_schools_for_normalization(conn, school_id=school_id, city=city, force=force)

    # Only process schools that have raw descriptions
    schools = [s for s in schools if s.get("description_raw") and s["description_raw"].strip()]

    if limit > 0:
        schools = schools[:limit]

    if not schools:
        log.info("No schools need normalization. Use --force to re-normalize.")
        conn.close()
        return

    log.info("Normalizing %d school(s)%s", len(schools), " (dry run)" if dry_run else "")

    ok, errors = 0, 0
    for school in schools:
        with track_scrape(conn, school["id"], TASK_NORMALIZE) as tracker:
            try:
                desc = await normalize_description(school["description_raw"])
                if desc:
                    log.info("  %s: %d chars -> %d chars", school["id"],
                             len(school["description_raw"]), len(desc))
                    if not dry_run:
                        update_description(conn, school["id"], desc)
                    tracker.set_success(f"{len(desc)} chars", fields="description")
                    ok += 1
                else:
                    tracker.set_no_data("LLM returned no description")
                    log.info("  %s: no result", school["id"])
            except Exception as e:
                tracker.set_error(str(e))
                log.error("  %s: %s", school["id"], e)
                errors += 1

        await asyncio.sleep(0.3)

    log.info("Done: %d normalized, %d errors out of %d schools", ok, errors, len(schools))
    conn.close()
