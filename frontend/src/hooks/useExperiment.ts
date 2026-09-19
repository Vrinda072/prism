import { useEffect, useRef, useState } from "react"
import { ApiError, compareImages, getSemanticScores, projectEmbeddings } from "../api/client"
import { applyTransform, loadImageElement } from "../lib/imageTransform"
import type { ExperimentStatus, ExperimentStep } from "../types/experiment"
import type { ImageSource } from "../types/image"
import { DEFAULT_TRANSFORM, type TransformState } from "../types/transform"

// Fixed severities, matching the study's own convention: 0%, 10%, ... 100%.
// Not configurable — a controlled single-variable experiment is the point,
// and every reported number is a real forward pass at one of these points,
// never interpolated between them.
export const SWEEP_SEVERITIES = Array.from({ length: 11 }, (_, i) => i / 10)

// All perturbation axes, derived from the transform shape itself so a new
// axis automatically becomes available everywhere without a second list to
// keep in sync.
export const ALL_AXES = Object.keys(DEFAULT_TRANSFORM) as (keyof TransformState)[]

type Axis = keyof TransformState
type StepsByAxis = Partial<Record<Axis, ExperimentStep[]>>

function nearestSeverity(value: number): number {
  return SWEEP_SEVERITIES.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a))
}

interface UseExperiment {
  axis: Axis
  setAxis: (axis: Axis) => void
  steps: ExperimentStep[]
  baselineStep: ExperimentStep | null
  activeSeverity: number
  setActiveSeverity: (severity: number) => void
  activeStep: ExperimentStep | null
  status: ExperimentStatus
  progress: number
  total: number
  error: string | null
  retry: () => void
  comparisonByAxis: StepsByAxis
  comparisonStatus: ExperimentStatus
  comparisonProgress: number
  comparisonTotal: number
  runComparison: () => void
  cancelComparison: () => void
}

/** Owns the one Experiment every view in the app reads from: a real,
 * cancellable severity sweep of a single image against a single
 * perturbation axis. Every step is a genuine /compare + /semantic forward
 * pass; nothing here is simulated or interpolated. Switching the axis or
 * the source image re-runs the sweep from scratch rather than replaying
 * stale numbers. A separate, independent "comparison" run (runComparison)
 * sweeps every axis once, for the cross-perturbation view. */
export function useExperiment(originalImage: ImageSource | null): UseExperiment {
  const [axis, setAxis] = useState<Axis>("blur")
  const [steps, setSteps] = useState<ExperimentStep[]>([])
  const [status, setStatus] = useState<ExperimentStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(SWEEP_SEVERITIES.length)
  const [activeSeverity, setActiveSeverityState] = useState(SWEEP_SEVERITIES[0])
  const [retryNonce, setRetryNonce] = useState(0)

  const [comparisonByAxis, setComparisonByAxis] = useState<StepsByAxis>({})
  const [comparisonStatus, setComparisonStatus] = useState<ExperimentStatus>("idle")
  const [comparisonProgress, setComparisonProgress] = useState(0)
  const [comparisonTotal, setComparisonTotal] = useState(ALL_AXES.length * SWEEP_SEVERITIES.length)

  const mainControllerRef = useRef<AbortController | null>(null)
  const comparisonControllerRef = useRef<AbortController | null>(null)
  const thumbnailUrlsRef = useRef<string[]>([])

  const revokeThumbnails = () => {
    thumbnailUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    thumbnailUrlsRef.current = []
  }

  const setActiveSeverity = (value: number) => setActiveSeverityState(nearestSeverity(value))

  const sweepOneAxis = async (
    targetAxis: Axis,
    img: HTMLImageElement,
    source: ImageSource,
    signal: AbortSignal,
    onResult: (result: ExperimentStep) => void,
  ): Promise<ExperimentStep[]> => {
    const results: ExperimentStep[] = []

    for (const severity of SWEEP_SEVERITIES) {
      if (signal.aborted) return results

      const transform: TransformState = { ...DEFAULT_TRANSFORM, [targetAxis]: severity }
      const transformed = await applyTransform(img, transform)
      thumbnailUrlsRef.current.push(transformed.url)

      const [compareRes, semanticRes] = await Promise.all([
        compareImages(source.blob, transformed.blob, signal),
        getSemanticScores(transformed.blob, signal),
      ])
      if (signal.aborted) return results

      const result: ExperimentStep = {
        severity,
        thumbnailUrl: transformed.url,
        similarity: compareRes.similarity,
        drift: compareRes.drift,
        latencyMs: compareRes.latency_ms,
        embedding: compareRes.transformed_embedding,
        projected: null,
        concepts: semanticRes.concepts,
        topConcept: semanticRes.top_concept,
        confidence: semanticRes.confidence,
        entropy: semanticRes.entropy,
      }
      results.push(result)
      onResult(result)
    }

    return results
  }

  /** PCA is only meaningful across a whole sweep at once — projecting one
   * embedding at a time would be a different, uncomparable 2D space per
   * point. Run once the sweep finishes, then merge the 2D points back onto
   * the already-rendered steps. */
  const projectSteps = async (
    results: ExperimentStep[],
    signal: AbortSignal,
    apply: (points: [number, number][]) => void,
  ) => {
    if (results.length < 2) return
    try {
      const res = await projectEmbeddings(
        results.map((r) => r.embedding),
        signal,
      )
      apply(res.points)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      // Projection is supplementary — the curve and numbers alone still tell the real story.
    }
  }

  // The source image changing invalidates everything: the sweep, the
  // comparison, every cached embedding and thumbnail.
  useEffect(() => {
    mainControllerRef.current?.abort()
    comparisonControllerRef.current?.abort()
    revokeThumbnails()
    setSteps([])
    setStatus("idle")
    setError(null)
    setComparisonByAxis({})
    setComparisonStatus("idle")
  }, [originalImage])

  useEffect(() => revokeThumbnails, [])

  // The single source of truth: re-runs the full severity sweep whenever
  // the image or the selected axis changes. Nothing is cached across axes —
  // switching axes is a fresh controlled run, not a replay of old numbers.
  useEffect(() => {
    if (!originalImage) return

    mainControllerRef.current?.abort()
    const controller = new AbortController()
    mainControllerRef.current = controller
    const source = originalImage

    setSteps([])
    setError(null)
    setProgress(0)
    setTotal(SWEEP_SEVERITIES.length)
    setStatus("running")

    loadImageElement(source.url)
      .then((img) =>
        sweepOneAxis(axis, img, source, controller.signal, (result) => {
          setSteps((prev) => [...prev, result])
          setProgress((p) => p + 1)
        }),
      )
      .then(async (results) => {
        if (controller.signal.aborted) return
        await projectSteps(results, controller.signal, (points) => {
          if (controller.signal.aborted) return
          setSteps((prev) =>
            prev.length === points.length ? prev.map((s, i) => ({ ...s, projected: points[i] })) : prev,
          )
        })
        if (!controller.signal.aborted) setStatus("done")
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setStatus("error")
        setError(err instanceof ApiError ? err.message : "The experiment failed partway through. Please try again.")
      })

    return () => controller.abort()
    // originalImage is intentionally the only external identity this effect
    // keys on — a new File/sample produces a new ImageSource reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage, axis, retryNonce])

  const retry = () => setRetryNonce((n) => n + 1)

  const runComparison = () => {
    if (!originalImage) return
    comparisonControllerRef.current?.abort()
    const controller = new AbortController()
    comparisonControllerRef.current = controller
    const source = originalImage

    setComparisonByAxis({})
    setComparisonStatus("running")
    setComparisonProgress(0)
    setComparisonTotal(ALL_AXES.length * SWEEP_SEVERITIES.length)

    ;(async () => {
      const img = await loadImageElement(source.url)
      for (const targetAxis of ALL_AXES) {
        if (controller.signal.aborted) return
        const results = await sweepOneAxis(targetAxis, img, source, controller.signal, (result) => {
          setComparisonByAxis((prev) => ({ ...prev, [targetAxis]: [...(prev[targetAxis] ?? []), result] }))
          setComparisonProgress((p) => p + 1)
        })
        if (controller.signal.aborted) return
        await projectSteps(results, controller.signal, (points) => {
          setComparisonByAxis((prev) => {
            const current = prev[targetAxis]
            if (!current || current.length !== points.length) return prev
            return { ...prev, [targetAxis]: current.map((s, i) => ({ ...s, projected: points[i] })) }
          })
        })
      }
      if (!controller.signal.aborted) setComparisonStatus("done")
    })().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return
      setComparisonStatus("error")
    })
  }

  const cancelComparison = () => {
    comparisonControllerRef.current?.abort()
    setComparisonStatus("idle")
  }

  const baselineStep = steps[0] ?? null
  const activeStep = steps.find((s) => s.severity === activeSeverity) ?? null

  return {
    axis,
    setAxis,
    steps,
    baselineStep,
    activeSeverity,
    setActiveSeverity,
    activeStep,
    status,
    progress,
    total,
    error,
    retry,
    comparisonByAxis,
    comparisonStatus,
    comparisonProgress,
    comparisonTotal,
    runComparison,
    cancelComparison,
  }
}
