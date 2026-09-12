#!/usr/bin/env python3
"""
core/tracker.py
---------------
Centroid-based bottle tracker for Milkyway AI.
Assigns persistent IDs to detected bottles across frames.
"""

from __future__ import annotations
import math
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
from core.detector import Detection


@dataclass
class TrackedBottle:
    """A tracked bottle with persistent ID."""
    track_id: int
    cx: int
    cy: int
    disappeared: int = 0
    path: List[Tuple[int, int]] = field(default_factory=list)

    def update(self, cx: int, cy: int):
        self.cx = cx
        self.cy = cy
        self.disappeared = 0
        self.path.append((cx, cy))
        if len(self.path) > 60:
            self.path.pop(0)


class CentroidTracker:
    """
    Simple centroid-based multi-object tracker.
    Matches detections to existing tracks using Euclidean distance.
    """

    def __init__(self, max_disappeared: int = 30, max_distance: int = 200):
        """
        Args:
            max_disappeared: frames a track can go unmatched before being removed.
            max_distance: max pixel distance (centroid-to-centroid) to match a
                          detection to an existing track. 200px covers realistic
                          conveyor-belt frame-to-frame displacement at 720p.
        """
        self.next_id       = 0
        self.objects: Dict[int, TrackedBottle] = OrderedDict()
        self.max_disappeared = max_disappeared
        self.max_distance    = max_distance

    def register(self, cx: int, cy: int) -> int:
        track_id = self.next_id
        self.objects[track_id] = TrackedBottle(track_id=track_id, cx=cx, cy=cy)
        self.objects[track_id].path.append((cx, cy))
        self.next_id += 1
        return track_id

    def deregister(self, track_id: int):
        del self.objects[track_id]

    def update(self, detections: List[Detection]) -> Dict[int, TrackedBottle]:
        """Update tracker with new detections. Returns current tracked objects."""
        if not detections:
            for track_id in list(self.objects.keys()):
                self.objects[track_id].disappeared += 1
                if self.objects[track_id].disappeared > self.max_disappeared:
                    self.deregister(track_id)
            return self.objects

        input_centroids = [(d.cx, d.cy) for d in detections]

        if not self.objects:
            for cx, cy in input_centroids:
                self.register(cx, cy)
            return self.objects

        object_ids      = list(self.objects.keys())
        object_centroids= [(o.cx, o.cy) for o in self.objects.values()]

        # Distance matrix
        D = [[
            math.hypot(oc[0] - ic[0], oc[1] - ic[1])
            for ic in input_centroids
        ] for oc in object_centroids]

        rows = sorted(range(len(D)), key=lambda r: min(D[r]))
        used_rows = set()
        used_cols = set()
        matched_rows = []

        for row in rows:
            col = min(range(len(D[row])), key=lambda c: D[row][c])
            if row in used_rows or col in used_cols:
                continue
            if D[row][col] > self.max_distance:
                continue
            track_id = object_ids[row]
            cx, cy   = input_centroids[col]
            self.objects[track_id].update(cx, cy)
            used_rows.add(row)
            used_cols.add(col)
            matched_rows.append(row)

        # Unmatched existing tracks
        unmatched_rows = set(range(len(object_centroids))) - used_rows
        for row in unmatched_rows:
            track_id = object_ids[row]
            self.objects[track_id].disappeared += 1
            if self.objects[track_id].disappeared > self.max_disappeared:
                self.deregister(track_id)

        # Unmatched new detections
        unmatched_cols = set(range(len(input_centroids))) - used_cols
        for col in unmatched_cols:
            cx, cy = input_centroids[col]
            self.register(cx, cy)

        return self.objects

    def reset(self):
        self.objects.clear()
        self.next_id = 0
