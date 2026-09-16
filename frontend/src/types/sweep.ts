export interface SweepResult {
  severity: number // 0–1
  similarity: number
  drift: number
  embedding: number[]
  confidence: number
  entropy: number
  topConcept: string
  /** Object URL for this step's actual transformed image — kept (not
   * revoked immediately) so a hovered point can show what the image really
   * looked like at that severity, not just its numbers. */
  thumbnailUrl: string
}

export type SweepStatus = "idle" | "running" | "done" | "error"
