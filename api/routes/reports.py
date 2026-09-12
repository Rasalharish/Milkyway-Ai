"""
api/routes/reports.py
---------------------
Report export endpoints for Milkyway AI.
"""

from __future__ import annotations
import csv
import io
import json
import time
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from storage.database import get_recent_events, get_hourly_stats, get_production_today

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/export/csv")
def export_csv(days: int = 7):
    """Export detection events as CSV."""
    events = get_recent_events(limit=10000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "timestamp", "count", "inference_ms", "source"])
    writer.writeheader()
    for e in events:
        e_copy = {k: e[k] for k in ["id", "timestamp", "count", "inference_ms", "source"] if k in e}
        # Convert timestamp to readable
        e_copy["timestamp"] = datetime.fromtimestamp(e_copy["timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
        writer.writerow(e_copy)
    output.seek(0)
    filename = f"Milkyway_events_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/json")
def export_json(days: int = 7):
    """Export hourly stats as JSON."""
    data = {
        "exported_at": datetime.now().isoformat(),
        "production_today": get_production_today(),
        "hourly_stats": get_hourly_stats(days=days),
    }
    output = json.dumps(data, indent=2)
    filename = f"Milkyway_report_{datetime.now().strftime('%Y%m%d')}.json"
    return StreamingResponse(
        iter([output]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/summary")
def report_summary():
    """Quick summary report for the dashboard."""
    stats = get_hourly_stats(days=1)
    today = get_production_today()
    return {
        "generated_at": datetime.now().isoformat(),
        "bottles_today": today["total"],
        "by_shift": today["by_shift"],
        "hourly_breakdown": stats,
    }
