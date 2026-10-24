#!/usr/bin/env python3
"""Generate deterministic local portrait candidates with an SDXL checkpoint."""

from __future__ import annotations

import argparse
import gc
import json
import os
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from diffusers import (
    AutoencoderKL,
    DPMSolverMultistepScheduler,
    StableDiffusionImg2ImgPipeline,
    StableDiffusionPipeline,
    StableDiffusionXLImg2ImgPipeline,
    StableDiffusionXLPipeline,
)
from huggingface_hub import hf_hub_download, snapshot_download
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_REPO = "SG161222/RealVisXL_V5.0"
MODEL_FILE = "RealVisXL_V5.0_fp16.safetensors"
FACE_MODEL_DIR = Path.home() / ".cache" / "opencv-face"
FACE_DETECTOR_MODEL = FACE_MODEL_DIR / "face_detection_yunet_2023mar.onnx"
FACE_RECOGNIZER_MODEL = FACE_MODEL_DIR / "face_recognition_sface_2021dec.onnx"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--ids", type=str, default="")
    parser.add_argument("--seed-offset", type=int, default=0)
    parser.add_argument(
        "--plan-salt",
        type=str,
        default="",
        help="Deterministically replace identity and scene traits for a hard-to-fill ID.",
    )
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--guidance", type=float, default=5.5)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--model-repo", type=str, default=MODEL_REPO)
    parser.add_argument("--model-file", type=str, default=MODEL_FILE)
    parser.add_argument("--architecture", choices=("sdxl", "sd15"), default="sdxl")
    parser.add_argument("--pipeline-source", choices=("single", "repo"), default="single")
    parser.add_argument("--reference-dir", action="append", type=Path, default=[])
    parser.add_argument("--similarity-threshold", type=float, default=0.45)
    parser.add_argument("--max-attempts", type=int, default=1)
    parser.add_argument("--rejected-dir", type=Path)
    parser.add_argument(
        "--init-dir",
        type=Path,
        help="Optional directory containing <portrait-id>.png inputs for identity-preserving img2img refinement.",
    )
    parser.add_argument(
        "--strength",
        type=float,
        default=0.35,
        help="Img2img denoising strength; only used with --init-dir.",
    )
    parser.add_argument(
        "--face-crop-scale",
        type=float,
        default=0.0,
        help="Crop around the largest detected face before QC; 2.2 keeps a close head-and-shoulders frame.",
    )
    return parser.parse_args()


def load_plan(offset: int, count: int, requested_ids: str, plan_salt: str) -> list[dict]:
    load_offset = 0 if requested_ids else offset
    load_count = 600 if requested_ids else count
    completed = subprocess.run(
        ["node", "scripts/portrait-plan.mjs", str(load_offset), str(load_count), plan_salt],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    plan = json.loads(completed.stdout)
    if not requested_ids:
        return plan
    ids = [item.strip() for item in requested_ids.split(",") if item.strip()]
    by_id = {item["id"]: item for item in plan}
    missing = [item_id for item_id in ids if item_id not in by_id]
    if missing:
        raise ValueError(f"Unknown portrait IDs: {', '.join(missing)}")
    return [by_id[item_id] for item_id in ids]


def load_pipeline(
    model_path: str,
    architecture: str,
    model_repo: str,
    pipeline_source: str,
    img2img: bool,
):
    if pipeline_source == "repo":
        if architecture != "sd15":
            raise ValueError("--pipeline-source repo currently supports only --architecture sd15")
        pipeline_class = StableDiffusionImg2ImgPipeline if img2img else StableDiffusionPipeline
        pipeline = pipeline_class.from_pretrained(
            model_path,
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
            safety_checker=None,
            requires_safety_checker=False,
            local_files_only=True,
        )
    elif architecture == "sd15":
        vae = AutoencoderKL.from_pretrained(
            model_repo,
            subfolder="vae",
            torch_dtype=torch.float16,
            local_files_only=True,
        )
        pipeline_class = StableDiffusionImg2ImgPipeline if img2img else StableDiffusionPipeline
        pipeline = pipeline_class.from_single_file(
            model_path,
            vae=vae,
            torch_dtype=torch.float16,
            use_safetensors=True,
            safety_checker=None,
            requires_safety_checker=False,
        )
    else:
        pipeline_class = StableDiffusionXLImg2ImgPipeline if img2img else StableDiffusionXLPipeline
        pipeline = pipeline_class.from_single_file(
            model_path,
            torch_dtype=torch.float16,
            use_safetensors=True,
            add_watermarker=False,
        )
    pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
        pipeline.scheduler.config,
        algorithm_type="dpmsolver++",
        use_karras_sigmas=True,
    )
    pipeline.enable_model_cpu_offload()
    pipeline.enable_attention_slicing()
    pipeline.vae.enable_tiling()
    return pipeline


class FaceQualityControl:
    def __init__(self, reference_dirs: list[Path], excluded_ids: set[str], threshold: float) -> None:
        for model in (FACE_DETECTOR_MODEL, FACE_RECOGNIZER_MODEL):
            if not model.is_file():
                raise FileNotFoundError(f"Missing OpenCV face model: {model}")
        self.detector = cv2.FaceDetectorYN.create(
            os.fspath(FACE_DETECTOR_MODEL), "", (320, 320), 0.75, 0.3, 5000
        )
        self.recognizer = cv2.FaceRecognizerSF.create(os.fspath(FACE_RECOGNIZER_MODEL), "")
        self.threshold = threshold
        self.references: list[tuple[str, object]] = []
        for directory in reference_dirs:
            if not directory.is_dir():
                continue
            for path in sorted(directory.iterdir()):
                if path.suffix.lower() not in {".png", ".jpg", ".jpeg"} or path.stem in excluded_ids:
                    continue
                with Image.open(path) as image:
                    feature, failure = self.extract(image.convert("RGB"))
                if failure:
                    raise RuntimeError(f"Reference face QC failed for {path}: {failure}")
                self.references.append((os.fspath(path.resolve()), feature))

    def detect(self, image: Image.Image) -> tuple[np.ndarray, object | None]:
        rgb = np.asarray(image.convert("RGB"))
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        height, width = bgr.shape[:2]
        self.detector.setInputSize((width, height))
        _, faces = self.detector.detect(bgr)
        return bgr, faces

    def extract(self, image: Image.Image) -> tuple[object | None, str | None]:
        bgr, faces = self.detect(image)
        face_count = 0 if faces is None else len(faces)
        if face_count != 1:
            return None, f"face_count_{face_count}"
        aligned = self.recognizer.alignCrop(bgr, faces[0])
        return self.recognizer.feature(aligned), None

    def crop_primary(
        self, image: Image.Image, scale: float, output_size: int
    ) -> tuple[Image.Image | None, dict | None, str | None]:
        _, faces = self.detect(image)
        if faces is None or len(faces) == 0:
            return None, None, "face_count_0"
        primary = max(faces, key=lambda face: float(face[2] * face[3]))
        x, y, face_width, face_height = (float(value) for value in primary[:4])
        width, height = image.size
        side = min(width, height, max(1, int(round(max(face_width, face_height) * scale))))
        center_x = x + face_width / 2
        center_y = y + face_height * 0.65
        left = int(round(center_x - side / 2))
        top = int(round(center_y - side / 2))
        left = min(max(0, left), width - side)
        top = min(max(0, top), height - side)
        box = (left, top, left + side, top + side)
        cropped = image.crop(box).resize((output_size, output_size), Image.Resampling.LANCZOS)
        return cropped, {
            "box": list(box),
            "sourceFaceCount": int(len(faces)),
            "scale": scale,
        }, None

    def compare(self, feature: object) -> tuple[float, str | None]:
        best_score = -1.0
        best_path = None
        for path, reference in self.references:
            score = float(self.recognizer.match(feature, reference, cv2.FaceRecognizerSF_FR_COSINE))
            if score > best_score:
                best_score = score
                best_path = path
        return best_score, best_path

    def accept(self, label: str, feature: object) -> None:
        self.references.append((label, feature))


def main() -> None:
    args = parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is unavailable; refusing slow CPU portrait generation")

    plan = load_plan(args.offset, args.count, args.ids, args.plan_salt)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    if args.max_attempts < 1:
        raise ValueError("--max-attempts must be at least 1")
    if args.size < 512 or args.size > 1024 or args.size % 64 != 0:
        raise ValueError("--size must be between 512 and 1024 and divisible by 64")
    if args.face_crop_scale and not 1.5 <= args.face_crop_scale <= 4.0:
        raise ValueError("--face-crop-scale must be 0 or between 1.5 and 4.0")
    if args.init_dir and not args.init_dir.is_dir():
        raise FileNotFoundError(f"Missing img2img input directory: {args.init_dir}")
    if args.init_dir and not 0.05 <= args.strength <= 0.95:
        raise ValueError("--strength must be between 0.05 and 0.95")
    face_qc = FaceQualityControl(
        args.reference_dir,
        {item["id"] for item in plan},
        args.similarity_threshold,
    ) if args.reference_dir else None
    rejected_dir = args.rejected_dir or args.output_dir.parent / f"{args.output_dir.name}-rejected"
    if face_qc:
        rejected_dir.mkdir(parents=True, exist_ok=True)
    if args.pipeline_source == "repo":
        model_path = snapshot_download(repo_id=args.model_repo, local_files_only=True)
    else:
        model_path = hf_hub_download(
            repo_id=args.model_repo,
            filename=args.model_file,
            local_files_only=True,
        )
    pipeline = load_pipeline(
        model_path,
        args.architecture,
        args.model_repo,
        args.pipeline_source,
        bool(args.init_dir),
    )

    failures = []
    for item in plan:
        accepted = False
        for attempt in range(args.max_attempts):
            started = time.perf_counter()
            seed_offset = args.seed_offset + attempt
            seed = (item["seed"] + seed_offset * 2_654_435_761) & 0xFFFFFFFF
            generator = torch.Generator(device="cpu").manual_seed(seed)
            init_image = None
            pipeline_args = {
                "prompt": item["localPrompt"],
                "negative_prompt": item["localNegativePrompt"],
                "height": args.size,
                "width": args.size,
                "num_inference_steps": args.steps,
                "guidance_scale": args.guidance,
                "generator": generator,
            }
            if args.init_dir:
                init_path = args.init_dir / f"{item['id']}.png"
                if not init_path.is_file():
                    raise FileNotFoundError(f"Missing img2img input for {item['id']}: {init_path}")
                with Image.open(init_path) as source_image:
                    init_image = source_image.convert("RGB").resize(
                        (args.size, args.size), Image.Resampling.LANCZOS
                    )
                pipeline_args["image"] = init_image
                pipeline_args["strength"] = args.strength
            result = pipeline(
                **pipeline_args,
            ).images[0]
            if init_image is not None:
                init_image.close()
            feature = None
            failure = None
            max_similarity = -1.0
            similar_to = None
            crop_info = None
            if face_qc:
                if args.face_crop_scale:
                    cropped, crop_info, failure = face_qc.crop_primary(
                        result, args.face_crop_scale, args.size
                    )
                    if not failure and cropped is not None:
                        result.close()
                        result = cropped
                if not failure:
                    feature, failure = face_qc.extract(result)
                if not failure:
                    max_similarity, similar_to = face_qc.compare(feature)
                    if max_similarity >= args.similarity_threshold:
                        failure = "similar_face"
            if failure:
                rejected_path = rejected_dir / f"{item['id']}-seed-offset-{seed_offset}.png"
                result.save(rejected_path, format="PNG", optimize=True)
                print(json.dumps({
                    "id": item["id"],
                    "status": "rejected",
                    "reason": failure,
                    "path": str(rejected_path.resolve()),
                    "seed": seed,
                    "seedOffset": seed_offset,
                    "maxSimilarity": round(max_similarity, 6),
                    "similarTo": similar_to,
                    "crop": crop_info,
                    "seconds": round(time.perf_counter() - started, 2),
                }, ensure_ascii=False), flush=True)
                result.close()
                del result
                gc.collect()
                torch.cuda.empty_cache()
                continue
            destination = args.output_dir / f"{item['id']}.png"
            width, height = result.size
            result.save(destination, format="PNG", optimize=True)
            if face_qc and feature is not None:
                face_qc.accept(str(destination.resolve()), feature)
            print(json.dumps({
                "id": item["id"],
                "status": "accepted",
                "path": str(destination.resolve()),
                "bytes": destination.stat().st_size,
                "seed": seed,
                "seedOffset": seed_offset,
                "attempts": attempt + 1,
                "maxSimilarity": round(max_similarity, 6),
                "similarTo": similar_to,
                "crop": crop_info,
                "seconds": round(time.perf_counter() - started, 2),
                "width": width,
                "height": height,
                "model": args.model_repo,
                "initImage": str((args.init_dir / f"{item['id']}.png").resolve()) if args.init_dir else None,
                "strength": args.strength if args.init_dir else None,
            }, ensure_ascii=False), flush=True)
            result.close()
            del result
            gc.collect()
            torch.cuda.empty_cache()
            accepted = True
            break
        if not accepted:
            failures.append(item["id"])

    if failures:
        raise RuntimeError(f"No unique portrait found after {args.max_attempts} attempts: {', '.join(failures)}")


if __name__ == "__main__":
    main()
