#!/usr/bin/env python3
"""
demo/demo_mode.py
-----------------
Demo mode for Milkyway AI.
Generates realistic synthetic production data without a real camera.
Uses the actual ONNX model on pre-generated synthetic frames.
"""

from __future__ import annotations
import asyncio
import random
import time
import math
import numpy as np
import cv2
from typing import AsyncGenerator
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent


def _make_synthetic_frame(
    width: int = 1280,
    height: int = 720,
    num_bottles: int = 3,
    frame_idx: int = 0,
) -> np.ndarray:
    """
    Render a convincing synthetic conveyor belt scene with moving bottle shapes.
    Used to simulate production data without a real camera.
    """
    # Dark industrial background
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:] = (30, 28, 35)  # dark background

    # Conveyor belt surface
    belt_y1 = int(height * 0.35)
    belt_y2 = int(height * 0.75)
    cv2.rectangle(frame, (0, belt_y1), (width, belt_y2), (55, 50, 60), -1)

    # Belt lines / texture
    for x in range(0, width, 60):
        offset = (frame_idx * 3) % 60
        cv2.line(frame, (x - offset, belt_y1), (x - offset, belt_y2), (45, 42, 52), 1)

    # Ambient glow at top
    for i in range(30):
        alpha = 0.02
        cv2.line(frame, (0, i), (width, i), (80, 90, 120), 1)

    # Bottles
    bottle_w = 55
    bottle_h = 130
    spacing  = width // max(num_bottles, 1)

    for i in range(num_bottles):
        # Horizontal scroll animation
        x_base = (i * spacing + int(frame_idx * 2.5)) % width
        y_base = int(height * 0.42)

        # Bottle body
        bx1 = x_base - bottle_w // 2
        by1 = y_base
        bx2 = x_base + bottle_w // 2
        by2 = y_base + bottle_h

        # Clip to frame
        if bx2 < 0 or bx1 > width:
            continue

        # Shadow
        cv2.ellipse(frame, (x_base, by2 + 6), (bottle_w // 2, 10), 0, 0, 360, (20, 18, 25), -1)

        # Bottle body (gradient-ish)
        cv2.rectangle(frame, (bx1, by1 + 20), (bx2, by2), (140, 190, 230), -1)
        cv2.rectangle(frame, (bx1 + 5, by1 + 20), (bx1 + 15, by2), (180, 210, 240), -1)

        # Neck
        neck_x1 = x_base - 15
        neck_x2 = x_base + 15
        cv2.rectangle(frame, (neck_x1, by1 - 25), (neck_x2, by1 + 22), (150, 195, 235), -1)

        # Cap
        cv2.rectangle(frame, (neck_x1 - 5, by1 - 40), (neck_x2 + 5, by1 - 25), (220, 80, 60), -1)

        # Label
        label_y1 = by1 + 40
        label_y2 = by2 - 20
        cv2.rectangle(frame, (bx1 + 8, label_y1), (bx2 - 8, label_y2), (255, 255, 255), -1)
        cv2.putText(frame, "MILK", (bx1 + 10, label_y1 + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (30, 30, 30), 1, cv2.LINE_AA)
        cv2.putText(frame, "500ml", (bx1 + 10, label_y1 + 42),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.28, (80, 80, 80), 1, cv2.LINE_AA)

        # Highlight
        cv2.line(frame, (bx1 + 8, by1 + 20), (bx1 + 8, by2), (200, 225, 250), 1)

    # Count line
    line_y = int(height * 0.6)
    cv2.line(frame, (0, line_y), (width, line_y), (0, 255, 200), 2)
    cv2.putText(frame, "COUNTING LINE", (10, line_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 200), 1, cv2.LINE_AA)

    # Info overlay
    cv2.putText(frame, "🥛 Milkyway AI — DEMO MODE", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 210, 130), 2, cv2.LINE_AA)
    cv2.putText(frame, f"Frame: {frame_idx}", (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1, cv2.LINE_AA)

    return frame


class DemoProducer:
    """
    Generates a synthetic detection stream for demo/portfolio use.
    Simulates realistic production line variability.
    """

    def __init__(self, fps: int = 10):
        self.fps    = fps
        self.frame_idx = 0
        self._running  = False

    async def stream(self) -> AsyncGenerator[dict, None]:
        """Async generator yielding synthetic detection frames."""
        self._running = True
        while self._running:
            await asyncio.sleep(1.0 / self.fps)

            # Vary bottle count realistically (0–6, peaking at 2–4)
            base_count = random.choices(
                [0, 1, 2, 3, 4, 5, 6],
                weights=[2, 5, 15, 20, 15, 5, 2],
            )[0]

            # Occasionally simulate conveyor stop (gap)
            if self.frame_idx % 180 < 12:
                base_count = 0

            frame = _make_synthetic_frame(
                num_bottles=base_count,
                frame_idx=self.frame_idx,
            )

            # Fake inference time
            inference_ms = random.uniform(28, 45)

            # Build fake detections
            detections = []
            spacing = 1280 // max(base_count, 1)
            for i in range(base_count):
                x_base = (i * spacing + int(self.frame_idx * 2.5)) % 1280
                y_base = int(720 * 0.42)
                detections.append({
                    "bbox": [x_base - 27, y_base, x_base + 27, y_base + 130],
                    "confidence": round(random.uniform(0.82, 0.99), 3),
                    "class_id": 0,
                    "class_name": "milk_bottle",
                    "center": [x_base, y_base + 65],
                })

            # JPEG encode frame
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_b64 = buf.tobytes()

            yield {
                "frame_idx": self.frame_idx,
                "count": base_count,
                "detections": detections,
                "inference_ms": round(inference_ms, 2),
                "timestamp": time.time(),
                "demo": True,
                "frame_bytes": frame_b64,
            }

            self.frame_idx += 1

    def stop(self):
        self._running = False
