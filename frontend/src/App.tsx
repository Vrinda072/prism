import { useEffect, useState } from "react"
import { ApiError, compareImages, projectEmbeddings, type CompareResponse } from "./api/client"
import AnalysisPanel from "./components/AnalysisPanel"
import ControlsBar from "./components/ControlsBar"
import EmbeddingTrajectory from "./components/EmbeddingTrajectory"
import ExperimentHistory from "./components/ExperimentHistory"
import Header from "./components/Header"
import ImagePanel from "./components/ImagePanel"
import ImageSourceBar from "./components/ImageSourceBar"
import { useDebouncedValue } from "./hooks/useDebouncedValue"
import { applyTransform, loadImageElement } from "./lib/imageTransform"
import { summarizeTransform } from "./lib/transformSummary"
import type { Experiment } from "./types/experiment"
import type { ImageSource } from "./types/image"
import { DEFAULT_TRANSFORM, type TransformState } from "./types/transform"
import type { TrajectoryPoint } from "./types/trajectory"

const PREVIEW_DEBOUNCE_MS = 60
const ANALYSIS_DEBOUNCE_MS = 400
const MAX_TRAJECTORY_POINTS = 40

function transformsEqual(a: TransformState, b: TransformState): boolean {
  return (
    a.blur === b.blur &&
    a.noise === b.noise &&
    a.brightness === b.brightness &&
    a.rotation === b.rotation &&
    a.compression === b.compression
  )
}

function App() {
  const [originalImage, setOriginalImage] = useState<ImageSource | null>(null)
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM)
  const [transformedImage, setTransformedImage] = useState<ImageSource | null>(null)
  const [analysis, setAnalysis] = useState<CompareResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([])
  const [projectedPoints, setProjectedPoints] = useState<[number, number][] | null>(null)
  const [experiments, setExperiments] = useState<Experiment[]>([])

  const debouncedPreviewTransform = useDebouncedValue(transform, PREVIEW_DEBOUNCE_MS)
  const debouncedAnalysisTransform = useDebouncedValue(transform, ANALYSIS_DEBOUNCE_MS)

  // Fast pipeline: keeps the Live Transformation panel responsive while
  // dragging a slider. Real pixel manipulation (lib/imageTransform.ts), not
  // a CSS approximation.
  useEffect(() => {
    if (!originalImage) {
      setTransformedImage(null)
      return
    }

    let cancelled = false

    loadImageElement(originalImage.url)
      .then((img) => applyTransform(img, debouncedPreviewTransform))
      .then((result) => {
        if (cancelled) {
          URL.revokeObjectURL(result.url)
          return
        }
        setTransformedImage(result)
      })
      .catch(() => {
        if (!cancelled) setTransformedImage(null)
      })

    return () => {
      cancelled = true
    }
  }, [originalImage, debouncedPreviewTransform])

  useEffect(() => {
    return () => {
      if (transformedImage) URL.revokeObjectURL(transformedImage.url)
    }
  }, [transformedImage])

  // Clear analysis and the trajectory immediately when the source image
  // itself changes — old numbers (and a PCA space built from a different
  // image's embeddings) should never linger next to a new image. A no-op
  // when restoring an experiment from the SAME image (same object
  // reference), so trajectory continuity is preserved across restores
  // within one image's exploration.
  useEffect(() => {
    setAnalysis(null)
    setAnalysisError(null)
    setTrajectory([])
    setProjectedPoints(null)
  }, [originalImage])

  // Slow pipeline: once slider changes have settled for ANALYSIS_DEBOUNCE_MS,
  // render the transform independently (deterministic — see NOISE_SEED) and
  // send it for real analysis. Previous numbers stay on screen with an
  // "Analyzing..." indicator until the new result lands, rather than
  // flashing to empty on every adjustment.
  useEffect(() => {
    if (!originalImage) {
      setIsAnalyzing(false)
      return
    }

    const controller = new AbortController()
    setIsAnalyzing(true)
    setAnalysisError(null)

    loadImageElement(originalImage.url)
      .then((img) => applyTransform(img, debouncedAnalysisTransform))
      .then((transformed) => {
        URL.revokeObjectURL(transformed.url)
        return compareImages(originalImage.blob, transformed.blob, controller.signal)
      })
      .then((result) => {
        setAnalysis(result)
        setTrajectory((prev) => {
          const last = prev[prev.length - 1]
          if (last && transformsEqual(last.transform, debouncedAnalysisTransform)) return prev

          const next: TrajectoryPoint = {
            id: crypto.randomUUID(),
            transform: debouncedAnalysisTransform,
            similarity: result.similarity,
            drift: result.drift,
            embedding: result.transformed_embedding,
          }
          const appended = [...prev, next]
          return appended.length > MAX_TRAJECTORY_POINTS
            ? appended.slice(appended.length - MAX_TRAJECTORY_POINTS)
            : appended
        })
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setAnalysis(null)
        setAnalysisError(err instanceof ApiError ? err.message : "Unable to analyze this image. Please try again.")
      })
      .finally(() => setIsAnalyzing(false))

    return () => controller.abort()
  }, [originalImage, debouncedAnalysisTransform])

  // Recompute the 2D PCA projection whenever the trajectory grows. This is
  // non-monotonic (adding one point can move every existing point's
  // position, not just append a coordinate), so an older /project response
  // arriving after a newer one must be discarded, not applied.
  useEffect(() => {
    if (trajectory.length === 0) {
      setProjectedPoints(null)
      return
    }

    const controller = new AbortController()
    projectEmbeddings(
      trajectory.map((p) => p.embedding),
      controller.signal,
    )
      .then((res) => setProjectedPoints(res.points))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        // Projection is supplementary — leave the chart showing its last
        // good state rather than surfacing a second error path.
      })

    return () => controller.abort()
  }, [trajectory])

  const saveExperiment = (name: string) => {
    if (!originalImage || !analysis) return
    const experiment: Experiment = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      originalImage,
      transform,
      similarity: analysis.similarity,
      drift: analysis.drift,
    }
    setExperiments((prev) => [...prev, experiment])
  }

  const restoreExperiment = (experiment: Experiment) => {
    setOriginalImage(experiment.originalImage)
    setTransform(experiment.transform)
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Header />
      <ImageSourceBar onSelect={setOriginalImage} />

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 lg:grid-cols-[1fr_1fr_340px]">
        <section className="border-b border-border p-8 lg:border-b-0 lg:border-r">
          <ImagePanel label="Original" imageUrl={originalImage?.url ?? null} emptyMessage="Choose an image to begin." />
        </section>

        <section className="border-b border-border p-8 lg:border-b-0 lg:border-r">
          <ImagePanel
            label="Live Transformation"
            imageUrl={transformedImage?.url ?? null}
            emptyMessage="Your transformed image will appear here."
          />
        </section>

        {/* Perturbation controls sit directly beside the image they alter,
            with the resulting analysis right below — the whole cause-and-
            effect loop in one glance, instead of controls in a separate
            bottom bar far from the image they're changing. */}
        <section className="flex flex-col gap-8 p-8">
          <ControlsBar transform={transform} onChange={setTransform} disabled={!originalImage} />
          <AnalysisPanel
            hasImage={!!originalImage}
            isAnalyzing={isAnalyzing}
            result={analysis}
            error={analysisError}
            suggestedName={summarizeTransform(transform)}
            onSaveExperiment={saveExperiment}
          />
        </section>
      </main>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 border-t border-border p-8 lg:grid-cols-3">
        <div className="min-h-[320px] lg:col-span-2">
          <EmbeddingTrajectory points={trajectory} projected={projectedPoints} />
        </div>
        <div className="min-h-[320px]">
          <ExperimentHistory experiments={experiments} onRestore={restoreExperiment} />
        </div>
      </div>
    </div>
  )
}

export default App
