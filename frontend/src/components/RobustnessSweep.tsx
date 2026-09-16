import { useEffect, useMemo, useState } from "react"
import { projectEmbeddings } from "../api/client"
import { spearmanCorrelation } from "../lib/statistics"
import { ALL_AXES, useRobustnessSweep } from "../hooks/useRobustnessSweep"
import type { ImageSource } from "../types/image"
import type { SweepResult } from "../types/sweep"
import type { TransformState } from "../types/transform"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const PANEL_TIP =
  "A controlled experiment, one perturbation type at a time, at 11 fixed severities (0-100%) — each point is a real CLIP forward pass. This is the same methodology robustness studies use to compare how different corruptions affect a model."

const CORRELATION_TIP =
  "Spearman correlation between this sweep's embedding drift and its semantic uncertainty (1 − confidence). The reference CLIP robustness study found this relationship strongly predicts where a model's accuracy actually collapses — a positive value here means the same pattern held for this image."

const AXIS_LABELS: Record<keyof TransformState, string> = {
  blur: "Blur",
  noise: "Noise",
  brightness: "Brightness",
  contrast: "Contrast",
  rotation: "Rotation",
  compression: "Compression",
}

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

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

interface RobustnessSweepProps {
  originalImage: ImageSource | null
}

export default function RobustnessSweep({ originalImage }: RobustnessSweepProps) {
  const { status, resultsByAxis, activeAxis, error, progress, total, run, runAll, cancel, selectAxis } =
    useRobustnessSweep(originalImage)
  const [hovered, setHovered] = useState<number | null>(null)
  const [projected, setProjected] = useState<[number, number][] | null>(null)

  const results = useMemo(() => (activeAxis && resultsByAxis[activeAxis]) || [], [activeAxis, resultsByAxis])
  const axesWithData = useMemo(
    () => ALL_AXES.filter((a) => (resultsByAxis[a]?.length ?? 0) > 0),
    [resultsByAxis],
  )

  const baselineConcept = results[0]?.topConcept ?? null
  const flipSeverity = useMemo(() => {
    if (!baselineConcept) return null
    const flipped = results.find((r, i) => i > 0 && r.topConcept !== baselineConcept)
    return flipped?.severity ?? null
  }, [results, baselineConcept])

  const correlation = useMemo(() => {
    if (results.length < 3) return null
    return spearmanCorrelation(
      results.map((r) => r.drift),
      results.map((r) => 1 - r.confidence),
    )
  }, [results])

  const ranking = useMemo(
    () =>
      axesWithData
        .map((a) => ({ axis: a, meanDrift: mean((resultsByAxis[a] ?? []).map((r) => r.drift)) }))
        .sort((a, b) => b.meanDrift - a.meanDrift),
    [axesWithData, resultsByAxis],
  )

  useEffect(() => {
    if (status !== "done" || results.length < 2) {
      setProjected(null)
      return
    }
    const controller = new AbortController()
    projectEmbeddings(
      results.map((r) => r.embedding),
      controller.signal,
    )
      .then((res) => setProjected(res.points))
      .catch(() => {
        // Supplementary — the curve alone still tells the real story.
      })
    return () => controller.abort()
  }, [status, results])

  const pathD = results.length > 1 ? `M ${results.map((r) => `${curveX(r.severity)},${curveY(r.similarity)}`).join(" L ")}` : ""

  const scatterLayout = useMemo(() => {
    if (!projected || projected.length !== results.length) return []
    const xs = projected.map((p) => p[0])
    const ys = projected.map((p) => p[1])
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2
    const range = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1
    const scale = (Math.min(VIEW_W, VIEW_H) - PADDING * 2) / range
    return results.map((r, i) => ({
      result: r,
      x: VIEW_W / 2 + (projected[i][0] - midX) * scale,
      y: VIEW_H / 2 - (projected[i][1] - midY) * scale,
    }))
  }, [projected, results])

  const hoveredResult = hovered !== null ? (results.find((r) => r.severity === hovered) ?? null) : null

  return (
    <Panel
      label={<InfoTip text={PANEL_TIP}>Robustness Sweep</InfoTip>}
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
          {ALL_AXES.map((key) => (
            <button
              key={key}
              type="button"
              disabled={!originalImage || status === "running"}
              onClick={() => run(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                activeAxis === key
                  ? "border-accent bg-accent-soft text-accent-text"
                  : "border-border text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {AXIS_LABELS[key]}
            </button>
          ))}
          <button
            type="button"
            disabled={!originalImage || status === "running"}
            onClick={runAll}
            className="rounded-full border border-ink px-3 py-1.5 text-xs font-medium text-ink transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-ink hover:text-paper"
          >
            Compare all
          </button>
          {status === "running" && (
            <button
              type="button"
              onClick={cancel}
              className="ml-auto rounded-full border border-ink px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-ink hover:text-paper"
            >
              Cancel
            </button>
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

        {error && <p className="text-xs text-accent-text">{error}</p>}

        {axesWithData.length === 0 ? (
          <p className="text-sm text-muted">
            Pick a perturbation above to run it at 11 fixed severities, or run "Compare all" to see which
            perturbation moves this image's representation the most.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-widest text-muted">
                  <span>{AXIS_LABELS[activeAxis ?? "blur"]}: similarity vs. severity</span>
                  {flipSeverity !== null && (
                    <span className="text-accent-text">flips at {Math.round(flipSeverity * 100)}%</span>
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
                  {pathD && (
                    <path
                      key={results.length}
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
                  {results.map((r) => {
                    const isHovered = hovered === r.severity
                    return (
                      <circle
                        key={r.severity}
                        cx={curveX(r.severity)}
                        cy={curveY(r.similarity)}
                        r={isHovered ? 5 : 3}
                        fill="var(--color-accent)"
                        stroke={isHovered ? "var(--color-ink)" : "transparent"}
                        strokeWidth={1.5}
                        className="animate-[point-in_300ms_ease-out] cursor-pointer"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        onMouseEnter={() => setHovered(r.severity)}
                        onMouseLeave={() => setHovered(null)}
                      />
                    )
                  })}
                </svg>
                {hoveredResult && <SweepTooltip result={hoveredResult} />}
                {correlation !== null && (
                  <p className="mt-2 text-xs text-muted">
                    <InfoTip text={CORRELATION_TIP}>Drift ↔ uncertainty correlation</InfoTip>:{" "}
                    <span className="font-mono text-ink">ρ = {correlation.toFixed(2)}</span>
                  </p>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">This sweep's embedding path</div>
                {scatterLayout.length > 0 ? (
                  <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                    {scatterLayout.length > 1 && (
                      <path
                        d={`M ${scatterLayout.map((p) => `${p.x},${p.y}`).join(" L ")}`}
                        fill="none"
                        stroke="var(--color-border)"
                        strokeWidth={1.5}
                      />
                    )}
                    {scatterLayout.map(({ result: r, x, y }) => {
                      const isHovered = hovered === r.severity
                      return (
                        <circle
                          key={r.severity}
                          cx={x}
                          cy={y}
                          r={isHovered ? 6 : 3.5}
                          fill="var(--color-accent)"
                          fillOpacity={0.35 + r.severity * 0.65}
                          stroke={isHovered ? "var(--color-ink)" : "transparent"}
                          strokeWidth={1.5}
                          className="cursor-pointer"
                          style={{ transition: "r 150ms ease-out" }}
                          onMouseEnter={() => setHovered(r.severity)}
                          onMouseLeave={() => setHovered(null)}
                        />
                      )
                    })}
                  </svg>
                ) : (
                  <p className="text-sm text-muted">
                    {status === "running" ? "Projecting once the sweep finishes..." : "Needs at least 2 points."}
                  </p>
                )}
                {hoveredResult && (
                  <img
                    src={hoveredResult.thumbnailUrl}
                    alt={`Image at ${Math.round(hoveredResult.severity * 100)}% severity`}
                    className="mt-2 h-16 w-16 rounded-lg border border-border object-cover"
                  />
                )}
              </div>
            </div>

            {ranking.length > 1 && (
              <div className="border-t border-border pt-4">
                <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">
                  Which perturbation moves the representation most
                </div>
                <div className="flex flex-col gap-2">
                  {ranking.map(({ axis, meanDrift }) => (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => selectAxis(axis)}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className={`w-24 shrink-0 text-xs ${activeAxis === axis ? "text-ink" : "text-muted"}`}>
                        {AXIS_LABELS[axis]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                          style={{ width: `${Math.min(100, meanDrift * 100)}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right font-mono text-xs text-ink">
                        {(meanDrift * 100).toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}

function SweepTooltip({ result }: { result: SweepResult | null }) {
  if (!result) return null
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 font-mono text-xs text-muted">
      <span>severity {Math.round(result.severity * 100)}%</span>
      <span className="text-ink">sim {(result.similarity * 100).toFixed(1)}%</span>
      <span className="text-ink">drift {(result.drift * 100).toFixed(1)}%</span>
      <span className="text-ink">conf {(result.confidence * 100).toFixed(1)}%</span>
      <span className="text-ink">entropy {result.entropy.toFixed(3)}</span>
      <span className="text-ink capitalize">→ {result.topConcept}</span>
    </div>
  )
}
