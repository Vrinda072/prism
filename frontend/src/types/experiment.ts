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
  /** The transformed image's top semantic concept at save time, if the
   * Semantic Analysis panel had already loaded one — optional so a save
   * before that finishes doesn't fail. */
  topConcept?: { concept: string; score: number }
}
