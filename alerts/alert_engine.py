#!/usr/bin/env python3
"""
alerts/alert_engine.py
-----------------------
Threshold-based alert system for Milkyway AI.
Fires alerts when production metrics deviate from normal.
"""

from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import List, Callable, Optional
from collections import deque


@dataclass
class Alert:
    severity: str        # "info" | "warning" | "critical"
    message: str
    timestamp: float = field(default_factory=time.time)
    resolved: bool = False

    def to_dict(self) -> dict:
        return {
            "severity": self.severity,
            "message": self.message,
            "timestamp": self.timestamp,
            "resolved": self.resolved,
        }


class AlertEngine:
    """
    Monitors real-time detection metrics and fires alerts.

    Configurable thresholds:
    - low_count_threshold  : Alert if count drops below this for N frames
    - gap_frames           : Alert if zero detections for N consecutive frames
    - high_count_threshold : Alert if count spikes above this
    """

    def __init__(
        self,
        low_count_threshold: int   = 1,
        gap_frames: int            = 30,
        high_count_threshold: int  = 20,
        history_size: int          = 60,
    ):
        self.low_count_threshold  = low_count_threshold
        self.gap_frames           = gap_frames
        self.high_count_threshold = high_count_threshold
        self._count_history: deque = deque(maxlen=history_size)
        self._zero_streak: int     = 0
        self._active_alerts: List[Alert] = []
        self._callbacks: List[Callable[[Alert], None]] = []

    def on_alert(self, callback: Callable[[Alert], None]):
        """Register a callback to be called when a new alert fires."""
        self._callbacks.append(callback)

    def update(self, count: int) -> List[Alert]:
        """Feed new frame count. Returns list of new alerts."""
        self._count_history.append(count)
        new_alerts = []

        # Gap detection: no bottles for N consecutive frames
        if count == 0:
            self._zero_streak += 1
        else:
            self._zero_streak = 0

        if self._zero_streak == self.gap_frames:
            alert = Alert(
                severity="warning",
                message=f"⚠️  No bottles detected for {self.gap_frames} consecutive frames. Possible gap on conveyor.",
            )
            new_alerts.append(alert)
            self._fire(alert)

        # High count spike
        if count > self.high_count_threshold:
            alert = Alert(
                severity="warning",
                message=f"⚠️  Unusually high bottle count: {count} bottles in a single frame.",
            )
            new_alerts.append(alert)
            self._fire(alert)

        self._active_alerts.extend(new_alerts)
        return new_alerts

    def _fire(self, alert: Alert):
        for cb in self._callbacks:
            try:
                cb(alert)
            except Exception:
                pass

    def get_active_alerts(self) -> List[Alert]:
        return [a for a in self._active_alerts if not a.resolved]

    def resolve_all(self):
        for a in self._active_alerts:
            a.resolved = True

    def get_stats(self) -> dict:
        history = list(self._count_history)
        return {
            "zero_streak": self._zero_streak,
            "active_alert_count": len(self.get_active_alerts()),
            "avg_count_last_60": round(sum(history) / len(history), 2) if history else 0,
            "max_count_last_60": max(history) if history else 0,
        }


# Singleton instance
_engine: Optional[AlertEngine] = None


def get_alert_engine() -> AlertEngine:
    global _engine
    if _engine is None:
        _engine = AlertEngine()
    return _engine
