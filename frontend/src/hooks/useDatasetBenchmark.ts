import { useEffect, useRef, useState } from "react"
import { ApiError, compareImages, getSemanticScores } from "../api/client"
import { SAMPLE_IMAGES } from "../data/sampleImages"
import { applyTransform, loadImageElement } from "../lib/imageTransform"
import type { BenchmarkImage, BenchmarkPoint, BenchmarkStatus } from "../types/benchmark"
import { DEFAULT_TRANSFORM, type TransformState } from "../types/transform"

export const BENCHMARK_SEVERITIES = Array.from({ length: 11 }, (_, i) => i / 10)
const MAX_BENCHMARK_IMAGES = 6

interface DatasetBenchmark {
  images: BenchmarkImage[]
  status: BenchmarkStatus
  points: BenchmarkPoint[]
  axis: keyof TransformState | null
  error: string | null
  progress: number
  total: number
  canAddMore: boolean
  addImage: (url: string, blob: Blob, label: string) => void
  removeImage: (id: string) => void
  run: (axis: keyof TransformState) => void
  cancel: () => void
}

/** The "dataset" behind the Dataset Benchmark panel: starts with the four
 * bundled sample photos (fetched once on mount, same pattern
 * ImageSourceBar already uses for its own sample thumbnails) and grows as
 * the user adds their own images — a small, real, user-curated set to run
 * the same severity sweep across, rather than one anecdotal image. */
export function useDatasetBenchmark(): DatasetBenchmark {
  const [images, setImages] = useState<BenchmarkImage[]>([])
  const [status, setStatus] = useState<BenchmarkStatus>("idle")
  const [points, setPoints] = useState<BenchmarkPoint[]>([])
  const [axis, setAxis] = useState<keyof TransformState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      SAMPLE_IMAGES.map(async (sample) => {
        const response = await fetch(sample.src)
        const blob = await response.blob()
        return { id: sample.id, label: sample.label, source: { url: sample.src, blob } }
      }),
    ).then((loaded) => {
      if (!cancelled) setImages(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const addImage = (url: string, blob: Blob, label: string) => {
    setImages((prev) =>
      prev.length >= MAX_BENCHMARK_IMAGES ? prev : [...prev, { id: crypto.randomUUID(), label, source: { url, blob } }],
    )
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const cancel = () => {
    controllerRef.current?.abort()
    setStatus("idle")
  }

  const run = (selectedAxis: keyof TransformState) => {
    if (images.length === 0) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setAxis(selectedAxis)
    setPoints([])
    setStatus("running")
    setError(null)
    setProgress(0)
    setTotal(images.length * BENCHMARK_SEVERITIES.length)

    ;(async () => {
      for (const image of images) {
        if (controller.signal.aborted) return
        const img = await loadImageElement(image.source.url)

        for (const severity of BENCHMARK_SEVERITIES) {
          if (controller.signal.aborted) return

          const transform: TransformState = { ...DEFAULT_TRANSFORM, [selectedAxis]: severity }
          const transformed = await applyTransform(img, transform)
          URL.revokeObjectURL(transformed.url)

          const [compareRes, semanticRes] = await Promise.all([
            compareImages(image.source.blob, transformed.blob, controller.signal),
            getSemanticScores(transformed.blob, controller.signal),
          ])

          if (controller.signal.aborted) return

          const point: BenchmarkPoint = {
            imageId: image.id,
            imageLabel: image.label,
            severity,
            similarity: compareRes.similarity,
            drift: compareRes.drift,
            confidence: semanticRes.confidence,
            entropy: semanticRes.entropy,
            embedding: compareRes.transformed_embedding,
          }
          setPoints((prev) => [...prev, point])
          setProgress((p) => p + 1)
        }
      }
      if (!controller.signal.aborted) setStatus("done")
    })().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return
      setStatus("error")
      setError(err instanceof ApiError ? err.message : "The benchmark failed partway through. Please try again.")
    })
  }

  return {
    images,
    status,
    points,
    axis,
    error,
    progress,
    total,
    canAddMore: images.length < MAX_BENCHMARK_IMAGES,
    addImage,
    removeImage,
    run,
    cancel,
  }
}
