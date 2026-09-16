import type { TransformState } from "../types/transform"

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function summarizeTransform(t: TransformState): string {
  const active = Object.entries(t)
    .filter(([, v]) => v > 0)
    .map(([key, v]) => `${capitalize(key)} ${Math.round(v * 100)}%`)
  return active.length > 0 ? active.join(", ") : "No perturbation"
}
