import type { CompareResponse } from "../api/client"
import DriftVisualization from "./DriftVisualization"

interface MetricProps {
  label: string
  value: string
  first?: boolean
}

function Metric({ label, value, first = false }: MetricProps) {
  return (
    <div className={`pt-4 ${first ? "" : "border-t border-border"}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl text-ink">{value}</div>
    </div>
  )
}

interface AnalysisPanelProps {
  hasImage: boolean
  isAnalyzing: boolean
  result: CompareResponse | null
  error: string | null
}

export default function AnalysisPanel({ hasImage, isAnalyzing, result, error }: AnalysisPanelProps) {
  const similarityValue = result ? `${(result.similarity * 100).toFixed(1)}%` : "—"
  const driftValue = result ? `${(result.drift * 100).toFixed(1)}%` : "—"
  const latencyValue = result ? `${Math.round(result.latency_ms)} ms` : "—"

  return (
    <div className="flex h-full flex-col">
      <span className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted">
        Live Analysis
      </span>
      <div className="flex flex-col">
        <Metric label="Semantic Similarity" value={similarityValue} first />
        <Metric label="Representation Drift" value={driftValue} />
        <Metric label="Inference" value={latencyValue} />
        <Metric label="Embedding" value="512 dimensions" />
      </div>

      {hasImage && <DriftVisualization drift={result?.drift ?? null} />}

      {!hasImage && <p className="mt-6 text-sm text-muted">Choose an image to begin.</p>}
      {hasImage && isAnalyzing && <p className="mt-6 text-sm text-muted">Analyzing...</p>}
      {hasImage && !isAnalyzing && error && <p className="mt-6 text-sm text-accent-text">{error}</p>}
    </div>
  )
}
