interface ControlSliderProps {
  label: string
  value: number // 0–1
  onChange: (value: number) => void
  disabled?: boolean
}

export default function ControlSlider({ label, value, onChange, disabled = false }: ControlSliderProps) {
  const percent = Math.round(value * 100)
  const inputId = `control-${label.toLowerCase()}`

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-xs text-muted">
          {label}
        </label>
        <span className="font-mono text-xs text-ink">{percent}%</span>
      </div>
      <input
        id={inputId}
        type="range"
        min={0}
        max={100}
        value={percent}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={`${label} intensity`}
      />
    </div>
  )
}
