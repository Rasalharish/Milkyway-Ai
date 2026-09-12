#!/usr/bin/env python3
"""
tests/test_api.py
-----------------
Integration tests for Milkyway AI FastAPI endpoints.
Requires the server to NOT be running (uses TestClient).
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from api.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "Milkyway" in data["service"]


def test_analytics_summary(client):
    res = client.get("/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert "bottles_today" in data


def test_analytics_today(client):
    res = client.get("/analytics/today")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "by_shift" in data


def test_analytics_hourly(client):
    res = client.get("/analytics/hourly?days=1")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_model_info(client):
    res = client.get("/analytics/model-info")
    assert res.status_code == 200
    data = res.json()
    assert data["model"] == "YOLOv8n"
    assert "metrics" in data
    assert data["metrics"]["mAP_50"] == pytest.approx(0.984)


def test_detect_image_no_file(client):
    """Missing file should return 422."""
    res = client.post("/detect/image")
    assert res.status_code == 422


def test_report_summary(client):
    res = client.get("/reports/summary")
    assert res.status_code == 200
    data = res.json()
    assert "bottles_today" in data


def test_report_csv(client):
    res = client.get("/reports/export/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")


def test_report_json(client):
    res = client.get("/reports/export/json")
    assert res.status_code == 200
    data = res.json()
    assert "production_today" in data


def test_dashboard_redirect(client):
    """Root should serve the dashboard HTML."""
    res = client.get("/")
    # Either serves HTML or JSON message (if dashboard missing)
    assert res.status_code == 200
