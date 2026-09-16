import { summarizeTransform } from "../lib/transformSummary"
import type { Experiment } from "../types/experiment"
import InfoTip from "./InfoTip"
import Panel from "./Panel"

const TIP =
  "Saved runs, kept in memory for this browser session only — nothing is sent to a server or written to disk. Click one to restore its image and perturbation settings exactly."

interface ExperimentHistoryProps {
  experiments: Experiment[]
  onRestore: (experiment: Experiment) => void
}

function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000)
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

export default function ExperimentHistory({ experiments, onRestore }: ExperimentHistoryProps) {
  return (
    <Panel
      label={<InfoTip text={TIP}>Experiment History</InfoTip>}
      headerRight={
        <span className="text-[11px] uppercase tracking-widest text-muted">
          {experiments.length > 0 ? experiments.length : ""}
        </span>
      }
    >
      <div className="flex flex-1 flex-col overflow-y-auto">
        {experiments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-5">
            <p className="max-w-[14rem] text-center text-sm text-muted">
              Save a run from the analysis panel to build a history of experiments.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {[...experiments].reverse().map((exp) => (
              <li key={exp.id}>
                <button
                  type="button"
                  onClick={() => onRestore(exp)}
                  className="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent-soft"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{exp.name}</span>
                    <span className="shrink-0 text-[10px] text-muted">{relativeTime(exp.createdAt)}</span>
                  </div>
                  <span className="truncate text-xs text-muted">{summarizeTransform(exp.transform)}</span>
                  <div className="mt-1 flex gap-4 font-mono text-xs text-ink">
                    <span>{(exp.similarity * 100).toFixed(1)}% sim</span>
                    <span>{(exp.drift * 100).toFixed(1)}% drift</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
