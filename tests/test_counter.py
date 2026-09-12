#!/usr/bin/env python3
"""
tests/test_counter.py
---------------------
Unit tests for the virtual line-crossing counter.
These test the most important production counting logic in Milkyway AI.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.counter import LineCounter, CountEvent
from core.tracker import TrackedBottle


def _make_tracked(track_id: int, path: list) -> dict:
    """Helper: create a TrackedBottle with a given path for counter testing."""
    obj = TrackedBottle(track_id=track_id, cx=path[-1][0], cy=path[-1][1])
    obj.path = list(path)
    return {track_id: obj}


def test_top_to_bottom_crossing_fires_once():
    """A bottle moving top to bottom across the line generates exactly one event."""
    counter = LineCounter(line_y=400, frame_height=720)

    # Frame 1: bottle above line — no crossing
    tracked = _make_tracked(0, [(320, 300)])
    events = counter.update(tracked)
    assert len(events) == 0 and counter.total_count == 0

    # Frame 2: centroid crosses line (300 -> 450)
    tracked = _make_tracked(0, [(320, 300), (320, 450)])
    events = counter.update(tracked)
    assert len(events) == 1
    assert counter.total_count == 1


def test_no_double_count_same_track():
    """The same track ID must only be counted once no matter how many frames pass."""
    counter = LineCounter(line_y=400, frame_height=720)

    tracked = _make_tracked(0, [(320, 300), (320, 450)])
    counter.update(tracked)
    assert counter.total_count == 1

    for _ in range(10):
        tracked = _make_tracked(0, [(320, 450), (320, 460)])
        events = counter.update(tracked)
        assert len(events) == 0

    assert counter.total_count == 1, "Same bottle counted more than once"


def test_bottom_to_top_crossing_counts():
    """A bottle moving bottom to top across the line is also counted once."""
    counter = LineCounter(line_y=400, frame_height=720)
    tracked = _make_tracked(0, [(320, 500)])
    counter.update(tracked)

    tracked = _make_tracked(0, [(320, 500), (320, 350)])
    events = counter.update(tracked)
    assert len(events) == 1
    assert counter.total_count == 1


def test_multiple_bottles_counted_independently():
    """Two different track IDs each crossing the line both count."""
    counter = LineCounter(line_y=400, frame_height=720)

    obj0 = TrackedBottle(track_id=0, cx=100, cy=450); obj0.path = [(100,300),(100,450)]
    obj1 = TrackedBottle(track_id=1, cx=500, cy=300); obj1.path = [(500,300)]
    counter.update({0: obj0, 1: obj1})
    assert counter.total_count == 1

    obj0b = TrackedBottle(track_id=0, cx=100, cy=460); obj0b.path = [(100,450),(100,460)]
    obj1b = TrackedBottle(track_id=1, cx=500, cy=450); obj1b.path = [(500,300),(500,450)]
    counter.update({0: obj0b, 1: obj1b})
    assert counter.total_count == 2


def test_no_event_both_above():
    """No event if both previous and current centroid are above the line."""
    counter = LineCounter(line_y=400, frame_height=720)
    tracked = _make_tracked(0, [(320, 300), (320, 350)])
    events = counter.update(tracked)
    assert len(events) == 0 and counter.total_count == 0


def test_no_event_both_below():
    """No event if both previous and current centroid are below the line."""
    counter = LineCounter(line_y=400, frame_height=720)
    tracked = _make_tracked(0, [(320, 450), (320, 500)])
    events = counter.update(tracked)
    assert len(events) == 0 and counter.total_count == 0


def test_reset_clears_state():
    """reset() clears total_count and counted_ids so the same track can count again."""
    counter = LineCounter(line_y=400, frame_height=720)
    tracked = _make_tracked(0, [(320, 300), (320, 450)])
    counter.update(tracked)
    assert counter.total_count == 1

    counter.reset()
    assert counter.total_count == 0
    assert len(counter.counted_ids) == 0

    events = counter.update(tracked)
    assert counter.total_count == 1


def test_get_stats_keys():
    """get_stats() returns expected dictionary keys."""
    counter = LineCounter(line_y=400, frame_height=720)
    stats = counter.get_stats()
    assert "total_count" in stats
    assert "line_y" in stats
    assert "event_count" in stats
    assert stats["line_y"] == 400


def test_draw_line_does_not_crash():
    """draw_line() must not raise on a blank frame."""
    import numpy as np
    counter = LineCounter(line_y=300, frame_height=720)
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    counter.draw_line(frame)  # must not raise


def test_count_event_to_dict():
    """CountEvent.to_dict() returns expected keys and values."""
    ev = CountEvent(track_id=5, cx=100, cy=400)
    d = ev.to_dict()
    assert d["track_id"] == 5
    assert "crossed_at" in d
    assert d["position"] == [100, 400]
