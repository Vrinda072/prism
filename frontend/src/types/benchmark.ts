import type { ImageSource } from "./image"

export interface BenchmarkImage {
  id: string
  label: string
  source: ImageSource
}

export interface BenchmarkPoint {
  imageId: string
  imageLabel: string
  severity: number // 0–1
  similarity: number
  drift: number
  confidence: number
  entropy: number
  embedding: number[]
}

export type BenchmarkStatus = "idle" | "running" | "done" | "error"
