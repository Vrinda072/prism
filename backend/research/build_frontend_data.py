"""Aggregate results/pet_robustness*.csv into frontend/src/data/petStudyResults.ts.

Usage: python research/build_frontend_data.py
"""

import csv
import os
from collections import defaultdict

RESEARCH_DIR = os.path.dirname(__file__)
RESULTS_DIR = os.path.join(RESEARCH_DIR, "results")
OUT_PATH = os.path.join(RESEARCH_DIR, "..", "..", "frontend", "src", "data", "petStudyResults.ts")

AXIS_FILES = {"blur": "pet_robustness.csv", "noise": "pet_robustness_noise.csv"}

# A severity's cross-superclass error rate counts as "non-trivial" once it
# clears this fraction of all images — avoids calling a single stray
# misclassification a crossover point.
CROSSOVER_THRESHOLD = 0.10


def aggregate_axis(path: str) -> tuple[list[dict], float | None, int, int]:
    by_severity: dict[str, list[dict]] = defaultdict(list)
    breeds: set[str] = set()

    with open(path) as f:
        for row in csv.DictReader(f):
            by_severity[row["severity"]].append(row)
            breeds.add(row["breed"])

    severities = sorted(by_severity.keys(), key=float)
    points = []
    crossover_severity = None

    for severity in severities:
        rows = by_severity[severity]
        n = len(rows)
        fine_acc = sum(r["fine_correct"] == "True" for r in rows) / n
        coarse_acc = sum(r["coarse_correct"] == "True" for r in rows) / n
        correct = sum(r["error_type"] == "correct" for r in rows)
        within = sum(r["error_type"] == "within_superclass" for r in rows)
        cross = sum(r["error_type"] == "cross_superclass" for r in rows)

        if crossover_severity is None and cross / n >= CROSSOVER_THRESHOLD:
            crossover_severity = float(severity)

        points.append(
            {
                "severity": float(severity),
                "fineAccuracy": round(fine_acc, 4),
                "coarseAccuracy": round(coarse_acc, 4),
                "correctCount": correct,
                "withinSuperclassCount": within,
                "crossSuperclassCount": cross,
            }
        )

    total_images = len(by_severity[severities[0]])
    return points, crossover_severity, total_images, len(breeds)


def points_to_ts(points: list[dict]) -> str:
    return ",\n".join(
        f"    {{ severity: {p['severity']}, fineAccuracy: {p['fineAccuracy']}, coarseAccuracy: {p['coarseAccuracy']}, "
        f"correctCount: {p['correctCount']}, withinSuperclassCount: {p['withinSuperclassCount']}, "
        f"crossSuperclassCount: {p['crossSuperclassCount']} }}"
        for p in points
    )


def main() -> None:
    axis_blocks = []
    total_images = 0
    breed_count = 37

    for axis, filename in AXIS_FILES.items():
        path = os.path.join(RESULTS_DIR, filename)
        if not os.path.exists(path):
            print(f"Skipping axis={axis}: {path} not found")
            continue

        points, crossover, total_images, breed_count = aggregate_axis(path)
        crossover_ts = crossover if crossover is not None else "null"
        axis_blocks.append(
            f"""  {{
    axis: "{axis}",
    crossoverSeverity: {crossover_ts},
    results: [
{points_to_ts(points)},
    ],
  }}"""
        )
        print(f"axis={axis}: {total_images} images, {breed_count} breeds, crossover severity: {crossover}")

    axes_ts = ",\n".join(axis_blocks)

    content = f"""// Generated from backend/research/results/pet_robustness*.csv by
// backend/research/build_frontend_data.py — do not hand-edit.
// See backend/research/FINDINGS.md for the full write-up and methodology.

export interface PetStudySeverityPoint {{
  severity: number
  fineAccuracy: number
  coarseAccuracy: number
  correctCount: number
  withinSuperclassCount: number
  crossSuperclassCount: number
}}

export interface PetStudyAxisResult {{
  axis: string
  crossoverSeverity: number | null
  results: PetStudySeverityPoint[]
}}

export interface PetStudyMeta {{
  datasetName: string
  datasetUrl: string
  license: string
  imageCount: number
  breedCount: number
}}

export const PET_STUDY_AXES: PetStudyAxisResult[] = [
{axes_ts},
]

export const PET_STUDY_META: PetStudyMeta = {{
  datasetName: "Oxford-IIIT Pet",
  datasetUrl: "https://huggingface.co/datasets/timm/oxford-iiit-pet",
  license: "CC BY-SA 4.0",
  imageCount: {total_images},
  breedCount: {breed_count},
}}
"""

    with open(OUT_PATH, "w") as f:
        f.write(content)

    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
