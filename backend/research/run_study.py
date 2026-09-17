"""Fine-vs-coarse-grained corruption robustness study on Oxford-IIIT Pet.

Research question: as corruption severity increases, does CLIP's zero-shot
classifier confuse fine-grained distinctions (breed vs. breed) before it
confuses coarse-grained ones (cat vs. dog) -- or do both collapse together?
Run once with --axis blur and once with --axis noise to see whether the
pattern found for blur is specific to that corruption or holds generally.

Reuses PRISM's actual inference stack (ModelService, embedding_service,
semantic_service's prompt-ensembling) by importing it directly, so this
offline study uses the exact same methodology the live app does, just with
real ground-truth labels and dataset scale.

Usage: python research/run_study.py [--axis blur|noise]
Requires: python research/sample_dataset.py has already been run.
"""

import argparse
import csv
import os
import sys
import time

import numpy as np
import torch
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import embedding_service, semantic_service  # noqa: E402
from app.services.model_service import ModelService  # noqa: E402

RESEARCH_DIR = os.path.dirname(__file__)
MANIFEST_PATH = os.path.join(RESEARCH_DIR, "data", "manifest.csv")

SEVERITIES = [i / 10 for i in range(11)]
MAX_BLUR_PX = 20  # mirrors frontend/src/lib/imageTransform.ts's TRANSFORM_CONFIG.maxBlurPx
MAX_NOISE_STD_DEV = 45  # mirrors the same file's TRANSFORM_CONFIG.maxNoiseStdDev
NOISE_SEED = 42  # fixed so the study itself is reproducible run to run

BREED_NAMES = [
    "abyssinian", "american_bulldog", "american_pit_bull_terrier", "basset_hound", "beagle",
    "bengal", "birman", "bombay", "boxer", "british_shorthair", "chihuahua", "egyptian_mau",
    "english_cocker_spaniel", "english_setter", "german_shorthaired", "great_pyrenees",
    "havanese", "japanese_chin", "keeshond", "leonberger", "maine_coon", "miniature_pinscher",
    "newfoundland", "persian", "pomeranian", "pug", "ragdoll", "russian_blue", "saint_bernard",
    "samoyed", "scottish_terrier", "shiba_inu", "siamese", "sphynx", "staffordshire_bull_terrier",
    "wheaten_terrier", "yorkshire_terrier",
]
COARSE_NAMES = ["cat", "dog"]


def apply_blur(image: Image.Image, severity: float) -> Image.Image:
    """Gaussian blur, same parameterization as the live app's canvas
    `filter: blur(Npx)` -- CSS's blur() std-deviation equals the pixel
    value given, which is exactly what PIL's GaussianBlur radius means."""
    if severity <= 0:
        return image
    return image.filter(ImageFilter.GaussianBlur(radius=severity * MAX_BLUR_PX))


def apply_noise(image: Image.Image, severity: float, rng: np.random.Generator) -> Image.Image:
    """Per-pixel Gaussian noise, same parameterization as the live app's
    canvas noise pass -- std dev = severity * maxNoiseStdDev, added to each
    RGB channel independently and clipped back to [0, 255]."""
    if severity <= 0:
        return image
    arr = np.asarray(image, dtype=np.float32)
    noise = rng.normal(0, severity * MAX_NOISE_STD_DEV, arr.shape)
    return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))


def apply_corruption(axis: str, image: Image.Image, severity: float, rng: np.random.Generator) -> Image.Image:
    if axis == "blur":
        return apply_blur(image, severity)
    if axis == "noise":
        return apply_noise(image, severity, rng)
    raise ValueError(f"Unknown axis: {axis}")


def classify(text_embeddings: torch.Tensor, image_embedding: torch.Tensor, logit_scale: torch.Tensor) -> int:
    logits = logit_scale * text_embeddings @ image_embedding
    return int(torch.argmax(logits).item())


def load_manifest() -> list[dict]:
    with open(MANIFEST_PATH) as f:
        return list(csv.DictReader(f))


def load_done_keys(results_path: str) -> set[tuple[str, str]]:
    if not os.path.exists(results_path):
        return set()
    with open(results_path) as f:
        return {(row["image_id"], row["severity"]) for row in csv.DictReader(f)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--axis", choices=["blur", "noise"], default="blur")
    args = parser.parse_args()
    axis = args.axis

    # blur kept its original filename (already-committed results); noise
    # (and any future axis) gets its own file rather than mixing rows from
    # different corruptions into one CSV.
    results_path = os.path.join(RESEARCH_DIR, "results", "pet_robustness.csv" if axis == "blur" else f"pet_robustness_{axis}.csv")
    rng = np.random.default_rng(NOISE_SEED)

    manifest = load_manifest()
    done = load_done_keys(results_path)
    print(f"axis={axis} | {len(manifest)} images in manifest, {len(done)} (image, severity) rows already done")

    model_service = ModelService()
    print("Loading CLIP ViT-B/32...")
    model_service.load()
    logit_scale = model_service.model.logit_scale.exp()

    print("Building fine (37-breed) and coarse (cat/dog) text embeddings...")
    fine_embeddings = torch.stack(
        [semantic_service.get_ensembled_text_embedding(model_service, b.replace("_", " ")) for b in BREED_NAMES]
    )
    coarse_embeddings = torch.stack(
        [semantic_service.get_ensembled_text_embedding(model_service, c) for c in COARSE_NAMES]
    )

    is_new_file = not os.path.exists(results_path)
    fieldnames = [
        "image_id", "breed", "coarse", "severity", "drift",
        "fine_pred", "fine_correct", "coarse_pred", "coarse_correct", "error_type",
    ]
    out = open(results_path, "a", newline="")
    writer = csv.DictWriter(out, fieldnames=fieldnames)
    if is_new_file:
        writer.writeheader()

    start = time.time()
    n_done_this_run = 0
    total_steps = len(manifest) * len(SEVERITIES)

    for i, row in enumerate(manifest):
        breed = row["breed"]
        coarse = row["coarse"]
        breed_idx = BREED_NAMES.index(breed)
        coarse_idx = COARSE_NAMES.index(coarse)

        # manifest paths are relative to research/ and already include the breed subdir
        image_path = os.path.join(RESEARCH_DIR, row["path"])
        image = Image.open(image_path).convert("RGB")

        clean_embedding = None

        for severity in SEVERITIES:
            key = (row["image_id"], str(severity))
            if key in done:
                continue

            transformed = apply_corruption(axis, image, severity, rng)
            with torch.no_grad():
                img_embedding = embedding_service.get_embedding(model_service, transformed)

            if severity == 0:
                clean_embedding = img_embedding

            drift = 1 - embedding_service.cosine_similarity(clean_embedding, img_embedding)

            with torch.no_grad():
                fine_pred_idx = classify(fine_embeddings, img_embedding, logit_scale)
                coarse_pred_idx = classify(coarse_embeddings, img_embedding, logit_scale)

            fine_correct = fine_pred_idx == breed_idx
            coarse_correct = coarse_pred_idx == coarse_idx
            error_type = "correct" if fine_correct else ("within_superclass" if coarse_correct else "cross_superclass")

            writer.writerow(
                {
                    "image_id": row["image_id"],
                    "breed": breed,
                    "coarse": coarse,
                    "severity": severity,
                    "drift": round(drift, 4),
                    "fine_pred": BREED_NAMES[fine_pred_idx],
                    "fine_correct": fine_correct,
                    "coarse_pred": COARSE_NAMES[coarse_pred_idx],
                    "coarse_correct": coarse_correct,
                    "error_type": error_type,
                }
            )
            n_done_this_run += 1

        if n_done_this_run and (i + 1) % 25 == 0:
            out.flush()
            elapsed = time.time() - start
            rate = n_done_this_run / elapsed
            remaining = (total_steps - len(done) - n_done_this_run) / rate if rate > 0 else 0
            print(f"  {i + 1}/{len(manifest)} images | {n_done_this_run} rows this run | ~{remaining / 60:.1f} min left")

    out.close()
    print(f"Done. {n_done_this_run} new rows written -> {results_path}")


if __name__ == "__main__":
    main()
