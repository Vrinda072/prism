import type { CSSProperties } from "react"
import InfoTip from "./InfoTip"

interface ControlSliderProps {
  label: string
  tip: string
  value: number // 0–1
  onChange: (value: number) => void
  disabled?: boolean
  staggerMs?: number
  /** Percent-scale step size, e.g. 10 snaps to 0/10/20/.../100. Defaults to
   * 1 (free dragging) for controls with no fixed measurement points. */
  step?: number
}

export default function ControlSlider({
  label,
  tip,
  value,
  onChange,
  disabled = false,
  staggerMs = 0,
  step = 1,
}: ControlSliderProps) {
  const percent = Math.round(value * 100)
  const inputId = `control-${label.toLowerCase()}`

  return (
    <div
      className="rise-in flex min-w-0 flex-col gap-2"
      style={{ "--stagger-delay": `${staggerMs}ms` } as CSSProperties}
    >
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-xs text-muted">
          <InfoTip text={tip} position="bottom">
            {label}
          </InfoTip>
        </label>
        <span className="font-mono text-xs text-ink">{percent}%</span>
      </div>
      <input
        id={inputId}
        type="range"
        min={0}
        max={100}
        step={step}
        value={percent}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={`${label} intensity`}
      />
    </div>
  )
}
