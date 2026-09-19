import { useMemo, useState } from "react"
import type { ExperimentStep } from "../types/experiment"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const VIEW_W = 440
const VIEW_H = 220
const PADDING = 28

const TIP =
  "Each point is a real CLIP embedding from one tested severity, reduced from 512 dimensions down to 2 using PCA (principal component analysis) — the two directions along which this sweep's points vary the most. The axes don't mean anything on their own; only the relative positions and distances between points are meaningful. Click a point to make it the active severity everywhere on the page."

interface EmbeddingTrajectoryProps {
  steps: ExperimentStep[]
  activeSeverity: number
  onSelectSeverity: (severity: number) => void
}

interface LaidOutStep {
  step: ExperimentStep
  x: number
  y: number
}

// Centers the projected coordinates and scales both axes UNIFORMLY (never
// independently) — PCA distances are only honest to look at when x and y
// share one scale; stretching one axis more than the other would visually
// exaggerate or hide real embedding distance.
function layoutSteps(steps: ExperimentStep[]): LaidOutStep[] {
  const projected = steps.filter((s): s is ExperimentStep & { projected: [number, number] } => s.projected !== null)
  if (projected.length === 0) return []

  const xs = projected.map((s) => s.projected[0])
  const ys = projected.map((s) => s.projected[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const range = Math.max(maxX - minX, maxY - minY) || 1

  const usableW = VIEW_W - PADDING * 2
  const usableH = VIEW_H - PADDING * 2
  const scale = Math.min(usableW, usableH) / range

  return projected.map((step) => ({
    step,
    x: VIEW_W / 2 + (step.projected[0] - midX) * scale,
    y: VIEW_H / 2 - (step.projected[1] - midY) * scale, // flip Y: PCA "up" reads as up
  }))
}

export default function EmbeddingTrajectory({ steps, activeSeverity, onSelectSeverity }: EmbeddingTrajectoryProps) {
  const [hoveredSeverity, setHoveredSeverity] = useState<number | null>(null)

  const laidOut = useMemo(() => layoutSteps(steps), [steps])
  const shownSeverity = hoveredSeverity ?? activeSeverity
  const shown = laidOut.find((p) => p.step.severity === shownSeverity) ?? null

  const pathD = laidOut.length > 1 ? `M ${laidOut.map((p) => `${p.x},${p.y}`).join(" L ")}` : ""

  return (
    <Panel
      label={<InfoTip text={TIP}>Embedding Trajectory</InfoTip>}
      headerRight={
        <span className="text-[11px] uppercase tracking-widest text-muted">
          {laidOut.length > 0 ? `${laidOut.length} point${laidOut.length === 1 ? "" : "s"}` : ""}
        </span>
      }
    >
      <div className="flex flex-1 flex-col p-5">
        {laidOut.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="max-w-[16rem] text-center text-sm text-muted">
              The trajectory for this severity sweep will appear here once it finishes running.
            </p>
          </div>
        ) : (
          <div className="relative flex-1">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="h-full w-full"
              role="img"
              aria-label={`Embedding trajectory across ${laidOut.length} severities, projected into 2D via PCA`}
            >
              {pathD && (
                <path
                  key={laidOut.length}
                  d={pathD}
                  pathLength={100}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={1.5}
                  strokeDasharray={100}
                  strokeDashoffset={100}
                  style={{ animation: "draw-path 600ms ease-out forwards" }}
                />
              )}
              {laidOut.map(({ step, x, y }) => {
                const isActive = step.severity === activeSeverity
                const isShown = step.severity === shownSeverity
                const radius = isActive ? 6 : 4
                return (
                  <g key={step.severity}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isShown ? radius + 3 : radius}
                      fill={isActive ? "var(--color-accent)" : "var(--color-ink)"}
                      fillOpacity={isActive ? 1 : 0.4 + step.severity * 0.5}
                      stroke={isShown ? "var(--color-accent)" : "transparent"}
                      strokeWidth={2}
                      className="animate-[point-in_400ms_ease-out]"
                      style={{
                        transition: "r 200ms ease-out",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                      }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={12}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`Severity ${Math.round(step.severity * 100)}%, similarity ${(step.similarity * 100).toFixed(1)}%, drift ${(step.drift * 100).toFixed(1)}%, predicted ${step.topConcept}`}
                      className="cursor-pointer outline-none"
                      onMouseEnter={() => setHoveredSeverity(step.severity)}
                      onMouseLeave={() => setHoveredSeverity(null)}
                      onFocus={() => setHoveredSeverity(step.severity)}
                      onBlur={() => setHoveredSeverity(null)}
                      onClick={() => onSelectSeverity(step.severity)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelectSeverity(step.severity)
                        }
                      }}
                    />
                  </g>
                )
              })}
            </svg>

            {shown && (
              <div
                className="pointer-events-none absolute z-10 w-44 border border-border bg-panel-raised p-2.5 text-xs"
                style={{
                  boxShadow: "var(--shadow-panel-raised)",
                  left: `${(shown.x / VIEW_W) * 100}%`,
                  top: `${(shown.y / VIEW_H) * 100}%`,
                  transform: `translate(-50%, ${shown.y > VIEW_H / 2 ? "calc(-100% - 14px)" : "14px"})`,
                }}
              >
                <div className="flex justify-between text-muted">
                  <span>Severity</span>
                  <span className="font-mono text-ink">{Math.round(shown.step.severity * 100)}%</span>
                </div>
                <div className="mt-1 flex justify-between text-muted">
                  <span>Similarity</span>
                  <span className="font-mono text-ink">{(shown.step.similarity * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1 flex justify-between text-muted">
                  <span>Drift</span>
                  <span className="font-mono text-ink">{(shown.step.drift * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1 flex justify-between text-muted">
                  <span>Confidence</span>
                  <span className="font-mono text-ink">{(shown.step.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1 flex justify-between text-muted">
                  <span>Prediction</span>
                  <span className="font-mono text-ink capitalize">{shown.step.topConcept}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
