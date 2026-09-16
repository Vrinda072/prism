import { useEffect, useRef, useState } from "react"
import { ApiError, compareImages, getSemanticScores } from "../api/client"
import { applyTransform, loadImageElement } from "../lib/imageTransform"
import type { ImageSource } from "../types/image"
import type { SweepResult, SweepStatus } from "../types/sweep"
import { DEFAULT_TRANSFORM, type TransformState } from "../types/transform"

// Fixed severities, matching the study's own convention: 0%, 10%, ... 100%.
// Not configurable — a controlled single-variable experiment is the point.
export const SWEEP_SEVERITIES = Array.from({ length: 11 }, (_, i) => i / 10)

interface RobustnessSweep {
  status: SweepStatus
  results: SweepResult[]
  axis: keyof TransformState | null
  error: string | null
  total: number
  run: (axis: keyof TransformState) => void
  cancel: () => void
}

/** Owns the sequential, cancellable, real-inference sweep loop — kept
 * separate from RobustnessSweep.tsx so ML orchestration doesn't get
 * tangled with rendering. Each step is a real forward pass through
 * /compare and /semantic; nothing here is simulated. */
export function useRobustnessSweep(originalImage: ImageSource | null): RobustnessSweep {
  const [status, setStatus] = useState<SweepStatus>("idle")
  const [results, setResults] = useState<SweepResult[]>([])
  const [axis, setAxis] = useState<keyof TransformState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // A sweep is only meaningful for the image it was run against.
  useEffect(() => {
    controllerRef.current?.abort()
    setStatus("idle")
    setResults([])
    setAxis(null)
    setError(null)
  }, [originalImage])

  const cancel = () => {
    controllerRef.current?.abort()
    setStatus("idle")
  }

  const run = (selectedAxis: keyof TransformState) => {
    if (!originalImage) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setAxis(selectedAxis)
    setResults([])
    setStatus("running")
    setError(null)

    ;(async () => {
      const img = await loadImageElement(originalImage.url)

      for (const severity of SWEEP_SEVERITIES) {
        if (controller.signal.aborted) return

        const transform: TransformState = { ...DEFAULT_TRANSFORM, [selectedAxis]: severity }
        const transformed = await applyTransform(img, transform)
        URL.revokeObjectURL(transformed.url)

        const [compareRes, semanticRes] = await Promise.all([
          compareImages(originalImage.blob, transformed.blob, controller.signal),
          getSemanticScores(transformed.blob, controller.signal),
        ])

        if (controller.signal.aborted) return

        const result: SweepResult = {
          severity,
          similarity: compareRes.similarity,
          drift: compareRes.drift,
          embedding: compareRes.transformed_embedding,
          confidence: semanticRes.confidence,
          entropy: semanticRes.entropy,
          topConcept: semanticRes.top_concept,
        }
        setResults((prev) => [...prev, result])
      }

      setStatus("done")
    })().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return
      setStatus("error")
      setError(err instanceof ApiError ? err.message : "The sweep failed partway through. Please try again.")
    })
  }

  return { status, results, axis, error, total: SWEEP_SEVERITIES.length, run, cancel }
}
