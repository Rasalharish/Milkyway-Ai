#!/usr/bin/env python3
"""
storage/database.py
--------------------
SQLite data layer for Milkyway AI.
Stores detection events, hourly aggregates, and alerts.
"""

from __future__ import annotations
import sqlite3
import time
import json
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "Milkyway.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with db_cursor() as cur:
        cur.executescript("""
            CREATE TABLE IF NOT EXISTS detection_events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   REAL    NOT NULL,
                count       INTEGER NOT NULL,
                inference_ms REAL   NOT NULL,
                source      TEXT    NOT NULL DEFAULT 'camera',
                extra       TEXT
            );

            CREATE TABLE IF NOT EXISTS production_counts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   REAL    NOT NULL,
                track_id    INTEGER NOT NULL,
                crossed_at  REAL    NOT NULL,
                shift       TEXT
            );

            CREATE TABLE IF NOT EXISTS hourly_stats (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                hour_bucket TEXT    NOT NULL UNIQUE,
                total_count INTEGER NOT NULL DEFAULT 0,
                avg_inference_ms REAL,
                peak_count  INTEGER NOT NULL DEFAULT 0,
                frame_count INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   REAL    NOT NULL,
                severity    TEXT    NOT NULL,
                message     TEXT    NOT NULL,
                resolved    INTEGER NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_events_ts ON detection_events(timestamp);
            CREATE INDEX IF NOT EXISTS idx_counts_ts ON production_counts(crossed_at);
        """)
    print("[OK]  Database initialised")


def log_detection_event(count: int, inference_ms: float, source: str = "camera", extra: dict = None):
    ts = time.time()
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO detection_events (timestamp, count, inference_ms, source, extra) VALUES (?, ?, ?, ?, ?)",
            (ts, count, inference_ms, source, json.dumps(extra) if extra else None)
        )
    _update_hourly(ts, count, inference_ms)


def log_production_count(track_id: int, crossed_at: float):
    hour = datetime.fromtimestamp(crossed_at).hour
    shift = "Morning" if 6 <= hour < 14 else "Afternoon" if 14 <= hour < 22 else "Night"
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO production_counts (timestamp, track_id, crossed_at, shift) VALUES (?, ?, ?, ?)",
            (time.time(), track_id, crossed_at, shift)
        )


def _update_hourly(ts: float, count: int, inference_ms: float):
    bucket = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:00")
    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO hourly_stats (hour_bucket, total_count, avg_inference_ms, peak_count, frame_count)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(hour_bucket) DO UPDATE SET
                total_count = total_count + ?,
                avg_inference_ms = (avg_inference_ms * frame_count + ?) / (frame_count + 1),
                peak_count = MAX(peak_count, ?),
                frame_count = frame_count + 1
        """, (bucket, count, inference_ms, count, count, inference_ms, count))


def log_alert(severity: str, message: str):
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO alerts (timestamp, severity, message) VALUES (?, ?, ?)",
            (time.time(), severity, message)
        )


def get_recent_events(limit: int = 100) -> list:
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM detection_events ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in cur.fetchall()]


def get_hourly_stats(days: int = 7) -> list:
    cutoff = time.time() - days * 86400
    cutoff_str = datetime.fromtimestamp(cutoff).strftime("%Y-%m-%d %H:00")
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM hourly_stats WHERE hour_bucket >= ? ORDER BY hour_bucket",
            (cutoff_str,)
        )
        return [dict(r) for r in cur.fetchall()]


def get_production_today() -> dict:
    start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    with db_cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) as total FROM production_counts WHERE crossed_at >= ?",
            (start,)
        )
        total = cur.fetchone()["total"]
        cur.execute(
            "SELECT shift, COUNT(*) as cnt FROM production_counts WHERE crossed_at >= ? GROUP BY shift",
            (start,)
        )
        by_shift = {row["shift"]: row["cnt"] for row in cur.fetchall()}
    return {"total": total, "by_shift": by_shift}


def get_recent_alerts(limit: int = 20) -> list:
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in cur.fetchall()]


def get_dashboard_summary() -> dict:
    today = get_production_today()
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) as total FROM detection_events")
        total_frames = cur.fetchone()["total"]
        cur.execute("SELECT AVG(inference_ms) as avg FROM detection_events")
        avg_ms = cur.fetchone()["avg"] or 0.0
        cur.execute("SELECT MAX(count) as peak FROM detection_events")
        peak = cur.fetchone()["peak"] or 0
    return {
        "bottles_today": today["total"],
        "by_shift": today["by_shift"],
        "total_frames_processed": total_frames,
        "avg_inference_ms": round(avg_ms, 2),
        "peak_count_per_frame": peak,
    }
