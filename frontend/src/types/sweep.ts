export interface SweepResult {
  severity: number // 0–1
  similarity: number
  drift: number
  embedding: number[]
  confidence: number
  entropy: number
  topConcept: string
}

export type SweepStatus = "idle" | "running" | "done" | "error"
