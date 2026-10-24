#!/usr/bin/env python3
"""Detect faces and report likely duplicate identities with OpenCV SFace."""

from __future__ import annotations

import argparse
import json
import os
from itertools import combinations
from pathlib import Path

import cv2
import numpy as np


DEFAULT_MODEL_DIR = Path.home() / ".cache" / "opencv-face"
DETECTOR_MODEL = DEFAULT_MODEL_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNIZER_MODEL = DEFAULT_MODEL_DIR / "face_recognition_sface_2021dec.onnx"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--threshold", type=float, default=0.45)
    parser.add_argument("--detection-threshold", type=float, default=0.75)
    parser.add_argument("--fallback-detection-threshold", type=float, default=0.60)
    parser.add_argument("--top", type=int, default=20)
    return parser.parse_args()


def collect_images(paths: list[Path]) -> list[Path]:
    images: list[Path] = []
    for path in paths:
        if path.is_dir():
            images.extend(sorted(item for item in path.iterdir() if item.suffix.lower() in {".png", ".jpg", ".jpeg"}))
        elif path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            images.append(path)
    return sorted(set(item.resolve() for item in images))


def collapse_overlapping_detections(faces: object) -> object:
    """Collapse YuNet duplicate boxes that describe the same large face.

    At the fallback score threshold YuNet can return two offset boxes for one
    centered face. Keep the highest-confidence box only when every other box
    substantially overlaps it. Spatially separate faces remain a hard failure.
    """
    if faces is None or len(faces) <= 1:
        return faces
    ordered = sorted(faces, key=lambda face: float(face[-1]), reverse=True)
    primary = ordered[0]
    px, py, pw, ph = (float(value) for value in primary[:4])
    primary_area = pw * ph
    for face in ordered[1:]:
        x, y, width, height = (float(value) for value in face[:4])
        area = width * height
        intersection_width = max(0.0, min(px + pw, x + width) - max(px, x))
        intersection_height = max(0.0, min(py + ph, y + height) - max(py, y))
        intersection = intersection_width * intersection_height
        if min(primary_area, area) <= 0 or intersection / min(primary_area, area) < 0.35:
            return faces
    return np.asarray([primary])


def main() -> None:
    args = parse_args()
    for model in (DETECTOR_MODEL, RECOGNIZER_MODEL):
        if not model.is_file():
            raise FileNotFoundError(f"Missing OpenCV face model: {model}")

    detector = cv2.FaceDetectorYN.create(
        str(DETECTOR_MODEL), "", (320, 320), args.detection_threshold, 0.3, 5000
    )
    recognizer = cv2.FaceRecognizerSF.create(str(RECOGNIZER_MODEL), "")
    images = collect_images(args.paths)
    features: dict[Path, object] = {}
    failures: list[dict[str, str]] = []

    for path in images:
        image = cv2.imread(os.fspath(path))
        if image is None:
            failures.append({"path": os.fspath(path), "reason": "decode_failed"})
            continue
        height, width = image.shape[:2]
        detector.setInputSize((width, height))
        _, faces = detector.detect(image)
        # A strict first pass avoids background false positives. Some valid
        # centered StyleGAN portraits score just below 0.75, so retry only a
        # zero-face result at a conservative lower threshold. Multiple faces
        # from either pass remain a hard failure.
        if faces is None and args.fallback_detection_threshold < args.detection_threshold:
            detector.setScoreThreshold(args.fallback_detection_threshold)
            _, faces = detector.detect(image)
            detector.setScoreThreshold(args.detection_threshold)
            faces = collapse_overlapping_detections(faces)
        if faces is None or len(faces) != 1:
            failures.append({"path": os.fspath(path), "reason": f"face_count_{0 if faces is None else len(faces)}"})
            continue
        aligned = recognizer.alignCrop(image, faces[0])
        features[path] = recognizer.feature(aligned)

    scores = []
    for left, right in combinations(features, 2):
        score = float(recognizer.match(features[left], features[right], cv2.FaceRecognizerSF_FR_COSINE))
        scores.append({"left": left.name, "right": right.name, "score": round(score, 6)})
    scores.sort(key=lambda item: item["score"], reverse=True)
    flagged = [item for item in scores if item["score"] >= args.threshold]
    print(json.dumps({
        "images": len(images),
        "faces": len(features),
        "threshold": args.threshold,
        "flagged": flagged,
        "top": scores[:args.top],
        "failures": failures,
    }, ensure_ascii=False, indent=2))

    if failures or flagged:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
