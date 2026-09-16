import ControlSlider from "./ControlSlider"
import Panel from "./Panel"
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
    <Panel label="Perturbations">
      <div className="flex flex-col gap-5 p-5">
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
    </Panel>
  )
}
