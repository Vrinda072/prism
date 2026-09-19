import type { TransformState } from "../types/transform"

export const AXIS_LABELS: Record<keyof TransformState, string> = {
  blur: "Blur",
  noise: "Noise",
  brightness: "Brightness",
  contrast: "Contrast",
  rotation: "Rotation",
  compression: "Compression",
}
