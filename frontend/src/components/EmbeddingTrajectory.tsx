import { useMemo, useState } from "react"
import type { TrajectoryPoint } from "../types/trajectory"
import Panel from "./Panel"

const VIEW_W = 440
const VIEW_H = 220
const PADDING = 28

interface EmbeddingTrajectoryProps {
  points: TrajectoryPoint[]
  projected: [number, number][] | null
}

interface LaidOutPoint {
  point: TrajectoryPoint
  x: number
  y: number
  intensity: number
  isLatest: boolean
}

function meanIntensity(t: TrajectoryPoint["transform"]): number {
  return (t.blur + t.noise + t.brightness + t.rotation + t.compression) / 5
}

// Centers the projected coordinates and scales both axes UNIFORMLY (never
// independently) — PCA distances are only honest to look at when x and y
// share one scale; stretching one axis more than the other would visually
// exaggerate or hide real embedding distance.
function layoutPoints(points: TrajectoryPoint[], projected: [number, number][]): LaidOutPoint[] {
  if (points.length === 0) return []

  const xs = projected.map((p) => p[0])
  const ys = projected.map((p) => p[1])
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

  return points.map((point, i) => {
    const [px, py] = projected[i]
    return {
      point,
      x: VIEW_W / 2 + (px - midX) * scale,
      y: VIEW_H / 2 - (py - midY) * scale, // flip Y: PCA "up" reads as up
      intensity: meanIntensity(point.transform),
      isLatest: i === points.length - 1,
    }
  })
}

export default function EmbeddingTrajectory({ points, projected }: EmbeddingTrajectoryProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  const laidOut = useMemo(() => {
    if (!projected || projected.length !== points.length) return []
    return layoutPoints(points, projected)
  }, [points, projected])

  const shownId = pinnedId ?? activeId
  const shown = laidOut.find((p) => p.point.id === shownId) ?? null

  const pathD = laidOut.length > 1 ? `M ${laidOut.map((p) => `${p.x},${p.y}`).join(" L ")}` : ""

  return (
    <Panel
      label="Embedding Trajectory"
      headerRight={
        <span className="text-[11px] uppercase tracking-widest text-muted">
          {points.length > 0 ? `${points.length} point${points.length === 1 ? "" : "s"}` : ""}
        </span>
      }
    >
      <div className="flex flex-1 flex-col p-5">
        {laidOut.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="max-w-[16rem] text-center text-sm text-muted">
              Trajectory will appear here as you adjust perturbations.
            </p>
          </div>
        ) : (
          <div className="relative flex-1">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="h-full w-full"
              role="img"
              aria-label={`Embedding trajectory across ${laidOut.length} perturbation state${laidOut.length === 1 ? "" : "s"}, projected into 2D via PCA`}
            >
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={1.5}
                  style={{ transition: "d 500ms ease-out" }}
                />
              )}
              {laidOut.map(({ point, x, y, intensity, isLatest }) => {
                const isShown = shownId === point.id
                const radius = isLatest ? 6 : 4
                return (
                  <g key={point.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isShown ? radius + 3 : radius}
                      fill={isLatest ? "var(--color-accent)" : "var(--color-ink)"}
                      fillOpacity={isLatest ? 1 : 0.55}
                      stroke={isShown ? "var(--color-accent)" : "transparent"}
                      strokeWidth={2}
                      style={{ transition: "cx 500ms ease-out, cy 500ms ease-out, r 200ms ease-out" }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={12}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`Perturbation intensity ${Math.round(intensity * 100)}%, similarity ${(point.similarity * 100).toFixed(1)}%, drift ${(point.drift * 100).toFixed(1)}%`}
                      className="cursor-pointer outline-none"
                      style={{ transition: "cx 500ms ease-out, cy 500ms ease-out" }}
                      onMouseEnter={() => setActiveId(point.id)}
                      onMouseLeave={() => setActiveId(null)}
                      onFocus={() => setActiveId(point.id)}
                      onBlur={() => setActiveId(null)}
                      onClick={() => setPinnedId((prev) => (prev === point.id ? null : point.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setPinnedId((prev) => (prev === point.id ? null : point.id))
                        }
                      }}
                    />
                  </g>
                )
              })}
            </svg>

            {shown && (
              <div
                className="pointer-events-none absolute z-10 w-40 border border-border bg-panel-raised p-2.5 text-xs"
                style={{
                  boxShadow: "var(--shadow-panel-raised)",
                  // Position via percentages of the container (matching how the
                  // SVG's viewBox scales), never raw viewBox units as pixels —
                  // those two coordinate spaces only match by coincidence.
                  left: `${(shown.x / VIEW_W) * 100}%`,
                  top: `${(shown.y / VIEW_H) * 100}%`,
                  transform: `translate(-50%, ${shown.y > VIEW_H / 2 ? "calc(-100% - 14px)" : "14px"})`,
                }}
              >
                <div className="flex justify-between text-muted">
                  <span>Intensity</span>
                  <span className="font-mono text-ink">{Math.round(shown.intensity * 100)}%</span>
                </div>
                <div className="mt-1 flex justify-between text-muted">
                  <span>Similarity</span>
                  <span className="font-mono text-ink">{(shown.point.similarity * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1 flex justify-between text-muted">
                  <span>Drift</span>
                  <span className="font-mono text-ink">{(shown.point.drift * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
