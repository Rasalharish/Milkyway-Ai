#!/usr/bin/env python3
"""
core/counter.py
---------------
Virtual line-crossing counter for Milkyway AI.
Counts bottles as they cross a configurable virtual line.
"""

from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
from core.tracker import TrackedBottle


@dataclass
class CountEvent:
    track_id: int
    crossed_at: float = field(default_factory=time.time)
    cx: int = 0
    cy: int = 0

    def to_dict(self) -> dict:
        return {
            "track_id": self.track_id,
            "crossed_at": self.crossed_at,
            "position": [self.cx, self.cy],
        }


class LineCounter:
    """
    Counts bottles crossing a virtual horizontal line.

    The line is defined as y = line_y (pixels from top).
    A bottle is counted once as it crosses the line top→bottom (or bottom→top).
    """

    def __init__(self, line_y: int = None, frame_height: int = 720):
        # Default: 60% down the frame
        self.line_y     = line_y if line_y is not None else int(frame_height * 0.6)
        self.total_count = 0
        self.counted_ids: Dict[int, str] = {}   # track_id → "up" | "down"
        self.events: List[CountEvent] = []

    def update(self, tracked_objects: Dict[int, TrackedBottle]) -> List[CountEvent]:
        """
        Check each tracked object for line crossing.
        Returns list of new crossing events.
        """
        new_events = []
        for track_id, obj in tracked_objects.items():
            if len(obj.path) < 2:
                continue
            prev_y = obj.path[-2][1]
            curr_y = obj.path[-1][1]

            if track_id in self.counted_ids:
                continue   # already counted

            # Top → Bottom crossing
            if prev_y < self.line_y <= curr_y:
                event = CountEvent(
                    track_id=track_id,
                    cx=obj.cx, cy=obj.cy,
                )
                self.counted_ids[track_id] = "down"
                self.total_count += 1
                self.events.append(event)
                new_events.append(event)

            # Bottom → Top crossing
            elif prev_y > self.line_y >= curr_y:
                event = CountEvent(
                    track_id=track_id,
                    cx=obj.cx, cy=obj.cy,
                )
                self.counted_ids[track_id] = "up"
                self.total_count += 1
                self.events.append(event)
                new_events.append(event)

        return new_events

    def draw_line(self, frame, color=(0, 255, 255), thickness=2):
        """Draw the counting line on a frame."""
        import cv2
        h, w = frame.shape[:2]
        cv2.line(frame, (0, self.line_y), (w, self.line_y), color, thickness)
        cv2.putText(
            frame, f"COUNT LINE  [{self.total_count} crossed]",
            (10, self.line_y - 8),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA
        )

    def reset(self):
        self.total_count = 0
        self.counted_ids.clear()
        self.events.clear()

    def get_stats(self) -> dict:
        return {
            "total_count": self.total_count,
            "line_y": self.line_y,
            "event_count": len(self.events),
        }
