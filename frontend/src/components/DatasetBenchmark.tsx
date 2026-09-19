import { useMemo, useRef, useState } from "react"
import { useDatasetBenchmark } from "../hooks/useDatasetBenchmark"
import { AXIS_LABELS } from "../lib/axisLabels"
import { spearmanCorrelation } from "../lib/statistics"
import type { TransformState } from "../types/transform"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const PANEL_TIP =
  "One image's curve can be an outlier. This runs the same severity sweep across every image in your set and pools the results, so you can see whether a single photo was typical or not."

const SERIES_COLORS = ["#7a2331", "#2c3e50", "#b8860b", "#5f7a5f", "#6b4570", "#a0522d"]

const VIEW_W = 440
const VIEW_H = 170
const PADDING = 24

function curveX(severity: number): number {
  return PADDING + severity * (VIEW_W - PADDING * 2)
}
function curveY01(value: number): number {
  const clamped = Math.min(1, Math.max(0, value))
  return PADDING + (1 - clamped) * (VIEW_H - PADDING * 2)
}
function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]

export default function DatasetBenchmark() {
  const { images, status, points, axis, error, progress, total, canAddMore, addImage, removeImage, run, cancel } =
    useDatasetBenchmark()
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const imageIds = useMemo(() => images.map((img) => img.id), [images])
  const colorFor = (imageId: string) => SERIES_COLORS[imageIds.indexOf(imageId) % SERIES_COLORS.length] ?? "var(--color-accent)"

  const pointsByImage = useMemo(() => {
    const map = new Map<string, typeof points>()
    for (const p of points) {
      const list = map.get(p.imageId) ?? []
      list.push(p)
      map.set(p.imageId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.severity - b.severity)
    return map
  }, [points])

  const meanBySeverity = useMemo(() => {
    if (points.length === 0) return []
    const bySeverity = new Map<number, number[]>()
    for (const p of points) {
      const list = bySeverity.get(p.severity) ?? []
      list.push(p.similarity)
      bySeverity.set(p.severity, list)
    }
    return [...bySeverity.entries()].sort((a, b) => a[0] - b[0]).map(([severity, sims]) => ({ severity, mean: mean(sims) }))
  }, [points])

  const pooledCorrelation = useMemo(() => {
    if (points.length < 3) return null
    return spearmanCorrelation(
      points.map((p) => p.drift),
      points.map((p) => 1 - p.confidence),
    )
  }, [points])

  const imageRanking = useMemo(
    () =>
      [...pointsByImage.entries()]
        .map(([imageId, pts]) => ({
          imageId,
          label: pts[0]?.imageLabel ?? "",
          meanDrift: mean(pts.map((p) => p.drift)),
        }))
        .sort((a, b) => b.meanDrift - a.meanDrift),
    [pointsByImage],
  )

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return
    addImage(URL.createObjectURL(file), file, file.name.replace(/\.[^.]+$/, ""))
  }

  return (
    <Panel
      label={<InfoTip text={PANEL_TIP}>Dataset Benchmark</InfoTip>}
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
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2"
              style={{ borderColor: colorFor(img.id) }}
              onMouseEnter={() => setHoveredImageId(img.id)}
              onMouseLeave={() => setHoveredImageId(null)}
            >
              <img src={img.source.url} alt={img.label} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label={`Remove ${img.label} from the benchmark set`}
                className="absolute inset-0 hidden items-center justify-center bg-ink/60 text-xs text-paper group-hover:flex"
              >
                Remove
              </button>
            </div>
          ))}
          {canAddMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted transition hover:border-ink hover:text-ink"
              aria-label="Add an image to the benchmark set"
            >
              +
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(AXIS_LABELS) as (keyof TransformState)[]).map((key) => (
            <button
              key={key}
              type="button"
              disabled={images.length === 0 || status === "running"}
              onClick={() => run(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                axis === key
                  ? "border-accent bg-accent-soft text-accent-text"
                  : "border-border text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {AXIS_LABELS[key]}
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
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        )}

        {error && <p className="text-xs text-accent-text">{error}</p>}

        {points.length === 0 ? (
          <p className="text-sm text-muted">
            Pick a perturbation above to run it across every image in this set — up to 6 images, {" "}
            {images.length * 11 || "…"} real forward passes — and see whether one image's curve was typical or
            an outlier.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
                  Similarity vs. severity, per image
                </div>
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                  {[...pointsByImage.entries()].map(([imageId, pts]) => {
                    const dimmed = hoveredImageId !== null && hoveredImageId !== imageId
                    const d = `M ${pts.map((p) => `${curveX(p.severity)},${curveY01(p.similarity)}`).join(" L ")}`
                    return (
                      <path
                        key={imageId}
                        d={d}
                        fill="none"
                        stroke={colorFor(imageId)}
                        strokeWidth={1.5}
                        opacity={dimmed ? 0.15 : 0.6}
                        onMouseEnter={() => setHoveredImageId(imageId)}
                        onMouseLeave={() => setHoveredImageId(null)}
                        style={{ cursor: "pointer", transition: "opacity 150ms ease-out" }}
                      />
                    )
                  })}
                  {meanBySeverity.length > 1 && (
                    <path
                      d={`M ${meanBySeverity.map((m) => `${curveX(m.severity)},${curveY01(m.mean)}`).join(" L ")}`}
                      fill="none"
                      stroke="var(--color-ink)"
                      strokeWidth={2}
                    />
                  )}
                </svg>
                <p className="mt-1 text-[10px] text-muted">Dark line = mean across all images</p>
              </div>

              <div className="min-w-0">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
                  Drift vs. uncertainty, pooled
                  {pooledCorrelation !== null && (
                    <span className="text-ink"> · ρ = {pooledCorrelation.toFixed(2)}</span>
                  )}
                </div>
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                  {points.map((p, i) => {
                    const dimmed = hoveredImageId !== null && hoveredImageId !== p.imageId
                    return (
                      <circle
                        key={`${p.imageId}-${i}`}
                        cx={curveX(p.drift)}
                        cy={curveY01(1 - p.confidence)}
                        r={3}
                        fill={colorFor(p.imageId)}
                        fillOpacity={dimmed ? 0.15 : 0.7}
                        onMouseEnter={() => setHoveredImageId(p.imageId)}
                        onMouseLeave={() => setHoveredImageId(null)}
                        style={{ cursor: "pointer", transition: "opacity 150ms ease-out" }}
                      />
                    )
                  })}
                </svg>
                <p className="mt-1 text-[10px] text-muted">x = drift, y = 1 − confidence</p>
              </div>
            </div>

            {imageRanking.length > 1 && (
              <div className="border-t border-border pt-4">
                <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">
                  Mean drift by image — which was hit hardest
                </div>
                <div className="flex flex-col gap-2">
                  {imageRanking.map(({ imageId, label, meanDrift }) => (
                    <div
                      key={imageId}
                      className="flex cursor-pointer items-center gap-3"
                      onMouseEnter={() => setHoveredImageId(imageId)}
                      onMouseLeave={() => setHoveredImageId(null)}
                    >
                      <span className="w-20 shrink-0 truncate text-xs text-muted">{label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, meanDrift * 100)}%`,
                            backgroundColor: colorFor(imageId),
                            opacity: hoveredImageId !== null && hoveredImageId !== imageId ? 0.4 : 1,
                          }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right font-mono text-xs text-ink">
                        {(meanDrift * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
