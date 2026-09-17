import { PET_STUDY_META, PET_STUDY_RESULTS } from "../data/petStudyResults"
import InfoTip from "./InfoTip"

const QUESTION_TIP =
  "The reference CLIP robustness study never tests this: CIFAR-10/100 are single-level label sets, and its EuroSAT run has no severity sweep at all. This fills that gap with a real offline experiment, not a live-compute panel like the rest of the site."

const VIEW_W = 440
const VIEW_H = 200
const PADDING = 28

function curveX(severity: number): number {
  return PADDING + severity * (VIEW_W - PADDING * 2)
}
function curveY(accuracy: number): number {
  const clamped = Math.min(1, Math.max(0, accuracy))
  return PADDING + (1 - clamped) * (VIEW_H - PADDING * 2)
}

export function ResearchFindings() {
  const hasResults = PET_STUDY_RESULTS.length > 1

  return (
    <section id="findings" className="border-t border-border px-8 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold text-ink">Findings</h2>
        <p className="mt-3 max-w-xl text-muted">
          <InfoTip text={QUESTION_TIP}>An offline experiment</InfoTip>, not a live panel: does CLIP confuse
          fine-grained distinctions (breed vs. breed) before it confuses coarse ones (cat vs. dog) as blur
          severity increases — or do both collapse together?
        </p>

        {hasResults ? (
          <>
            <div className="mt-10 rounded-2xl border border-border bg-panel p-5">
              <div className="mb-3 flex items-center gap-4 text-[11px] uppercase tracking-widest text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Fine (37 breeds)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" /> Coarse (cat / dog)
                </span>
              </div>
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                <line
                  x1={PADDING}
                  y1={VIEW_H - PADDING}
                  x2={VIEW_W - PADDING}
                  y2={VIEW_H - PADDING}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                {PET_STUDY_META.crossoverSeverity !== null && (
                  <line
                    x1={curveX(PET_STUDY_META.crossoverSeverity)}
                    y1={PADDING}
                    x2={curveX(PET_STUDY_META.crossoverSeverity)}
                    y2={VIEW_H - PADDING}
                    stroke="var(--color-accent-text)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}
                <path
                  d={`M ${PET_STUDY_RESULTS.map((p) => `${curveX(p.severity)},${curveY(p.coarseAccuracy)}`).join(" L ")}`}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                />
                <path
                  d={`M ${PET_STUDY_RESULTS.map((p) => `${curveX(p.severity)},${curveY(p.fineAccuracy)}`).join(" L ")}`}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                />
              </svg>
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted">
                <span>Severity 0%</span>
                <span>Severity 100%</span>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-ink">
              {PET_STUDY_META.crossoverSeverity !== null
                ? `Cross-superclass errors — where the model no longer even gets cat-vs-dog right — first become
                   non-trivial around ${Math.round(PET_STUDY_META.crossoverSeverity * 100)}% blur severity. Below
                   that, almost every mistake is a fine confusion (wrong breed, right species): the coarse
                   boundary holds even once the fine one has already broken.`
                : `Across the severities tested, fine and coarse accuracy degraded together, without a clear
                   point where coarse classification held while fine classification had already broken down.`}
            </p>
          </>
        ) : (
          <p className="mt-10 text-sm text-muted">Results pending — the study script hasn't been run yet.</p>
        )}

        <p className="mt-6 text-xs text-muted">
          Methodology: CLIP ViT-B/32, the same 8-template prompt ensembling used live in{" "}
          <span className="font-mono">/semantic</span>, on {PET_STUDY_META.imageCount} images (
          {PET_STUDY_META.imageCount > 0 ? Math.round(PET_STUDY_META.imageCount / PET_STUDY_META.breedCount) : "—"}{" "}
          per breed) sampled from the real{" "}
          <a
            href={PET_STUDY_META.datasetUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted hover:text-ink"
          >
            {PET_STUDY_META.datasetName}
          </a>{" "}
          dataset ({PET_STUDY_META.license}), across 11 fixed blur severities. Full results and write-up in the
          repository under <span className="font-mono">backend/research/</span>.
        </p>
      </div>
    </section>
  )
}
