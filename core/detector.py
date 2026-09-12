#!/usr/bin/env python3
"""
core/detector.py
----------------
YOLOv8 inference wrapper for Milkyway AI.
Supports both .pt (PyTorch) and .onnx models.
Preserves the original detection logic from detect_live.py.
"""

from __future__ import annotations
import time
import numpy as np
import cv2
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional

BASE_DIR = Path(__file__).parent.parent
PT_MODEL_PATH   = BASE_DIR / "assets" / "best.pt"
ONNX_MODEL_PATH = BASE_DIR / "assets" / "milk_bottle_detector.onnx"

DEFAULT_CONF = 0.40
DEFAULT_IOU  = 0.45
CLASS_NAMES  = {0: "milk_bottle"}


@dataclass
class Detection:
    """A single bottle detection result."""
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    class_id: int = 0
    class_name: str = "milk_bottle"

    @property
    def cx(self) -> int:
        return (self.x1 + self.x2) // 2

    @property
    def cy(self) -> int:
        return (self.y1 + self.y2) // 2

    @property
    def width(self) -> int:
        return self.x2 - self.x1

    @property
    def height(self) -> int:
        return self.y2 - self.y1

    def to_dict(self) -> dict:
        return {
            "bbox": [self.x1, self.y1, self.x2, self.y2],
            "confidence": round(self.confidence, 4),
            "class_id": self.class_id,
            "class_name": self.class_name,
            "center": [self.cx, self.cy],
        }


@dataclass
class InferenceResult:
    """Result of running inference on a single frame."""
    detections: List[Detection] = field(default_factory=list)
    inference_ms: float = 0.0
    frame_width: int = 0
    frame_height: int = 0
    timestamp: float = field(default_factory=time.time)

    @property
    def count(self) -> int:
        return len(self.detections)

    def to_dict(self) -> dict:
        return {
            "count": self.count,
            "detections": [d.to_dict() for d in self.detections],
            "inference_ms": round(self.inference_ms, 2),
            "frame_width": self.frame_width,
            "frame_height": self.frame_height,
            "timestamp": self.timestamp,
        }


class MilkBottleDetector:
    """
    Core detection engine wrapping YOLOv8.
    Mirrors the logic from the original detect_live.py.
    """

    def __init__(
        self,
        conf_threshold: float = DEFAULT_CONF,
        iou_threshold: float  = DEFAULT_IOU,
        use_onnx: bool = False,
        device: str = "cpu",
    ):
        self.conf_threshold = conf_threshold
        self.iou_threshold  = iou_threshold
        self.device         = device
        self.model          = None
        self._use_onnx      = use_onnx
        self._loaded        = False

    def load(self):
        """Load model weights. Call once at startup."""
        if self._loaded:
            return
        if self._use_onnx and ONNX_MODEL_PATH.exists():
            self._load_onnx()
        elif PT_MODEL_PATH.exists():
            self._load_pt()
        else:
            print(f"[WARN]  No weights found -- using base yolov8n.pt (not fine-tuned)")
            self._load_base()
        self._loaded = True

    def _load_pt(self):
        from ultralytics import YOLO
        print(f"[OK]  Loading YOLOv8 weights: {PT_MODEL_PATH}")
        self.model = YOLO(str(PT_MODEL_PATH))
        self._inference_fn = self._predict_pt

    def _load_base(self):
        from ultralytics import YOLO
        self.model = YOLO("yolov8n.pt")
        self._inference_fn = self._predict_pt

    def _load_onnx(self):
        import onnxruntime as rt
        print(f"[OK]  Loading ONNX model: {ONNX_MODEL_PATH}")
        self.model = rt.InferenceSession(str(ONNX_MODEL_PATH))
        self._input_name = self.model.get_inputs()[0].name
        self._inference_fn = self._predict_onnx

    def predict(self, frame: np.ndarray) -> InferenceResult:
        """Run inference on a BGR frame. Returns InferenceResult."""
        if not self._loaded:
            self.load()
        h, w = frame.shape[:2]
        t0 = time.perf_counter()
        detections = self._inference_fn(frame)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return InferenceResult(
            detections=detections,
            inference_ms=elapsed_ms,
            frame_width=w,
            frame_height=h,
        )

    def _predict_pt(self, frame: np.ndarray) -> List[Detection]:
        results = self.model.predict(
            source  = frame,
            conf    = self.conf_threshold,
            iou     = self.iou_threshold,
            device  = self.device,
            verbose = False,
            stream  = False,
        )
        detections = []
        boxes = results[0].boxes
        if boxes is None:
            return detections
        for box in boxes:
            conf = float(box.conf[0])
            if conf < self.conf_threshold:
                continue
            cls = int(box.cls[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            detections.append(Detection(
                x1=x1, y1=y1, x2=x2, y2=y2,
                confidence=conf,
                class_id=cls,
                class_name=CLASS_NAMES.get(cls, "milk_bottle"),
            ))
        return detections

    def _predict_onnx(self, frame: np.ndarray) -> List[Detection]:
        """ONNX inference path (NMS post-processing included)."""
        inp = cv2.resize(frame, (640, 640))
        inp = cv2.cvtColor(inp, cv2.COLOR_BGR2RGB)
        inp = inp.astype(np.float32) / 255.0
        inp = inp.transpose(2, 0, 1)[np.newaxis]
        outputs = self.model.run(None, {self._input_name: inp})
        # Ultralytics ONNX output: [1, 5, 8400] => [cx, cy, w, h, conf]
        preds = outputs[0][0].T  # (8400, 5)
        h_frame, w_frame = frame.shape[:2]
        sx = w_frame / 640
        sy = h_frame / 640
        detections = []
        for pred in preds:
            cx, cy, bw, bh, conf = pred[:5]
            if conf < self.conf_threshold:
                continue
            x1 = int((cx - bw / 2) * sx)
            y1 = int((cy - bh / 2) * sy)
            x2 = int((cx + bw / 2) * sx)
            y2 = int((cy + bh / 2) * sy)
            detections.append(Detection(
                x1=max(0, x1), y1=max(0, y1),
                x2=min(w_frame, x2), y2=min(h_frame, y2),
                confidence=float(conf),
            ))
        return detections

    def annotate_frame(
        self,
        frame: np.ndarray,
        result: InferenceResult,
        tracked_ids: Optional[dict] = None,
    ) -> np.ndarray:
        """Draw bounding boxes, labels, and tracking IDs on frame."""
        out = frame.copy()
        CLR_BOX      = (0, 200, 80)
        CLR_LABEL_BG = (0, 150, 60)
        FONT         = cv2.FONT_HERSHEY_SIMPLEX

        for det in result.detections:
            x1, y1, x2, y2 = det.x1, det.y1, det.x2, det.y2
            label = f"bottle {det.confidence:.0%}"
            if tracked_ids and (det.cx, det.cy) in tracked_ids:
                label = f"#{tracked_ids[(det.cx, det.cy)]} {det.confidence:.0%}"

            cv2.rectangle(out, (x1, y1), (x2, y2), CLR_BOX, 2)
            (tw, th), _ = cv2.getTextSize(label, FONT, 0.55, 1)
            cv2.rectangle(out, (x1, y1 - th - 8), (x1 + tw + 6, y1), CLR_LABEL_BG, -1)
            cv2.putText(out, label, (x1 + 3, y1 - 4), FONT, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

        # HUD
        h, w = out.shape[:2]
        cv2.putText(
            out, f"Count: {result.count}  |  {result.inference_ms:.0f}ms",
            (10, 30), FONT, 0.8, (200, 255, 200), 2, cv2.LINE_AA
        )
        return out
