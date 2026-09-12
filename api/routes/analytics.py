"""
api/routes/analytics.py
-----------------------
Analytics endpoints for Milkyway AI.
"""

from __future__ import annotations
from fastapi import APIRouter, Query
from storage.database import (
    get_recent_events,
    get_hourly_stats,
    get_production_today,
    get_dashboard_summary,
    get_recent_alerts,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
def dashboard_summary():
    """Overall dashboard summary metrics."""
    summary = get_dashboard_summary()
    from alerts.alert_engine import get_alert_engine
    summary["active_alerts"] = len(get_alert_engine().get_active_alerts())
    return summary


@router.get("/today")
def production_today():
    """Today's production counts by shift."""
    return get_production_today()


@router.get("/hourly")
def hourly_stats(days: int = Query(default=7, ge=1, le=30)):
    """Hourly production stats for the last N days."""
    return get_hourly_stats(days=days)


@router.get("/events")
def recent_events(limit: int = Query(default=50, ge=1, le=500)):
    """Recent detection events (per-frame count log)."""
    return get_recent_events(limit=limit)


@router.get("/alerts")
def recent_alerts(limit: int = Query(default=20, ge=1, le=100)):
    """Recent system alerts."""
    return get_recent_alerts(limit=limit)


@router.get("/model-info")
def model_info():
    """Return model metadata and training performance metrics."""
    return {
        "model": "YOLOv8n",
        "variant": "nano",
        "class_names": ["milk_bottle"],
        "num_classes": 1,
        "parameters": "3,011,043",
        "gflops": 8.1,
        "input_size": "640×640",
        "training": {
            "epochs": 100,
            "dataset_images": 1073,
            "train_val_test": "858 / 107 / 108",
            "device": "Apple M5 (MPS)",
            "training_time": "~2h 25m",
        },
        "metrics": {
            "mAP_50": 0.984,
            "mAP_50_95": 0.641,
            "precision": 0.939,
            "recall": 0.970,
            "inference_ms": 35.9,
        },
    }
