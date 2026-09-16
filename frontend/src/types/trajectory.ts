import type { TransformState } from "./transform"

export interface TrajectoryPoint {
  id: string
  transform: TransformState
  similarity: number
  drift: number
  embedding: number[]
}
