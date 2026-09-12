#!/usr/bin/env python3
"""
tests/test_detector.py
-----------------------
Unit tests for Milkyway AI core detection engine.
Run with: pytest tests/
"""

import sys
import numpy as np
from pathlib import Path

# Ensure project root is in path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_detection_import():
    """Core detector module imports correctly."""
    from core.detector import MilkBottleDetector, Detection, InferenceResult
    assert MilkBottleDetector is not None
    assert Detection is not None
    assert InferenceResult is not None


def test_detection_dataclass():
    """Detection dataclass computes properties correctly."""
    from core.detector import Detection
    d = Detection(x1=100, y1=200, x2=200, y2=400, confidence=0.95)
    assert d.cx == 150
    assert d.cy == 300
    assert d.width == 100
    assert d.height == 200
    assert d.class_name == "milk_bottle"


def test_inference_result():
    """InferenceResult count property is correct."""
    from core.detector import Detection, InferenceResult
    detections = [
        Detection(x1=0, y1=0, x2=100, y2=200, confidence=0.9),
        Detection(x1=200, y1=0, x2=300, y2=200, confidence=0.85),
    ]
    result = InferenceResult(detections=detections, inference_ms=35.0, frame_width=640, frame_height=480)
    assert result.count == 2
    d = result.to_dict()
    assert d["count"] == 2
    assert len(d["detections"]) == 2


def test_detector_conf_threshold():
    """Detector respects confidence threshold."""
    from core.detector import MilkBottleDetector
    det = MilkBottleDetector(conf_threshold=0.5)
    assert det.conf_threshold == 0.5


def test_annotate_frame():
    """annotate_frame does not crash on empty result."""
    from core.detector import MilkBottleDetector, InferenceResult
    det    = MilkBottleDetector()
    frame  = np.zeros((480, 640, 3), dtype=np.uint8)
    result = InferenceResult(detections=[], inference_ms=30.0, frame_width=640, frame_height=480)
    out    = det.annotate_frame(frame, result)
    assert out.shape == frame.shape


def test_detection_to_dict():
    """Detection.to_dict returns expected keys."""
    from core.detector import Detection
    d = Detection(x1=10, y1=20, x2=110, y2=220, confidence=0.92)
    result = d.to_dict()
    assert "bbox" in result
    assert "confidence" in result
    assert "class_name" in result
    assert result["class_name"] == "milk_bottle"
