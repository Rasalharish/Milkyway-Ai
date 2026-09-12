#!/usr/bin/env python3
"""
tests/test_tracker.py
---------------------
Unit tests for the centroid tracker.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_tracker_register():
    """New detections are registered as tracks."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker()
    dets = [Detection(x1=0, y1=0, x2=50, y2=100, confidence=0.9)]
    objs = tracker.update(dets)
    assert len(objs) == 1


def test_tracker_persistence():
    """Same object gets same track ID across frames."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker()
    det1 = [Detection(x1=100, y1=100, x2=150, y2=200, confidence=0.9)]
    objs1 = tracker.update(det1)
    tid1 = list(objs1.keys())[0]

    det2 = [Detection(x1=105, y1=105, x2=155, y2=205, confidence=0.9)]
    objs2 = tracker.update(det2)
    tid2 = list(objs2.keys())[0]

    assert tid1 == tid2, "Same bottle should keep same track ID"


def test_tracker_disappear():
    """Tracks disappear after max_disappeared frames."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker(max_disappeared=3)
    dets = [Detection(x1=0, y1=0, x2=50, y2=100, confidence=0.9)]
    tracker.update(dets)

    # No detections for 4 frames
    for _ in range(4):
        tracker.update([])

    assert len(tracker.objects) == 0, "Track should have been removed"


def test_tracker_multiple():
    """Multiple objects tracked simultaneously."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker()
    dets = [
        Detection(x1=0,   y1=0,   x2=50,  y2=100, confidence=0.9),
        Detection(x1=500, y1=0,   x2=550, y2=100, confidence=0.9),
        Detection(x1=250, y1=300, x2=300, y2=400, confidence=0.9),
    ]
    objs = tracker.update(dets)
    assert len(objs) == 3


def test_tracker_reset():
    """Reset clears all tracks."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker()
    dets = [Detection(x1=0, y1=0, x2=50, y2=100, confidence=0.9)]
    tracker.update(dets)
    tracker.reset()
    assert len(tracker.objects) == 0
    assert tracker.next_id == 0


def test_tracker_matches_within_max_distance():
    """Detection within max_distance of an existing track gets the same ID (regression for 80->200 fix)."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker(max_distance=200)

    # Register track at centroid (125, 300)
    d1 = [Detection(x1=100, y1=250, x2=150, y2=350, confidence=0.9)]
    t1 = tracker.update(d1)
    tid1 = list(t1.keys())[0]

    # Move 150px vertically - within 200px max_distance, must keep same ID
    d2 = [Detection(x1=100, y1=400, x2=150, y2=500, confidence=0.9)]
    t2 = tracker.update(d2)
    tid2 = list(t2.keys())[0]

    assert tid1 == tid2, "Detection within max_distance should keep same track ID"
    assert t2[tid2].cy == 450, "Track centroid should update to new position"


def test_tracker_creates_new_id_beyond_max_distance():
    """Detection beyond max_distance creates a new track ID."""
    from core.tracker import CentroidTracker
    from core.detector import Detection

    tracker = CentroidTracker(max_distance=80)

    # Register track at centroid (125, 300)
    d1 = [Detection(x1=100, y1=250, x2=150, y2=350, confidence=0.9)]
    tracker.update(d1)

    # Move 150px - beyond max_distance=80, should create new track
    d2 = [Detection(x1=100, y1=400, x2=150, y2=500, confidence=0.9)]
    tracker.update(d2)

    # A new track ID should have been assigned (next_id advances)
    assert tracker.next_id >= 2, "A new track ID should have been assigned when beyond max_distance"
