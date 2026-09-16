import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { CompareResponse } from "../api/client"
import { useAnimatedNumber } from "../hooks/useAnimatedNumber"
import DriftVisualization from "./DriftVisualization"
import Panel from "./Panel"

interface FlashState {
  key: number
  direction: "up" | "down" | null
}

function useFlashOnChange(value: number | null): FlashState {
  const [state, setState] = useState<FlashState>({ key: 0, direction: null })
  const prevRef = useRef(value)

  useEffect(() => {
    const prev = prevRef.current
    if (prev !== null && value !== null && prev !== value) {
      setState((s) => ({ key: s.key + 1, direction: value > prev ? "up" : "down" }))
    }
    prevRef.current = value
  }, [value])

  return state
}

interface MetricProps {
  label: string
  value: string
  rawValue: number | null
  first?: boolean
}

function Metric({ label, value, rawValue, first = false }: MetricProps) {
  const { key, direction } = useFlashOnChange(rawValue)
  const flashStyle = {
    "--flash-color": direction === "up" ? "var(--color-positive-soft)" : "var(--color-accent-soft)",
  } as CSSProperties

  return (
    <div className={`py-3 ${first ? "" : "border-t border-border"}`}>
      <div className="text-xs text-muted">{label}</div>
      <div key={key} className={key > 0 ? "highlight-flash -mx-1 px-1" : ""} style={flashStyle}>
        <div className="mt-1 font-mono text-2xl tabular-nums text-ink">{value}</div>
      </div>
    </div>
  )
}

interface AnalysisPanelProps {
  hasImage: boolean
  isAnalyzing: boolean
  result: CompareResponse | null
  error: string | null
  suggestedName: string
  onSaveExperiment: (name: string) => void
}

export default function AnalysisPanel({
  hasImage,
  isAnalyzing,
  result,
  error,
  suggestedName,
  onSaveExperiment,
}: AnalysisPanelProps) {
  const similarityRaw = result ? result.similarity * 100 : null
  const driftRaw = result ? result.drift * 100 : null
  const latencyRaw = result ? result.latency_ms : null

  const animatedSimilarity = useAnimatedNumber(similarityRaw)
  const animatedDrift = useAnimatedNumber(driftRaw)
  const animatedLatency = useAnimatedNumber(latencyRaw, 400)

  const similarityValue = animatedSimilarity !== null ? `${animatedSimilarity.toFixed(1)}%` : "—"
  const driftValue = animatedDrift !== null ? `${animatedDrift.toFixed(1)}%` : "—"
  const latencyValue = animatedLatency !== null ? `${Math.round(animatedLatency)} ms` : "—"

  const [isNaming, setIsNaming] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const canSave = !!result && !isAnalyzing

  const startNaming = () => {
    setNameDraft(suggestedName)
    setIsNaming(true)
  }

  const confirmSave = () => {
    onSaveExperiment(nameDraft.trim() || suggestedName)
    setIsNaming(false)
  }

  return (
    <Panel
      label="Live Analysis"
      headerRight={
        canSave ? (
          isNaming ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                confirmSave()
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsNaming(false)
                }}
                className="w-32 border border-border bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent"
              />
              <button type="submit" className="text-xs font-medium text-accent-text hover:underline">
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={startNaming}
              className="text-[11px] font-medium uppercase tracking-widest text-muted transition-colors hover:text-ink"
            >
              Save
            </button>
          )
        ) : null
      }
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-col">
          <Metric label="Semantic Similarity" value={similarityValue} rawValue={similarityRaw} first />
          <Metric label="Representation Drift" value={driftValue} rawValue={driftRaw} />
          <Metric label="Inference" value={latencyValue} rawValue={latencyRaw} />
          <Metric label="Embedding" value="512 dimensions" rawValue={null} />
        </div>

        {hasImage && <DriftVisualization drift={result?.drift ?? null} />}

        {!hasImage && <p className="mt-6 text-sm text-muted">Choose an image to begin.</p>}
        {hasImage && isAnalyzing && <p className="mt-6 text-sm text-muted">Analyzing...</p>}
        {hasImage && !isAnalyzing && error && <p className="mt-6 text-sm text-accent-text">{error}</p>}
      </div>
    </Panel>
  )
}
