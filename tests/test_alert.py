#!/usr/bin/env python3
"""
tests/test_alert.py
-------------------
Unit tests for the AlertEngine.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from alerts.alert_engine import AlertEngine


def test_no_alert_during_normal_operation():
    """Normal bottle counts should not trigger any alert."""
    engine = AlertEngine(low_count_threshold=1, gap_frames=30, high_count_threshold=20)
    for _ in range(50):
        alerts = engine.update(3)
        assert len(alerts) == 0


def test_gap_alert_fires_after_n_consecutive_zero_frames():
    """A gap alert must fire after exactly gap_frames consecutive zero-count frames."""
    engine = AlertEngine(gap_frames=10)

    # 9 frames of zero — no alert yet
    for i in range(9):
        alerts = engine.update(0)
        assert len(alerts) == 0, f"Alert fired too early on frame {i+1}"

    # 10th frame of zero — alert fires
    alerts = engine.update(0)
    assert len(alerts) == 1
    assert alerts[0].severity == "warning"
    assert "gap" in alerts[0].message.lower() or "no bottles" in alerts[0].message.lower()


def test_gap_alert_resets_on_detection():
    """Gap streak resets when a bottle is detected again."""
    engine = AlertEngine(gap_frames=5)
    for _ in range(4):
        engine.update(0)

    engine.update(2)  # streak resets

    # Another 4 zeros should not re-fire the alert (streak < 5)
    for i in range(4):
        alerts = engine.update(0)
        assert len(alerts) == 0


def test_high_count_alert_fires():
    """An unusually high bottle count should trigger a warning alert."""
    engine = AlertEngine(high_count_threshold=10)
    alerts = engine.update(11)
    assert len(alerts) == 1
    assert alerts[0].severity == "warning"
    assert "high" in alerts[0].message.lower() or "unusual" in alerts[0].message.lower()


def test_high_count_not_triggered_at_threshold():
    """Count exactly at the threshold must not trigger the alert."""
    engine = AlertEngine(high_count_threshold=10)
    alerts = engine.update(10)
    assert len(alerts) == 0


def test_get_active_alerts_excludes_resolved():
    """get_active_alerts() must not return resolved alerts."""
    engine = AlertEngine(gap_frames=1)
    engine.update(0)  # fire alert immediately (gap_frames=1)
    assert len(engine.get_active_alerts()) == 1

    engine.resolve_all()
    assert len(engine.get_active_alerts()) == 0


def test_resolve_all_marks_alerts_resolved():
    """resolve_all() must mark every active alert as resolved."""
    engine = AlertEngine(gap_frames=1)
    engine.update(0)
    engine.resolve_all()
    for alert in engine._active_alerts:
        assert alert.resolved is True


def test_get_stats_structure():
    """get_stats() returns the expected dictionary structure."""
    engine = AlertEngine()
    engine.update(3)
    engine.update(4)
    stats = engine.get_stats()
    assert "zero_streak" in stats
    assert "active_alert_count" in stats
    assert "avg_count_last_60" in stats
    assert "max_count_last_60" in stats


def test_alert_to_dict_keys():
    """Alert.to_dict() returns expected keys."""
    from alerts.alert_engine import Alert
    a = Alert(severity="warning", message="test alert")
    d = a.to_dict()
    assert "severity" in d
    assert "message" in d
    assert "timestamp" in d
    assert "resolved" in d
    assert d["severity"] == "warning"
