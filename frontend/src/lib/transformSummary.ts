import { AXIS_LABELS } from "./axisLabels"
import type { TransformState } from "../types/transform"

export function describeExperiment(axis: keyof TransformState, severity: number): string {
  return `${AXIS_LABELS[axis]} ${Math.round(severity * 100)}%`
}
