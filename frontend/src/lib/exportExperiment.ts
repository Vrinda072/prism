import { AXIS_LABELS } from "./axisLabels"
import type { ExperimentStep } from "../types/experiment"
import type { ImageSource } from "../types/image"
import type { TransformState } from "../types/transform"

export const MODEL_NAME = "CLIP ViT-B/32"

export interface PredictionFlip {
  severity: number
  from: string
  to: string
}

export interface ExperimentSummaryData {
  model: string
  image: string
  perturbation: string
  severities: number[]
  representation: {
    initialSimilarity: number
    finalSimilarity: number
    totalDrift: number
    trajectory: "monotonically decreasing" | "non-monotonic"
  }
  semantic: {
    initialPrediction: string
    initialConfidence: number
    finalPrediction: string
    finalConfidence: number
    predictionFlips: PredictionFlip[]
    initialEntropy: number
    finalEntropy: number
  }
  taskPerformance: string
}

/** Every field here is read directly off a completed sweep's real steps —
 * nothing is estimated, interpolated, or generated. Requires the full
 * 11-point sweep (not a partial/in-progress one) so "final" genuinely means
 * the last tested severity. */
export function buildExperimentSummary(
  image: ImageSource,
  axis: keyof TransformState,
  steps: ExperimentStep[],
): ExperimentSummaryData | null {
  if (steps.length < 2) return null
  const first = steps[0]
  const last = steps[steps.length - 1]

  const predictionFlips: PredictionFlip[] = []
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].topConcept !== steps[i - 1].topConcept) {
      predictionFlips.push({ severity: steps[i].severity, from: steps[i - 1].topConcept, to: steps[i].topConcept })
    }
  }

  const isMonotonic = steps.every((s, i) => i === 0 || s.similarity <= steps[i - 1].similarity)

  return {
    model: MODEL_NAME,
    image: image.label ?? "Uploaded image",
    perturbation: AXIS_LABELS[axis],
    severities: steps.map((s) => s.severity),
    representation: {
      initialSimilarity: first.similarity,
      finalSimilarity: last.similarity,
      totalDrift: last.drift,
      trajectory: isMonotonic ? "monotonically decreasing" : "non-monotonic",
    },
    semantic: {
      initialPrediction: first.topConcept,
      initialConfidence: first.confidence,
      finalPrediction: last.topConcept,
      finalConfidence: last.confidence,
      predictionFlips,
      initialEntropy: first.entropy,
      finalEntropy: last.entropy,
    },
    taskPerformance:
      "Not applicable — this image has no ground-truth label. Accuracy under real labels is reported separately in the Oxford-IIIT Pet dataset study below.",
  }
}

export function downloadExperimentSummary(summary: ExperimentSummaryData): void {
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `prism-experiment-${summary.perturbation.toLowerCase()}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
