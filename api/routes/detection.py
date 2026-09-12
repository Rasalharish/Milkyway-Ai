"""
api/routes/detection.py
-----------------------
Detection endpoints: POST /detect (image upload)
"""

from __future__ import annotations
import base64
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from api.models import InferenceResponse

router = APIRouter(prefix="/detect", tags=["Detection"])


def _decode_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")
    return img


@router.post("/image", response_model=InferenceResponse)
async def detect_image(
    file: UploadFile = File(...),
    annotate: bool   = True,
):
    """
    Upload an image and run milk bottle detection.
    Returns detection results + optionally annotated image (base64).
    """
    from api.main import get_detector
    from storage.database import log_detection_event

    data = await file.read()
    frame = _decode_image(data)

    detector = get_detector()
    result   = detector.predict(frame)

    # Log to DB
    log_detection_event(
        count=result.count,
        inference_ms=result.inference_ms,
        source="upload",
    )

    annotated_b64 = None
    if annotate:
        ann   = detector.annotate_frame(frame, result)
        _, buf = cv2.imencode(".jpg", ann, [cv2.IMWRITE_JPEG_QUALITY, 85])
        annotated_b64 = base64.b64encode(buf).decode("utf-8")

    return InferenceResponse(
        count=result.count,
        detections=[d.to_dict() for d in result.detections],
        inference_ms=result.inference_ms,
        frame_width=result.frame_width,
        frame_height=result.frame_height,
        timestamp=result.timestamp,
        annotated_image_b64=annotated_b64,
    )
