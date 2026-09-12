#!/usr/bin/env python3
"""
api/main.py
-----------
FastAPI application entry point for Milkyway AI.
Serves the REST API + WebSocket stream + static dashboard.
"""

from __future__ import annotations
import sys
import os
from pathlib import Path

# Ensure project root is in path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from storage.database import init_db
from core.detector import MilkBottleDetector
from demo.demo_mode import DemoProducer
from alerts.alert_engine import AlertEngine, get_alert_engine

# ── Globals ────────────────────────────────────────────────────────────────────
_detector: MilkBottleDetector | None = None
_demo_producer: DemoProducer | None  = None


def get_detector() -> MilkBottleDetector:
    global _detector
    if _detector is None:
        _detector = MilkBottleDetector(conf_threshold=0.40, device="cpu")
        _detector.load()
    return _detector


def get_demo_producer() -> DemoProducer:
    global _demo_producer
    if _demo_producer is None or not _demo_producer._running:
        _demo_producer = DemoProducer(fps=10)
    return _demo_producer


def get_alert_engine_instance() -> AlertEngine:
    return get_alert_engine()


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB + load model. Shutdown: cleanup."""
    print("\n" + "=" * 60)
    print("  Milkyway AI  --  Starting up")
    print("=" * 60)
    init_db()
    # Pre-load detector in background to avoid cold start on first request
    try:
        import threading
        t = threading.Thread(target=get_detector, daemon=True)
        t.start()
        print("  [OK]  Model loading in background...")
    except Exception as e:
        print(f"  [WARN]  Model pre-load failed: {e}")

    # Seed some demo data so dashboard looks live on first visit
    _seed_demo_data()

    print("  [OK]  Milkyway AI ready")
    print("  Dashboard: http://localhost:8000")
    print("  API docs:  http://localhost:8000/docs")
    print("=" * 60 + "\n")
    yield
    print("\n  Milkyway AI shutting down...")


def _seed_demo_data():
    """Pre-populate the DB with 24h of synthetic history so charts have data."""
    import time, random
    from storage.database import log_detection_event, log_production_count

    from storage.database import get_connection
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM detection_events")
        count = cur.fetchone()[0]
        conn.close()
    except Exception:
        count = 0

    if count > 0:
        return  # already seeded

    now = time.time()
    bottle_id = 0
    for hour_offset in range(24):
        t = now - (23 - hour_offset) * 3600
        for frame in range(200):
            ts = t + frame * 18
            c  = random.choices([0, 1, 2, 3, 4, 5], weights=[2, 5, 15, 20, 10, 3])[0]
            if frame % 60 < 8:
                c = 0  # simulate conveyor gap
            log_detection_event(count=c, inference_ms=random.uniform(28, 42), source="demo")
            if c > 0:
                for _ in range(c):
                    log_production_count(bottle_id, ts)
                    bottle_id += 1


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Milkyway AI",
    description="AI-Powered Dairy Production Monitoring System — YOLOv8 Milk Bottle Detection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
from api.routes.detection import router as detection_router
from api.routes.stream    import router as stream_router
from api.routes.analytics import router as analytics_router
from api.routes.reports   import router as reports_router

app.include_router(detection_router)
app.include_router(stream_router)
app.include_router(analytics_router)
app.include_router(reports_router)

# ── Static Dashboard ───────────────────────────────────────────────────────────
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"
if DASHBOARD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(DASHBOARD_DIR)), name="static")

ASSETS_DIR = PROJECT_ROOT / "assets"
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


@app.get("/", include_in_schema=False)
async def serve_dashboard():
    index = DASHBOARD_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"message": "Milkyway AI API running. Dashboard not found."}


@app.get("/health")
def health():
    return {"status": "ok", "service": "Milkyway AI", "version": "1.0.0"}
