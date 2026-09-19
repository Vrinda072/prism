import { useMemo, useState } from "react"
import { ALL_AXES } from "../hooks/useExperiment"
import { AXIS_LABELS } from "../lib/axisLabels"
import type { ExperimentStatus, ExperimentStep } from "../types/experiment"
import type { TransformState } from "../types/transform"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const PANEL_TIP =
  "Runs the full severity sweep for all six perturbations on this same image, so you can see which one moves CLIP's representation the most — the question this whole site is really about, answered for one image at a time instead of read off someone else's dataset."

type Metric = "similarity" | "drift" | "confidence" | "entropy"

const METRIC_LABELS: Record<Metric, string> = {
  similarity: "Similarity",
  drift: "Drift",
  confidence: "Confidence",
  entropy: "Entropy",
}

const SERIES_COLORS: Record<keyof TransformState, string> = {
  blur: "#7a2331",
  noise: "#2c3e50",
  brightness: "#b8860b",
  contrast: "#5f7a5f",
  rotation: "#6b4570",
  compression: "#a0522d",
}

const VIEW_W = 440
const VIEW_H = 190
const PADDING = 24

function curveX(severity: number): number {
  return PADDING + severity * (VIEW_W - PADDING * 2)
}
function curveY(value: number, maxValue: number): number {
  const clamped = Math.min(maxValue, Math.max(0, value))
  return PADDING + (1 - clamped / maxValue) * (VIEW_H - PADDING * 2)
}

function metricValue(step: ExperimentStep, metric: Metric): number {
  if (metric === "similarity") return step.similarity
  if (metric === "drift") return step.drift
  if (metric === "confidence") return step.confidence
  return step.entropy
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

interface ComparePerturbationsProps {
  activeAxis: keyof TransformState
  comparisonByAxis: Partial<Record<keyof TransformState, ExperimentStep[]>>
  status: ExperimentStatus
  progress: number
  total: number
  onRun: () => void
  onCancel: () => void
  onSelectAxis: (axis: keyof TransformState) => void
  disabled?: boolean
}

export default function ComparePerturbations({
  activeAxis,
  comparisonByAxis,
  status,
  progress,
  total,
  onRun,
  onCancel,
  onSelectAxis,
  disabled = false,
}: ComparePerturbationsProps) {
  const [metric, setMetric] = useState<Metric>("drift")
  const [hoveredAxis, setHoveredAxis] = useState<keyof TransformState | null>(null)

  const axesWithData = useMemo(
    () => ALL_AXES.filter((a) => (comparisonByAxis[a]?.length ?? 0) > 0),
    [comparisonByAxis],
  )

  const maxValue = metric === "entropy" ? 1 : 1

  const ranking = useMemo(
    () =>
      axesWithData
        .map((a) => ({ axis: a, meanValue: mean((comparisonByAxis[a] ?? []).map((s) => metricValue(s, metric))) }))
        .sort((a, b) => b.meanValue - a.meanValue),
    [axesWithData, comparisonByAxis, metric],
  )

  return (
    <Panel
      label={<InfoTip text={PANEL_TIP}>Compare Perturbations</InfoTip>}
      headerRight={
        status === "running" ? (
          <span className="font-mono text-[11px] text-muted">
            {progress} / {total}
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || status === "running"}
            onClick={onRun}
            className="rounded-full border border-ink px-3 py-1.5 text-xs font-medium text-ink transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-ink hover:text-paper"
          >
            Run all six
          </button>
          {status === "running" && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-ink px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-ink hover:text-paper"
            >
              Cancel
            </button>
          )}
          {axesWithData.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    metric === m
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-border text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === "running" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        )}

        {axesWithData.length === 0 ? (
          <p className="text-sm text-muted">
            Sweep all six perturbations on the current image at once — 66 real forward passes — to see which one
            moves CLIP's representation most.
          </p>
        ) : (
          <>
            <div className="min-w-0">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
                {METRIC_LABELS[metric]} vs. severity, by perturbation
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
                {axesWithData.map((a) => {
                  const stepsForAxis = comparisonByAxis[a] ?? []
                  const dimmed = hoveredAxis !== null && hoveredAxis !== a
                  const d = `M ${stepsForAxis
                    .map((s) => `${curveX(s.severity)},${curveY(metricValue(s, metric), maxValue)}`)
                    .join(" L ")}`
                  return (
                    <path
                      key={a}
                      d={d}
                      fill="none"
                      stroke={SERIES_COLORS[a]}
                      strokeWidth={a === activeAxis ? 2.5 : 1.5}
                      opacity={dimmed ? 0.2 : 1}
                      onMouseEnter={() => setHoveredAxis(a)}
                      onMouseLeave={() => setHoveredAxis(null)}
                      onClick={() => onSelectAxis(a)}
                      style={{ cursor: "pointer", transition: "opacity 150ms ease-out" }}
                    />
                  )
                })}
              </svg>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {axesWithData.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onSelectAxis(a)}
                    onMouseEnter={() => setHoveredAxis(a)}
                    onMouseLeave={() => setHoveredAxis(null)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: SERIES_COLORS[a], opacity: hoveredAxis && hoveredAxis !== a ? 0.3 : 1 }}
                    />
                    <span className={a === activeAxis ? "text-ink" : "text-muted"}>{AXIS_LABELS[a]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">
                Mean {METRIC_LABELS[metric].toLowerCase()} — worst first
              </div>
              <div className="flex flex-col gap-2">
                {ranking.map(({ axis, meanValue }) => (
                  <button
                    key={axis}
                    type="button"
                    onClick={() => onSelectAxis(axis)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className={`w-24 shrink-0 text-xs ${axis === activeAxis ? "text-ink" : "text-muted"}`}>
                      {AXIS_LABELS[axis]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.min(100, meanValue * 100)}%`, backgroundColor: SERIES_COLORS[axis] }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-xs text-ink">
                      {(meanValue * 100).toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
