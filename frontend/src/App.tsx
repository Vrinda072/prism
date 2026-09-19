import { useState } from "react"
import AnalysisPanel from "./components/AnalysisPanel"
import ComparePerturbations from "./components/ComparePerturbations"
import ControlsBar from "./components/ControlsBar"
import DatasetBenchmark from "./components/DatasetBenchmark"
import EmbeddingTrajectory from "./components/EmbeddingTrajectory"
import ExperimentHistory from "./components/ExperimentHistory"
import ExperimentSummary from "./components/ExperimentSummary"
import { HowItWorks } from "./components/InfoSections"
import { ResearchFindings } from "./components/ResearchFindings"
import ImagePanel from "./components/ImagePanel"
import ImageSourceBar from "./components/ImageSourceBar"
import NavBar from "./components/NavBar"
import RobustnessSweep from "./components/RobustnessSweep"
import SemanticAnalysis from "./components/SemanticAnalysis"
import { useExperiment } from "./hooks/useExperiment"
import { describeExperiment } from "./lib/transformSummary"
import type { SavedExperiment } from "./types/experiment"
import type { ImageSource } from "./types/image"

function App() {
  const [originalImage, setOriginalImage] = useState<ImageSource | null>(null)
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([])

  const experiment = useExperiment(originalImage)
  const {
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
  } = experiment

  const saveExperiment = (name: string) => {
    if (!originalImage || !activeStep) return
    const saved: SavedExperiment = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      originalImage,
      axis,
      severity: activeSeverity,
      similarity: activeStep.similarity,
      drift: activeStep.drift,
      topConcept: { concept: activeStep.topConcept, score: activeStep.confidence },
    }
    setSavedExperiments((prev) => [...prev, saved])
  }

  const restoreExperiment = (saved: SavedExperiment) => {
    setOriginalImage(saved.originalImage)
    setAxis(saved.axis)
    setActiveSeverity(saved.severity)
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <NavBar />
      <HowItWorks />

      <section id="workspace" className="border-t border-border">
        <ImageSourceBar onSelect={setOriginalImage} />

        <main className="mx-auto grid w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[280px_1fr_320px]">
          {/* Perturbation controls sit to the left of the images they alter —
              cause on the left, effect in the center, reading in the same
              direction as the eye naturally moves. */}
          <section className="border-b border-border p-8 lg:border-b-0 lg:border-r">
            <ControlsBar
              axis={axis}
              severity={activeSeverity}
              onAxisChange={setAxis}
              onSeverityChange={setActiveSeverity}
              status={status}
              progress={progress}
              total={total}
              disabled={!originalImage}
            />
          </section>

          <section className="flex flex-col gap-6 border-b border-border p-8 sm:flex-row lg:border-b-0 lg:border-r">
            <div className="min-w-0 flex-1">
              <ImagePanel
                label="Original"
                tip="The untouched source image, exactly as chosen or uploaded — CLIP's understanding of this image is the fixed baseline every severity is measured against."
                imageUrl={originalImage?.url ?? null}
                emptyMessage="Choose an image to begin."
              />
            </div>
            <div className="min-w-0 flex-1">
              <ImagePanel
                label={`At ${Math.round(activeSeverity * 100)}% severity`}
                tip="The image at the currently selected severity, with the chosen perturbation applied to real pixels. The border tints toward red as representation drift increases — a visual echo of the number below."
                imageUrl={activeStep?.thumbnailUrl ?? (originalImage ? originalImage.url : null)}
                emptyMessage="Your transformed image will appear here."
                accentIntensity={activeStep?.drift}
              />
            </div>
          </section>

          <section className="p-8">
            <AnalysisPanel
              hasImage={!!originalImage}
              isAnalyzing={status === "running"}
              step={activeStep}
              error={error}
              suggestedName={describeExperiment(axis, activeSeverity)}
              onSaveExperiment={saveExperiment}
              onRetry={retry}
            />
          </section>
        </main>
      </section>

      <section id="numbers" className="border-t border-border px-8 py-16">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
          <ExperimentSummary image={originalImage} axis={axis} steps={steps} status={status} />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="min-h-[320px] lg:col-span-2">
              <EmbeddingTrajectory steps={steps} activeSeverity={activeSeverity} onSelectSeverity={setActiveSeverity} />
            </div>
            <div className="min-h-[320px]">
              <ExperimentHistory experiments={savedExperiments} onRestore={restoreExperiment} />
            </div>
          </div>
          <div className="min-h-[220px]">
            <SemanticAnalysis original={baselineStep} transformed={activeStep} />
          </div>
          <div className="min-h-[280px]">
            <RobustnessSweep
              axis={axis}
              steps={steps}
              activeSeverity={activeSeverity}
              onSelectSeverity={setActiveSeverity}
              status={status}
            />
          </div>
          <div className="min-h-[280px]">
            <ComparePerturbations
              activeAxis={axis}
              comparisonByAxis={comparisonByAxis}
              status={comparisonStatus}
              progress={comparisonProgress}
              total={comparisonTotal}
              onRun={runComparison}
              onCancel={cancelComparison}
              onSelectAxis={setAxis}
              disabled={!originalImage}
            />
          </div>
          <div className="min-h-[280px]">
            <DatasetBenchmark />
          </div>
        </div>
      </section>

      <ResearchFindings />
    </div>
  )
}

export default App
