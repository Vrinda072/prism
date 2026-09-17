"""Build a small local stratified sample of the Oxford-IIIT Pet dataset.

Streams timm/oxford-iiit-pet (Hugging Face Hub, CC BY-SA 4.0) instead of
downloading the full ~790MB parquet files — this machine has limited free
disk space, and the study only needs ~20 images per breed, not the whole
dataset. Only the sampled images ever get written locally.

Usage: python research/sample_dataset.py
"""

import csv
import os

from datasets import load_dataset

OUT_DIR = os.path.join(os.path.dirname(__file__), "data", "oxford_pets")
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "data", "manifest.csv")
IMAGES_PER_BREED = 20

# Official label ordering, from the dataset's own class_label feature.
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


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for breed in BREED_NAMES:
        os.makedirs(os.path.join(OUT_DIR, breed), exist_ok=True)

    counts = {breed: 0 for breed in BREED_NAMES}
    manifest_rows = []

    print("Streaming timm/oxford-iiit-pet (train split) — sampling in place, not downloading whole file...")
    ds = load_dataset("timm/oxford-iiit-pet", split="train", streaming=True)

    for row in ds:
        breed = BREED_NAMES[row["label"]]
        if counts[breed] >= IMAGES_PER_BREED:
            continue

        filename = f"{row['image_id']}.jpg"
        path = os.path.join(OUT_DIR, breed, filename)
        row["image"].convert("RGB").save(path, "JPEG", quality=90)

        counts[breed] += 1
        manifest_rows.append(
            {
                "path": os.path.relpath(path, os.path.dirname(__file__)),
                "breed": breed,
                "coarse": COARSE_NAMES[row["label_cat_dog"]],
                "image_id": row["image_id"],
            }
        )

        if all(c >= IMAGES_PER_BREED for c in counts.values()):
            break

    with open(MANIFEST_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "breed", "coarse", "image_id"])
        writer.writeheader()
        writer.writerows(manifest_rows)

    total = sum(counts.values())
    short = {b: c for b, c in counts.items() if c < IMAGES_PER_BREED}
    print(f"Sampled {total} images across {len(BREED_NAMES)} breeds -> {MANIFEST_PATH}")
    if short:
        print(f"Note: these breeds had fewer than {IMAGES_PER_BREED} available in the stream: {short}")


if __name__ == "__main__":
    main()
