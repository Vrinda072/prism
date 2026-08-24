// An abstract representation of embedding distance — not a literal 2D
// projection of the 512-dim space. Movement is a monotonic (sqrt-amplified,
// so small early drift is still visible) function of the real drift value,
// so it always honestly reflects the measured number, never a fabricated one.
const MAX_TRAVEL_PERCENT = 82

interface DriftVisualizationProps {
  drift: number | null
}

export default function DriftVisualization({ drift }: DriftVisualizationProps) {
  const clamped = drift === null ? 0 : Math.min(1, Math.max(0, drift))
  const travelPercent = Math.sqrt(clamped) * MAX_TRAVEL_PERCENT
  const hasMoved = clamped > 0.01

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="mb-5 text-[11px] uppercase tracking-widest text-muted">Representation Distance</div>
      <div className="relative mx-[5px] h-3">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-2.5 w-2.5 rounded-full bg-ink" />
        </div>
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
          style={{ left: `${travelPercent}%` }}
        >
          <span
            className={`block h-2.5 w-2.5 rounded-full border-2 border-accent transition-colors duration-500 ${
              hasMoved ? "bg-paper" : "bg-ink"
            }`}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-between text-[10px] uppercase tracking-widest text-muted">
        <span>Original</span>
        <span>Transformed</span>
      </div>
    </div>
  )
}
