import { useEffect, useRef, useState } from "react"
import { ApiError, compareImages, getSemanticScores } from "../api/client"
import { applyTransform, loadImageElement } from "../lib/imageTransform"
import type { ImageSource } from "../types/image"
import type { SweepResult, SweepStatus } from "../types/sweep"
import { DEFAULT_TRANSFORM, type TransformState } from "../types/transform"

// Fixed severities, matching the study's own convention: 0%, 10%, ... 100%.
// Not configurable — a controlled single-variable experiment is the point.
export const SWEEP_SEVERITIES = Array.from({ length: 11 }, (_, i) => i / 10)

// All perturbation axes, derived from the transform shape itself so a new
// axis (e.g. contrast) automatically becomes sweepable without a second
// list to keep in sync.
export const ALL_AXES = Object.keys(DEFAULT_TRANSFORM) as (keyof TransformState)[]

type ResultsByAxis = Partial<Record<keyof TransformState, SweepResult[]>>

interface RobustnessSweep {
  status: SweepStatus
  resultsByAxis: ResultsByAxis
  activeAxis: keyof TransformState | null
  error: string | null
  progress: number
  total: number
  run: (axis: keyof TransformState) => void
  runAll: () => void
  cancel: () => void
  selectAxis: (axis: keyof TransformState) => void
}

/** Owns the sequential, cancellable, real-inference sweep loop(s) — kept
 * separate from RobustnessSweep.tsx so ML orchestration doesn't get
 * tangled with rendering. Every step is a real forward pass through
 * /compare and /semantic; nothing here is simulated. */
export function useRobustnessSweep(originalImage: ImageSource | null): RobustnessSweep {
  const [status, setStatus] = useState<SweepStatus>("idle")
  const [resultsByAxis, setResultsByAxis] = useState<ResultsByAxis>({})
  const [activeAxis, setActiveAxis] = useState<keyof TransformState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(SWEEP_SEVERITIES.length)
  const controllerRef = useRef<AbortController | null>(null)
  const thumbnailUrlsRef = useRef<string[]>([])

  const revokeThumbnails = () => {
    thumbnailUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    thumbnailUrlsRef.current = []
  }

  // A sweep is only meaningful for the image it was run against.
  useEffect(() => {
    controllerRef.current?.abort()
    revokeThumbnails()
    setStatus("idle")
    setResultsByAxis({})
    setActiveAxis(null)
    setError(null)
    setProgress(0)
  }, [originalImage])

  useEffect(() => revokeThumbnails, [])

  const cancel = () => {
    controllerRef.current?.abort()
    setStatus("idle")
  }

  /** Sweeps one axis through all fixed severities, reporting each real
   * result as it completes via onResult (used to update progress live
   * whether this axis is run alone or as part of runAll). */
  const sweepOneAxis = async (
    axis: keyof TransformState,
    img: HTMLImageElement,
    signal: AbortSignal,
    onResult: (result: SweepResult) => void,
  ): Promise<SweepResult[]> => {
    if (!originalImage) return []
    const results: SweepResult[] = []

    for (const severity of SWEEP_SEVERITIES) {
      if (signal.aborted) return results

      const transform: TransformState = { ...DEFAULT_TRANSFORM, [axis]: severity }
      const transformed = await applyTransform(img, transform)
      thumbnailUrlsRef.current.push(transformed.url)

      const [compareRes, semanticRes] = await Promise.all([
        compareImages(originalImage.blob, transformed.blob, signal),
        getSemanticScores(transformed.blob, signal),
      ])

      if (signal.aborted) return results

      const result: SweepResult = {
        severity,
        similarity: compareRes.similarity,
        drift: compareRes.drift,
        embedding: compareRes.transformed_embedding,
        confidence: semanticRes.confidence,
        entropy: semanticRes.entropy,
        topConcept: semanticRes.top_concept,
        thumbnailUrl: transformed.url,
      }
      results.push(result)
      onResult(result)
    }

    return results
  }

  const run = (axis: keyof TransformState) => {
    if (!originalImage) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setActiveAxis(axis)
    setResultsByAxis((prev) => ({ ...prev, [axis]: [] }))
    setStatus("running")
    setError(null)
    setProgress(0)
    setTotal(SWEEP_SEVERITIES.length)

    loadImageElement(originalImage.url)
      .then((img) =>
        sweepOneAxis(axis, img, controller.signal, (result) => {
          setResultsByAxis((prev) => ({ ...prev, [axis]: [...(prev[axis] ?? []), result] }))
          setProgress((p) => p + 1)
        }),
      )
      .then(() => {
        if (!controller.signal.aborted) setStatus("done")
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setStatus("error")
        setError(err instanceof ApiError ? err.message : "The sweep failed partway through. Please try again.")
      })
  }

  const runAll = () => {
    if (!originalImage) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setResultsByAxis({})
    setActiveAxis(null)
    setStatus("running")
    setError(null)
    setProgress(0)
    setTotal(ALL_AXES.length * SWEEP_SEVERITIES.length)

    ;(async () => {
      const img = await loadImageElement(originalImage.url)
      for (const axis of ALL_AXES) {
        if (controller.signal.aborted) return
        setActiveAxis((prev) => prev ?? axis)
        await sweepOneAxis(axis, img, controller.signal, (result) => {
          setResultsByAxis((prev) => ({ ...prev, [axis]: [...(prev[axis] ?? []), result] }))
          setProgress((p) => p + 1)
        })
      }
      if (!controller.signal.aborted) setStatus("done")
    })().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return
      setStatus("error")
      setError(err instanceof ApiError ? err.message : "The comparison failed partway through. Please try again.")
    })
  }

  return {
    status,
    resultsByAxis,
    activeAxis,
    error,
    progress,
    total,
    run,
    runAll,
    cancel,
    selectAxis: setActiveAxis,
  }
}
