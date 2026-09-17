// Generated from backend/research/results/pet_robustness*.csv by
// backend/research/build_frontend_data.py — do not hand-edit.
// See backend/research/FINDINGS.md for the full write-up and methodology.

export interface PetStudySeverityPoint {
  severity: number
  fineAccuracy: number
  coarseAccuracy: number
  correctCount: number
  withinSuperclassCount: number
  crossSuperclassCount: number
}

export interface PetStudyAxisResult {
  axis: string
  crossoverSeverity: number | null
  results: PetStudySeverityPoint[]
}

export interface PetStudyMeta {
  datasetName: string
  datasetUrl: string
  license: string
  imageCount: number
  breedCount: number
}

export const PET_STUDY_AXES: PetStudyAxisResult[] = [
  {
    axis: "blur",
    crossoverSeverity: 0.5,
    results: [
    { severity: 0.0, fineAccuracy: 0.8324, coarseAccuracy: 1.0, correctCount: 616, withinSuperclassCount: 124, crossSuperclassCount: 0 },
    { severity: 0.1, fineAccuracy: 0.777, coarseAccuracy: 0.9986, correctCount: 575, withinSuperclassCount: 164, crossSuperclassCount: 1 },
    { severity: 0.2, fineAccuracy: 0.6419, coarseAccuracy: 0.9689, correctCount: 475, withinSuperclassCount: 248, crossSuperclassCount: 17 },
    { severity: 0.3, fineAccuracy: 0.5, coarseAccuracy: 0.9419, correctCount: 370, withinSuperclassCount: 337, crossSuperclassCount: 33 },
    { severity: 0.4, fineAccuracy: 0.3811, coarseAccuracy: 0.8919, correctCount: 282, withinSuperclassCount: 390, crossSuperclassCount: 68 },
    { severity: 0.5, fineAccuracy: 0.2865, coarseAccuracy: 0.8419, correctCount: 212, withinSuperclassCount: 425, crossSuperclassCount: 103 },
    { severity: 0.6, fineAccuracy: 0.2243, coarseAccuracy: 0.7959, correctCount: 166, withinSuperclassCount: 438, crossSuperclassCount: 136 },
    { severity: 0.7, fineAccuracy: 0.177, coarseAccuracy: 0.7405, correctCount: 131, withinSuperclassCount: 429, crossSuperclassCount: 180 },
    { severity: 0.8, fineAccuracy: 0.1405, coarseAccuracy: 0.7189, correctCount: 104, withinSuperclassCount: 437, crossSuperclassCount: 199 },
    { severity: 0.9, fineAccuracy: 0.1162, coarseAccuracy: 0.7189, correctCount: 86, withinSuperclassCount: 449, crossSuperclassCount: 205 },
    { severity: 1.0, fineAccuracy: 0.1027, coarseAccuracy: 0.7014, correctCount: 76, withinSuperclassCount: 450, crossSuperclassCount: 214 },
    ],
  },
  {
    axis: "noise",
    crossoverSeverity: null,
    results: [
    { severity: 0.0, fineAccuracy: 0.8324, coarseAccuracy: 1.0, correctCount: 616, withinSuperclassCount: 124, crossSuperclassCount: 0 },
    { severity: 0.1, fineAccuracy: 0.8284, coarseAccuracy: 0.9986, correctCount: 613, withinSuperclassCount: 127, crossSuperclassCount: 0 },
    { severity: 0.2, fineAccuracy: 0.8351, coarseAccuracy: 0.9986, correctCount: 618, withinSuperclassCount: 122, crossSuperclassCount: 0 },
    { severity: 0.3, fineAccuracy: 0.8135, coarseAccuracy: 0.9986, correctCount: 602, withinSuperclassCount: 138, crossSuperclassCount: 0 },
    { severity: 0.4, fineAccuracy: 0.8216, coarseAccuracy: 1.0, correctCount: 608, withinSuperclassCount: 132, crossSuperclassCount: 0 },
    { severity: 0.5, fineAccuracy: 0.8176, coarseAccuracy: 0.9973, correctCount: 605, withinSuperclassCount: 135, crossSuperclassCount: 0 },
    { severity: 0.6, fineAccuracy: 0.8, coarseAccuracy: 1.0, correctCount: 592, withinSuperclassCount: 148, crossSuperclassCount: 0 },
    { severity: 0.7, fineAccuracy: 0.7946, coarseAccuracy: 1.0, correctCount: 588, withinSuperclassCount: 152, crossSuperclassCount: 0 },
    { severity: 0.8, fineAccuracy: 0.7851, coarseAccuracy: 0.9986, correctCount: 581, withinSuperclassCount: 159, crossSuperclassCount: 0 },
    { severity: 0.9, fineAccuracy: 0.7784, coarseAccuracy: 1.0, correctCount: 576, withinSuperclassCount: 164, crossSuperclassCount: 0 },
    { severity: 1.0, fineAccuracy: 0.7473, coarseAccuracy: 0.9959, correctCount: 553, withinSuperclassCount: 185, crossSuperclassCount: 2 },
    ],
  },
]

export const PET_STUDY_META: PetStudyMeta = {
  datasetName: "Oxford-IIIT Pet",
  datasetUrl: "https://huggingface.co/datasets/timm/oxford-iiit-pet",
  license: "CC BY-SA 4.0",
  imageCount: 740,
  breedCount: 37,
}
