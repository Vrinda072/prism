import { useEffect, useState } from "react"
import { ApiError, compareImages, type CompareResponse } from "./api/client"
import AnalysisPanel from "./components/AnalysisPanel"
import ControlsBar from "./components/ControlsBar"
import Header from "./components/Header"
import ImagePanel from "./components/ImagePanel"
import ImageSourceBar from "./components/ImageSourceBar"
import { useDebouncedValue } from "./hooks/useDebouncedValue"
import { applyTransform, loadImageElement } from "./lib/imageTransform"
import type { ImageSource } from "./types/image"
import { DEFAULT_TRANSFORM, type TransformState } from "./types/transform"

const PREVIEW_DEBOUNCE_MS = 60
const ANALYSIS_DEBOUNCE_MS = 400

function App() {
  const [originalImage, setOriginalImage] = useState<ImageSource | null>(null)
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM)
  const [transformedImage, setTransformedImage] = useState<ImageSource | null>(null)
  const [analysis, setAnalysis] = useState<CompareResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

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

  // Clear analysis immediately when the source image itself changes — old
  // numbers describing a different image should never linger on screen.
  useEffect(() => {
    setAnalysis(null)
    setAnalysisError(null)
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
      .then(setAnalysis)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setAnalysis(null)
        setAnalysisError(err instanceof ApiError ? err.message : "Unable to analyze this image. Please try again.")
      })
      .finally(() => setIsAnalyzing(false))

    return () => controller.abort()
  }, [originalImage, debouncedAnalysisTransform])

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Header />
      <ImageSourceBar onSelect={setOriginalImage} />

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_320px]">
        <section className="border-b border-border p-8 lg:border-b-0 lg:border-r">
          <ImagePanel label="Original" imageUrl={originalImage?.url ?? null} emptyMessage="Choose an image to begin." />
        </section>

        <section className="border-b border-border p-8 lg:border-b-0 lg:border-r">
          <ImagePanel
            label="Live Transformation"
            imageUrl={transformedImage?.url ?? null}
            emptyMessage="Your transformed image will appear here."
            large
          />
        </section>

        <section className="p-8">
          <AnalysisPanel
            hasImage={!!originalImage}
            isAnalyzing={isAnalyzing}
            result={analysis}
            error={analysisError}
          />
        </section>
      </main>

      <ControlsBar transform={transform} onChange={setTransform} disabled={!originalImage} />
    </div>
  )
}

export default App
