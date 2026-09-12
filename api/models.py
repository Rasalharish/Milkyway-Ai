"""
api/models.py
-------------
Pydantic schemas for Milkyway AI API.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time


class BBoxModel(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class DetectionModel(BaseModel):
    bbox: List[int]              # [x1, y1, x2, y2]
    confidence: float
    class_id: int
    class_name: str
    center: List[int]            # [cx, cy]


class InferenceResponse(BaseModel):
    count: int
    detections: List[DetectionModel]
    inference_ms: float
    frame_width: int
    frame_height: int
    timestamp: float = Field(default_factory=time.time)
    annotated_image_b64: Optional[str] = None


class StreamFrame(BaseModel):
    frame_idx: int
    count: int
    detections: List[DetectionModel]
    inference_ms: float
    timestamp: float
    demo: bool = False
    total_counted: int = 0
    frame_b64: Optional[str] = None


class AlertModel(BaseModel):
    severity: str
    message: str
    timestamp: float
    resolved: bool = False


class DashboardSummary(BaseModel):
    bottles_today: int
    by_shift: Dict[str, int]
    total_frames_processed: int
    avg_inference_ms: float
    peak_count_per_frame: int
    active_alerts: int = 0


class HourlyStat(BaseModel):
    hour_bucket: str
    total_count: int
    avg_inference_ms: Optional[float]
    peak_count: int
    frame_count: int


class ReportRow(BaseModel):
    timestamp: float
    count: int
    inference_ms: float
    source: str
