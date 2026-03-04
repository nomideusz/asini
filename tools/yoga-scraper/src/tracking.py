"""
Scrape tracking — logs every scrape attempt with status, duration, and what changed.

Provides:
- log_scrape()     — record a scrape attempt
- track_scrape()   — context manager that auto-times and logs
"""

import time
import logging
from contextlib import contextmanager
from typing import Optional

import libsql_client

log = logging.getLogger("yoga-scraper.tracking")

# ── Task names ────────────────────────────────────────────────────────────────

TASK_SEED = "seed"
TASK_DISCOVER = "discover_urls"
TASK_SCRAPE_PRICING = "scrape_pricing"
TASK_SCRAPE_ABOUT = "scrape_about"
TASK_SCRAPE_SCHEDULE = "scrape_schedule"
TASK_NORMALIZE = "normalize"

# ── Status values ─────────────────────────────────────────────────────────────

STATUS_SUCCESS = "success"
STATUS_ERROR = "error"
STATUS_SKIPPED = "skipped"
STATUS_NO_DATA = "no_data"


# ── Table bootstrap ──────────────────────────────────────────────────────────


def ensure_scrape_log_table(conn: libsql_client.ClientSync) -> None:
    """Create the scrape_log table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scrape_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            school_id       TEXT NOT NULL,
            task            TEXT NOT NULL,
            status          TEXT NOT NULL,
            message         TEXT,
            fields_updated  TEXT,
            duration_ms     INTEGER,
            created_at      TEXT DEFAULT (CURRENT_TIMESTAMP)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_scrape_log_school
        ON scrape_log(school_id, task, created_at)
    """)


# ── Logging ──────────────────────────────────────────────────────────────────


def log_scrape(
    conn: libsql_client.ClientSync,
    school_id: str,
    task: str,
    status: str,
    message: Optional[str] = None,
    fields_updated: Optional[str] = None,
    duration_ms: Optional[int] = None,
) -> None:
    """Record a scrape attempt in the log."""
    conn.execute("""
        INSERT INTO scrape_log (school_id, task, status, message, fields_updated, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, [school_id, task, status, message, fields_updated, duration_ms])


@contextmanager
def track_scrape(conn: libsql_client.ClientSync, school_id: str, task: str):
    """
    Context manager that times a scrape operation and logs the result.

    Usage:
        with track_scrape(conn, "yoga-republic", "scrape_pricing") as tracker:
            # ... do work ...
            tracker.set_success("price=199", fields="price,trial_price")
    """
    tracker = _ScrapeTracker(conn, school_id, task)
    try:
        yield tracker
    except Exception as e:
        tracker.set_error(str(e)[:500])
        raise
    finally:
        tracker._commit()


class _ScrapeTracker:
    def __init__(self, conn: libsql_client.ClientSync, school_id: str, task: str):
        self.conn = conn
        self.school_id = school_id
        self.task = task
        self.start = time.monotonic()
        self.status = STATUS_SKIPPED
        self.message: Optional[str] = None
        self.fields_updated: Optional[str] = None

    def set_success(self, message: Optional[str] = None, fields: Optional[str] = None):
        self.status = STATUS_SUCCESS
        self.message = message
        self.fields_updated = fields

    def set_no_data(self, message: Optional[str] = None):
        self.status = STATUS_NO_DATA
        self.message = message

    def set_error(self, message: str):
        self.status = STATUS_ERROR
        self.message = message

    def set_skipped(self, message: Optional[str] = None):
        self.status = STATUS_SKIPPED
        self.message = message

    def _commit(self):
        duration_ms = int((time.monotonic() - self.start) * 1000)
        log_scrape(
            self.conn, self.school_id, self.task,
            self.status, self.message, self.fields_updated, duration_ms,
        )
