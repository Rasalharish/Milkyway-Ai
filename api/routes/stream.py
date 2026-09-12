"""
api/routes/stream.py
---------------------
WebSocket live stream endpoint.
Demo mode: generates synthetic frames and runs them through the real
           tracker + counter pipeline so total_counted is meaningful.
Camera mode: uses real webcam + YOLOv8 detection.
"""

from __future__ import annotations
import asyncio
import base64
import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["Stream"])


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket, demo: bool = True):
    """
    WebSocket endpoint for live detection stream.
    Send a JSON message with {"type": "config", "demo": true/false} to switch modes.
    Receive: {"count": int, "detections": [...], "frame_b64": str, ...}
    """
    await websocket.accept()
    from api.main import get_detector, get_demo_producer, get_alert_engine_instance
    from storage.database import log_detection_event, log_production_count
    from core.tracker import CentroidTracker
    from core.counter import LineCounter
    from core.detector import Detection

    tracker   = CentroidTracker()
    counter   = LineCounter()
    alert_eng = get_alert_engine_instance()

    if demo:
        # Demo mode: synthetic frames run through the real tracking + counting pipeline
        producer = get_demo_producer()
        try:
            async for frame_data in producer.stream():
                # Reconstruct Detection objects from the synthetic payload
                raw_dets = frame_data.get("detections", [])
                detections = [
                    Detection(
                        x1=d["bbox"][0], y1=d["bbox"][1],
                        x2=d["bbox"][2], y2=d["bbox"][3],
                        confidence=d.get("confidence", 0.9),
                    )
                    for d in raw_dets
                ]

                # Run through the real tracker + counter
                tracked = tracker.update(detections)
                events  = counter.update(tracked)

                # Persist each line-crossing event to DB
                for ev in events:
                    log_production_count(ev.track_id, ev.crossed_at)

                alert_eng.update(frame_data["count"])
                new_alerts = [a.to_dict() for a in alert_eng.get_active_alerts()[-3:]]

                log_detection_event(
                    count=frame_data["count"],
                    inference_ms=frame_data["inference_ms"],
                    source="demo",
                )

                payload = {
                    "frame_idx":     frame_data["frame_idx"],
                    "count":         frame_data["count"],
                    "detections":    frame_data["detections"],
                    "inference_ms":  frame_data["inference_ms"],
                    "timestamp":     frame_data["timestamp"],
                    "total_counted": counter.total_count,
                    "demo":          True,
                    "alerts":        new_alerts,
                }
                if frame_data.get("frame_bytes"):
                    payload["frame_b64"] = base64.b64encode(frame_data["frame_bytes"]).decode()

                await websocket.send_text(json.dumps(payload))

                # Check for client message (non-blocking)
                try:
                    msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                    cfg = json.loads(msg)
                    if cfg.get("type") == "stop":
                        break
                except (asyncio.TimeoutError, Exception):
                    pass

        except WebSocketDisconnect:
            pass
        finally:
            producer.stop()
    else:
        # Camera mode: real YOLO inference
        import cv2
        import numpy as np

        detector = get_detector()
        cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            await websocket.send_text(json.dumps({
                "error": "Camera not available. Switch to demo mode.",
            }))
            await websocket.close()
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        frame_idx = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    await websocket.send_text(json.dumps({
                        "error": "Camera read failed. Check camera connection.",
                    }))
                    break

                result  = detector.predict(frame)
                tracked = tracker.update(result.detections)
                events  = counter.update(tracked)

                alert_eng.update(result.count)
                new_alerts = [a.to_dict() for a in alert_eng.get_active_alerts()[-3:]]

                log_detection_event(
                    count=result.count,
                    inference_ms=result.inference_ms,
                    source="camera",
                )
                for ev in events:
                    log_production_count(ev.track_id, ev.crossed_at)

                ann = detector.annotate_frame(frame, result)
                counter.draw_line(ann)

                _, buf = cv2.imencode(".jpg", ann, [cv2.IMWRITE_JPEG_QUALITY, 75])
                frame_b64 = base64.b64encode(buf).decode()

                payload = {
                    "frame_idx":     frame_idx,
                    "count":         result.count,
                    "detections":    [d.to_dict() for d in result.detections],
                    "inference_ms":  result.inference_ms,
                    "timestamp":     result.timestamp,
                    "total_counted": counter.total_count,
                    "demo":          False,
                    "frame_b64":     frame_b64,
                    "alerts":        new_alerts,
                }
                await websocket.send_text(json.dumps(payload))
                frame_idx += 1

                await asyncio.sleep(0.033)  # ~30 fps cap

                try:
                    msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                    cfg = json.loads(msg)
                    if cfg.get("type") == "stop":
                        break
                except (asyncio.TimeoutError, Exception):
                    pass

        except WebSocketDisconnect:
            pass
        finally:
            cap.release()
