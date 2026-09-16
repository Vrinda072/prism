import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { CompareResponse } from "../api/client"
import { useAnimatedNumber } from "../hooks/useAnimatedNumber"
import DriftVisualization from "./DriftVisualization"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

interface FlashState {
  key: number
  direction: "up" | "down" | null
  delta: number | null
}

function useFlashOnChange(value: number | null): FlashState {
  const [state, setState] = useState<FlashState>({ key: 0, direction: null, delta: null })
  const prevRef = useRef(value)

  useEffect(() => {
    const prev = prevRef.current
    if (prev !== null && value !== null && prev !== value) {
      setState((s) => ({ key: s.key + 1, direction: value > prev ? "up" : "down", delta: value - prev }))
    }
    prevRef.current = value
  }, [value])

  return state
}

interface MetricProps {
  label: string
  tip: string
  value: string
  rawValue: number | null
  first?: boolean
  staggerMs: number
  /** When set, a "+2.3%"-style badge briefly appears showing the change
   * since the previous value — omit for metrics where a delta wouldn't be
   * meaningful (inference time, the constant embedding dimension). */
  deltaUnit?: string
}

function Metric({ label, tip, value, rawValue, first = false, staggerMs, deltaUnit }: MetricProps) {
  const { key, direction, delta } = useFlashOnChange(rawValue)
  const flashStyle = {
    "--flash-color": direction === "up" ? "var(--color-positive-soft)" : "var(--color-accent-soft)",
    "--stagger-delay": `${staggerMs}ms`,
  } as CSSProperties
  const deltaLabel =
    delta !== null && deltaUnit ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${deltaUnit}` : null

  return (
    <div className={`rise-in py-3 ${first ? "" : "border-t border-border"}`} style={flashStyle}>
      <div className="text-xs text-muted">
        <InfoTip text={tip}>{label}</InfoTip>
      </div>
      <div key={key} className={key > 0 ? "highlight-flash -mx-1 px-1" : ""} style={flashStyle}>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-2xl tabular-nums text-ink">{value}</span>
          {deltaLabel && (
            <span
              key={key}
              className="animate-[delta-fade_2200ms_ease-out_forwards] font-mono text-xs tabular-nums"
              style={{ color: direction === "up" ? "var(--color-positive)" : "var(--color-accent-text)" }}
            >
              {deltaLabel}
            </span>
          )}
        </div>
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
            <InfoTip
              text="Save the current image and perturbation settings to Experiment History, so you can come back and restore this exact configuration later in this session."
              position="bottom"
              plain
            >
              <button
                type="button"
                onClick={startNaming}
                className="text-[11px] font-medium uppercase tracking-widest text-muted transition-colors hover:text-ink"
              >
                Save
              </button>
            </InfoTip>
          )
        ) : null
      }
    >
      <div className="flex flex-1 flex-col p-5">
        {/* Re-keyed when an image is first chosen, so the metrics stagger in
            together rather than sitting static from initial page load. */}
        <div key={hasImage ? "active" : "empty"} className="flex flex-col">
          <Metric
            label="Semantic Similarity"
            tip="How closely the model's understanding of the transformed image matches the original, measured as cosine similarity between their CLIP embeddings. 100% means the model sees them as identical."
            value={similarityValue}
            rawValue={similarityRaw}
            staggerMs={0}
            deltaUnit="%"
            first
          />
          <Metric
            label="Representation Drift"
            tip="How much the model's understanding has shifted: drift = 1 − similarity. Higher drift means the transformation changed what CLIP 'sees' more significantly — not necessarily what a human would notice most."
            value={driftValue}
            rawValue={driftRaw}
            staggerMs={70}
            deltaUnit="%"
          />
          <Metric
            label="Inference"
            tip="Real wall-clock time for the backend to run both images through CLIP and compare them — not a simulated or fixed number."
            value={latencyValue}
            rawValue={latencyRaw}
            staggerMs={140}
          />
          <Metric
            label="Embedding"
            tip="CLIP converts each image into a list of 512 numbers — its embedding — capturing what the model believes the image is about. Visually similar images tend to produce similar embeddings."
            value="512 dimensions"
            rawValue={null}
            staggerMs={210}
          />
        </div>

        {hasImage && <DriftVisualization drift={result?.drift ?? null} />}

        {!hasImage && <p className="mt-6 text-sm text-muted">Choose an image to begin.</p>}
        {hasImage && isAnalyzing && <p className="mt-6 text-sm text-muted">Analyzing...</p>}
        {hasImage && !isAnalyzing && error && <p className="mt-6 text-sm text-accent-text">{error}</p>}
      </div>
    </Panel>
  )
}
