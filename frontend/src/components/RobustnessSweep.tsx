import { useEffect, useMemo, useState } from "react"
import { projectEmbeddings } from "../api/client"
import { useRobustnessSweep } from "../hooks/useRobustnessSweep"
import type { ImageSource } from "../types/image"
import type { SweepResult } from "../types/sweep"
import type { TransformState } from "../types/transform"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const PANEL_TIP =
  "A controlled single-variable experiment: one perturbation type, run at 11 fixed severities (0-100%), each a real CLIP forward pass. This is the same methodology robustness studies use — hold everything else fixed, vary one thing, and watch where the model's representation breaks down."

const AXES: { key: keyof TransformState; label: string }[] = [
  { key: "blur", label: "Blur" },
  { key: "noise", label: "Noise" },
  { key: "brightness", label: "Brightness" },
  { key: "rotation", label: "Rotation" },
  { key: "compression", label: "Compression" },
]

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
  originalImage: ImageSource | null
}

export default function RobustnessSweep({ originalImage }: RobustnessSweepProps) {
  const { status, results, axis, error, total, run, cancel } = useRobustnessSweep(originalImage)
  const [hovered, setHovered] = useState<number | null>(null)
  const [projected, setProjected] = useState<[number, number][] | null>(null)

  const baselineConcept = results[0]?.topConcept ?? null
  const flipSeverity = useMemo(() => {
    if (!baselineConcept) return null
    const flipped = results.find((r, i) => i > 0 && r.topConcept !== baselineConcept)
    return flipped?.severity ?? null
  }, [results, baselineConcept])

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

  return (
    <Panel
      label={<InfoTip text={PANEL_TIP}>Robustness Sweep</InfoTip>}
      headerRight={
        status === "running" ? (
          <span className="font-mono text-[11px] text-muted">
            {results.length} / {total}
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {AXES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              disabled={!originalImage || status === "running"}
              onClick={() => run(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                axis === key ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
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
              style={{ width: `${(results.length / total) * 100}%` }}
            />
          </div>
        )}

        {error && <p className="text-xs text-accent-text">{error}</p>}

        {results.length === 0 ? (
          <p className="text-sm text-muted">
            Pick a perturbation above to run it at 11 fixed severities and watch similarity, confidence, and
            entropy respond in real time.
          </p>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-widest text-muted">
                <span>Similarity vs. severity</span>
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
              {hovered !== null && <SweepTooltip result={results.find((r) => r.severity === hovered) ?? null} />}
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
            </div>
          </div>
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

