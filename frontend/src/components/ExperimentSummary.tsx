import { useMemo, type ReactNode } from "react"
import { AXIS_LABELS } from "../lib/axisLabels"
import { buildExperimentSummary, downloadExperimentSummary, MODEL_NAME } from "../lib/exportExperiment"
import type { ExperimentStatus, ExperimentStep } from "../types/experiment"
import type { ImageSource } from "../types/image"
import type { TransformState } from "../types/transform"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const TIP =
  "A factual readout of this sweep, generated directly from the measured numbers above — every value here is real, nothing is an AI-generated interpretation. Available once the full 11-point sweep finishes."

interface FieldProps {
  label: string
  value: string
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 font-mono text-sm text-ink">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{children}</div>
    </div>
  )
}

interface ExperimentSummaryProps {
  image: ImageSource | null
  axis: keyof TransformState
  steps: ExperimentStep[]
  status: ExperimentStatus
}

export default function ExperimentSummary({ image, axis, steps, status }: ExperimentSummaryProps) {
  const summary = useMemo(() => {
    if (!image || status !== "done") return null
    return buildExperimentSummary(image, axis, steps)
  }, [image, axis, steps, status])

  return (
    <Panel
      label={<InfoTip text={TIP}>Experiment Summary</InfoTip>}
      headerRight={
        summary ? (
          <button
            type="button"
            onClick={() => downloadExperimentSummary(summary)}
            className="text-[11px] font-medium uppercase tracking-widest text-muted transition-colors hover:text-ink"
          >
            Export JSON
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-5 p-5">
        {!summary ? (
          <p className="text-sm text-muted">
            {image
              ? "Finishes once the current severity sweep completes."
              : "Choose an image and run a sweep to generate a factual summary."}
          </p>
        ) : (
          <>
            <Section title="Experiment">
              <Field label="Model" value={MODEL_NAME} />
              <Field label="Image" value={summary.image} />
              <Field label="Perturbation" value={AXIS_LABELS[axis]} />
              <Field label="Severity range" value="0-100%, 11 points" />
            </Section>

            <Section title="Representation">
              <Field label="Initial similarity" value={`${(summary.representation.initialSimilarity * 100).toFixed(1)}%`} />
              <Field label="Final similarity" value={`${(summary.representation.finalSimilarity * 100).toFixed(1)}%`} />
              <Field label="Total drift" value={`${(summary.representation.totalDrift * 100).toFixed(1)}%`} />
              <Field label="Trajectory" value={summary.representation.trajectory} />
            </Section>

            <Section title="Semantic behavior">
              <Field
                label="Initial prediction"
                value={`${summary.semantic.initialPrediction} (${(summary.semantic.initialConfidence * 100).toFixed(1)}%)`}
              />
              <Field
                label="Final prediction"
                value={`${summary.semantic.finalPrediction} (${(summary.semantic.finalConfidence * 100).toFixed(1)}%)`}
              />
              <Field
                label="Prediction changes"
                value={
                  summary.semantic.predictionFlips.length === 0
                    ? "None"
                    : summary.semantic.predictionFlips
                        .map((f) => `${Math.round(f.severity * 100)}%: ${f.from} → ${f.to}`)
                        .join("; ")
                }
              />
              <Field
                label="Entropy"
                value={`${summary.semantic.initialEntropy.toFixed(3)} → ${summary.semantic.finalEntropy.toFixed(3)}`}
              />
            </Section>

            <div className="border-t border-border pt-4">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">Task performance</div>
              <p className="text-sm text-muted">{summary.taskPerformance}</p>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
