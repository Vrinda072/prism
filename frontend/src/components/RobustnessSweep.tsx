import { useMemo, useState } from "react"
import { spearmanCorrelation } from "../lib/statistics"
import type { ExperimentStatus, ExperimentStep } from "../types/experiment"
import type { TransformState } from "../types/transform"
import { AXIS_LABELS } from "../lib/axisLabels"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const PANEL_TIP =
  "This axis's severity sweep, at 11 fixed points (0-100%) — each point is a real CLIP forward pass, not an estimate. The same methodology robustness studies use to trace how one corruption degrades a model as it intensifies. Click a point to make it the active severity everywhere on the page."

const CORRELATION_TIP =
  "Spearman correlation between this sweep's embedding drift and its semantic uncertainty (1 − confidence). A positive value means the two move together: as the embedding drifts further from the original, the model also gets less sure what it's looking at."

const VIEW_W = 440
const VIEW_H = 170
const PADDING = 24

function curveX(severity: number): number {
  return PADDING + severity * (VIEW_W - PADDING * 2)
}
function curveY(similarity: number): number {
  const clamped = Math.min(1, Math.max(0, similarity))
  return PADDING + (1 - clamped) * (VIEW_H - PADDING * 2)
}

interface RobustnessSweepProps {
  axis: keyof TransformState
  steps: ExperimentStep[]
  activeSeverity: number
  onSelectSeverity: (severity: number) => void
  status: ExperimentStatus
}

export default function RobustnessSweep({ axis, steps, activeSeverity, onSelectSeverity, status }: RobustnessSweepProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const baselineConcept = steps[0]?.topConcept ?? null
  const flipSeverity = useMemo(() => {
    if (!baselineConcept) return null
    const flipped = steps.find((s, i) => i > 0 && s.topConcept !== baselineConcept)
    return flipped?.severity ?? null
  }, [steps, baselineConcept])

  const correlation = useMemo(() => {
    if (steps.length < 3) return null
    return spearmanCorrelation(
      steps.map((s) => s.drift),
      steps.map((s) => 1 - s.confidence),
    )
  }, [steps])

  const pathD = steps.length > 1 ? `M ${steps.map((s) => `${curveX(s.severity)},${curveY(s.similarity)}`).join(" L ")}` : ""
  const shownSeverity = hovered ?? activeSeverity
  const shown = steps.find((s) => s.severity === shownSeverity) ?? null

  return (
    <Panel
      label={<InfoTip text={PANEL_TIP}>Robustness Curve — {AXIS_LABELS[axis]}</InfoTip>}
      headerRight={
        status === "running" ? <span className="font-mono text-[11px] text-muted">running...</span> : null
      }
    >
      <div className="flex flex-col gap-5 p-5">
        {steps.length === 0 ? (
          <p className="text-sm text-muted">Choose an image to run this axis's severity sweep.</p>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-widest text-muted">
                <span>Similarity vs. severity</span>
                {flipSeverity !== null && (
                  <span className="text-accent-text">prediction flips at {Math.round(flipSeverity * 100)}%</span>
                )}
              </div>
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                <line
                  x1={PADDING}
                  y1={VIEW_H - PADDING}
                  x2={VIEW_W - PADDING}
                  y2={VIEW_H - PADDING}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                {flipSeverity !== null && (
                  <line
                    x1={curveX(flipSeverity)}
                    y1={PADDING}
                    x2={curveX(flipSeverity)}
                    y2={VIEW_H - PADDING}
                    stroke="var(--color-accent-text)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}
                <line
                  x1={curveX(activeSeverity)}
                  y1={PADDING}
                  x2={curveX(activeSeverity)}
                  y2={VIEW_H - PADDING}
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
                {pathD && (
                  <path
                    key={steps.length}
                    d={pathD}
                    pathLength={100}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={1.5}
                    strokeDasharray={100}
                    strokeDashoffset={100}
                    style={{ animation: "draw-path 500ms ease-out forwards" }}
                  />
                )}
                {steps.map((s) => {
                  const isActive = s.severity === activeSeverity
                  const isShown = s.severity === shownSeverity
                  return (
                    <circle
                      key={s.severity}
                      cx={curveX(s.severity)}
                      cy={curveY(s.similarity)}
                      r={isActive ? 5 : isShown ? 5 : 3}
                      fill={isActive ? "var(--color-accent)" : "var(--color-accent)"}
                      fillOpacity={isActive ? 1 : 0.7}
                      stroke={isShown ? "var(--color-ink)" : "transparent"}
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      style={{ transition: "r 150ms ease-out" }}
                      onMouseEnter={() => setHovered(s.severity)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => onSelectSeverity(s.severity)}
                    />
                  )
                })}
              </svg>
              {shown && <SweepTooltip step={shown} />}
              {correlation !== null && (
                <p className="mt-2 text-xs text-muted">
                  <InfoTip text={CORRELATION_TIP}>Drift ↔ uncertainty correlation</InfoTip>:{" "}
                  <span className="font-mono text-ink">ρ = {correlation.toFixed(2)}</span>
                </p>
              )}
            </div>

            {shown && (
              <div className="flex flex-col items-start gap-2 sm:w-32 sm:shrink-0">
                <div className="text-[11px] uppercase tracking-widest text-muted">
                  At {Math.round(shown.severity * 100)}%
                </div>
                <img
                  src={shown.thumbnailUrl}
                  alt={`Image at ${Math.round(shown.severity * 100)}% severity`}
                  className="h-32 w-32 rounded-lg border border-border object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

function SweepTooltip({ step }: { step: ExperimentStep }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 font-mono text-xs text-muted">
      <span>severity {Math.round(step.severity * 100)}%</span>
      <span className="text-ink">sim {(step.similarity * 100).toFixed(1)}%</span>
      <span className="text-ink">drift {(step.drift * 100).toFixed(1)}%</span>
      <span className="text-ink">conf {(step.confidence * 100).toFixed(1)}%</span>
      <span className="text-ink">entropy {step.entropy.toFixed(3)}</span>
      <span className="text-ink capitalize">→ {step.topConcept}</span>
    </div>
  )
}
