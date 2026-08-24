import ControlSlider from "./ControlSlider"
import type { TransformState } from "../types/transform"

interface ControlsBarProps {
  transform: TransformState
  onChange: (transform: TransformState) => void
  disabled?: boolean
}

const CONTROLS: { key: keyof TransformState; label: string }[] = [
  { key: "blur", label: "Blur" },
  { key: "noise", label: "Noise" },
  { key: "brightness", label: "Brightness" },
  { key: "rotation", label: "Rotation" },
  { key: "compression", label: "Compression" },
]

export default function ControlsBar({ transform, onChange, disabled = false }: ControlsBarProps) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-2 gap-x-8 gap-y-6 px-8 py-6 sm:grid-cols-3 lg:grid-cols-5">
        {CONTROLS.map(({ key, label }) => (
          <ControlSlider
            key={key}
            label={label}
            value={transform[key]}
            disabled={disabled}
            onChange={(value) => onChange({ ...transform, [key]: value })}
          />
        ))}
      </div>
    </section>
  )
}
