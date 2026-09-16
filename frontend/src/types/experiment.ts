import type { ImageSource } from "./image"
import type { TransformState } from "./transform"

export interface Experiment {
  id: string
  name: string
  createdAt: number
  originalImage: ImageSource
  transform: TransformState
  similarity: number
  drift: number
}
