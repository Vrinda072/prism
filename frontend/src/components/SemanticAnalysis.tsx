import InfoTip from "./InfoTip"
import Panel from "./Panel"
import type { SemanticState } from "../types/semantic"

const PANEL_TIP =
  "CLIP zero-shot classification against a small fixed set of concepts (flower, animal, vehicle, person, building, food) — a real computation, not a general-purpose classifier. This shows not just that the embedding moved, but what the model now thinks the image is."
const CONFIDENCE_TIP = "The top concept's score — how sure the model is about its single best guess."
const ENTROPY_TIP =
  "How spread out the model's belief is across all six concepts, normalized 0–1. Near 0 means it's confident in one concept; near 1 means it's about equally unsure between several."

interface ConceptBarsProps {
  title: string
  state: SemanticState | null
  flipped: boolean
}

function ConceptBars({ title, state, flipped }: ConceptBarsProps) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-widest text-muted">{title}</span>
        {flipped && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-text">
            prediction changed
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {state ? (
          state.concepts.map((c) => (
            <div key={c.concept} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-muted capitalize">{c.concept}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.round(c.score * 100)}%` }}
                />
              </div>
              <span className="w-11 shrink-0 text-right font-mono text-xs text-ink">
                {(c.score * 100).toFixed(1)}%
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">—</p>
        )}
      </div>

      <div className="mt-4 flex gap-6 border-t border-border pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted">
            <InfoTip text={CONFIDENCE_TIP}>Confidence</InfoTip>
          </div>
          <div className="mt-1 font-mono text-sm text-ink">
            {state ? `${(state.confidence * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted">
            <InfoTip text={ENTROPY_TIP}>Entropy</InfoTip>
          </div>
          <div className="mt-1 font-mono text-sm text-ink">{state ? state.entropy.toFixed(3) : "—"}</div>
        </div>
      </div>
    </div>
  )
}

interface SemanticAnalysisProps {
  original: SemanticState | null
  transformed: SemanticState | null
}

export default function SemanticAnalysis({ original, transformed }: SemanticAnalysisProps) {
  const flipped = !!original && !!transformed && original.topConcept !== transformed.topConcept

  return (
    <Panel label={<InfoTip text={PANEL_TIP}>Semantic Analysis</InfoTip>}>
      <div className="flex flex-col gap-6 p-5 sm:flex-row">
        <ConceptBars title="Original" state={original} flipped={false} />
        <ConceptBars title="Perturbed" state={transformed} flipped={flipped} />
      </div>
    </Panel>
  )
}
