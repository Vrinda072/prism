import ControlSlider from "./ControlSlider"
import Panel from "./Panel"
import type { TransformState } from "../types/transform"

interface ControlsBarProps {
  transform: TransformState
  onChange: (transform: TransformState) => void
  disabled?: boolean
}

const CONTROLS: { key: keyof TransformState; label: string; tip: string }[] = [
  {
    key: "blur",
    label: "Blur",
    tip: "Gaussian blur — softens fine detail. At 100% intensity, the image is smoothed with a 20px blur radius.",
  },
  {
    key: "noise",
    label: "Noise",
    tip: "Adds real Gaussian random noise to each pixel, simulating sensor grain — generated with a deterministic seed so the preview and the analyzed image always match exactly.",
  },
  {
    key: "brightness",
    label: "Brightness",
    tip: "Shifts overall exposure. At 100% intensity, the image is brightened to 220% of its normal level.",
  },
  {
    key: "rotation",
    label: "Rotation",
    tip: "Rotates the image around its center, up to 45° at full intensity. Corners exposed by the rotation are filled white.",
  },
  {
    key: "compression",
    label: "Compression",
    tip: "Re-encodes the image as JPEG at a lower quality — this produces genuine compression artifacts, not a simulated blur effect.",
  },
]

export default function ControlsBar({ transform, onChange, disabled = false }: ControlsBarProps) {
  return (
    <Panel label="Perturbations">
      <div className="flex flex-col gap-5 p-5">
        {CONTROLS.map(({ key, label, tip }, i) => (
          <ControlSlider
            key={key}
            label={label}
            tip={tip}
            value={transform[key]}
            disabled={disabled}
            staggerMs={i * 50}
            onChange={(value) => onChange({ ...transform, [key]: value })}
          />
        ))}
      </div>
    </Panel>
  )
}
