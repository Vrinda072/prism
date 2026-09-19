import type { ImageSource } from "./image"
import type { ConceptScore } from "./semantic"
import type { TransformState } from "./transform"

/** One severity's worth of real, measured results for a single perturbation
 * axis — a real CLIP forward pass, never interpolated or estimated between
 * tested points. Every view in the app (image, curve, trajectory, semantic
 * panel) reads the same step objects instead of recomputing anything. */
export interface ExperimentStep {
  severity: number
  thumbnailUrl: string
  similarity: number
  drift: number
  latencyMs: number
  embedding: number[]
  /** 2D PCA projection of `embedding`, filled in once the full sweep's
   * embeddings have been projected together — null until then. */
  projected: [number, number] | null
  concepts: ConceptScore[]
  topConcept: string
  confidence: number
  entropy: number
}

export type ExperimentStatus = "idle" | "running" | "done" | "error"

/** A user-named snapshot of one (image, axis, severity) point, kept for this
 * browser session only. Restoring one re-selects that image, axis, and
 * severity — the real steps are re-run, not replayed from stored numbers. */
export interface SavedExperiment {
  id: string
  name: string
  createdAt: number
  originalImage: ImageSource
  axis: keyof TransformState
  severity: number
  similarity: number
  drift: number
  topConcept?: { concept: string; score: number }
}
