"""Aggregate results/pet_robustness.csv into frontend/src/data/petStudyResults.ts.

Usage: python research/build_frontend_data.py
"""

import csv
import os
from collections import defaultdict

RESEARCH_DIR = os.path.dirname(__file__)
RESULTS_PATH = os.path.join(RESEARCH_DIR, "results", "pet_robustness.csv")
OUT_PATH = os.path.join(RESEARCH_DIR, "..", "..", "frontend", "src", "data", "petStudyResults.ts")

# A severity's cross-superclass error rate counts as "non-trivial" once it
# clears this fraction of all images — avoids calling a single stray
# misclassification a crossover point.
CROSSOVER_THRESHOLD = 0.10


def main() -> None:
    by_severity: dict[str, list[dict]] = defaultdict(list)
    breeds: set[str] = set()

    with open(RESULTS_PATH) as f:
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

    points_ts = ",\n".join(
        f"  {{ severity: {p['severity']}, fineAccuracy: {p['fineAccuracy']}, coarseAccuracy: {p['coarseAccuracy']}, "
        f"correctCount: {p['correctCount']}, withinSuperclassCount: {p['withinSuperclassCount']}, "
        f"crossSuperclassCount: {p['crossSuperclassCount']} }}"
        for p in points
    )

    content = f"""// Generated from backend/research/results/pet_robustness.csv by
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

export interface PetStudyMeta {{
  datasetName: string
  datasetUrl: string
  license: string
  imageCount: number
  breedCount: number
  axis: string
  crossoverSeverity: number | null
}}

export const PET_STUDY_RESULTS: PetStudySeverityPoint[] = [
{points_ts},
]

export const PET_STUDY_META: PetStudyMeta = {{
  datasetName: "Oxford-IIIT Pet",
  datasetUrl: "https://huggingface.co/datasets/timm/oxford-iiit-pet",
  license: "CC BY-SA 4.0",
  imageCount: {total_images},
  breedCount: {len(breeds)},
  axis: "blur",
  crossoverSeverity: {crossover_severity if crossover_severity is not None else "null"},
}}
"""

    with open(OUT_PATH, "w") as f:
        f.write(content)

    print(f"Wrote {OUT_PATH}")
    print(f"  {total_images} images, {len(breeds)} breeds, crossover severity: {crossover_severity}")


if __name__ == "__main__":
    main()
