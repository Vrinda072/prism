import { ALL_AXES } from "../hooks/useExperiment"
import { AXIS_LABELS } from "../lib/axisLabels"
import type { ExperimentStatus } from "../types/experiment"
import type { TransformState } from "../types/transform"
import ControlSlider from "./ControlSlider"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const PANEL_TIP =
  "One perturbation, one severity, at a time — a controlled single-variable experiment. Pick which corruption to study, then move the severity to any of the 11 tested points; every point is a real transform applied to real pixels and re-analyzed by CLIP, not an estimate."

const AXIS_TIPS: Record<keyof TransformState, string> = {
  blur: "Gaussian blur — softens fine detail. At 100% severity, the image is smoothed with a 20px blur radius.",
  noise:
    "Real Gaussian random noise added to each pixel, simulating sensor grain — generated with a deterministic seed so every run of the same severity is byte-identical.",
  brightness: "Shifts overall exposure. At 100% severity, the image is brightened to 220% of its normal level.",
  contrast:
    "Stretches the gap between light and dark tones. At 100% severity, contrast is boosted to 300% of normal.",
  rotation: "Rotates the image around its center, up to 45° at full severity. Exposed corners are filled white.",
  compression: "Re-encodes the image as JPEG at a lower quality, producing genuine compression artifacts.",
}

interface ControlsBarProps {
  axis: keyof TransformState
  severity: number
  onAxisChange: (axis: keyof TransformState) => void
  onSeverityChange: (severity: number) => void
  status: ExperimentStatus
  progress: number
  total: number
  disabled?: boolean
}

export default function ControlsBar({
  axis,
  severity,
  onAxisChange,
  onSeverityChange,
  status,
  progress,
  total,
  disabled = false,
}: ControlsBarProps) {
  return (
    <Panel
      label={<InfoTip text={PANEL_TIP}>Perturbation</InfoTip>}
      headerRight={
        status === "running" ? (
          <span className="font-mono text-[11px] text-muted">
            {progress} / {total}
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-5 p-5">
        <div>
          <div className="mb-2 text-xs text-muted">Corruption type</div>
          <div className="flex flex-wrap gap-2">
            {ALL_AXES.map((key) => (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onAxisChange(key)}
                title={AXIS_TIPS[key]}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  axis === key
                    ? "border-accent bg-accent-soft text-accent-text"
                    : "border-border text-muted hover:border-ink hover:text-ink"
                }`}
              >
                {AXIS_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {status === "running" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        )}

        <ControlSlider
          label="Severity"
          tip="How strongly the chosen corruption is applied, from 0 (the untouched original) to 100. Fixed at 10-point steps — the same 11 severities every experiment on this site measures, so every number shown is real."
          value={severity}
          step={10}
          disabled={disabled || status === "running"}
          onChange={onSeverityChange}
        />
      </div>
    </Panel>
  )
}
