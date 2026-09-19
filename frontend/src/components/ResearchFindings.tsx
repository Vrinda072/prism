import { useState, type ReactNode } from "react"
import { PET_STUDY_AXES, PET_STUDY_META } from "../data/petStudyResults"
import InfoTip from "./InfoTip"

const QUESTION_TIP =
  "A real offline experiment, not a live-compute panel like the rest of the site: a script that runs a full severity sweep over a labeled dataset once and reports the actual result."

const AXIS_LABELS: Record<string, string> = { blur: "Blur", noise: "Noise" }

const VIEW_W = 440
const VIEW_H = 190
const PADDING = 28

function curveX(severity: number): number {
  return PADDING + severity * (VIEW_W - PADDING * 2)
}
function curveY(fraction: number): number {
  const clamped = Math.min(1, Math.max(0, fraction))
  return PADDING + (1 - clamped) * (VIEW_H - PADDING * 2)
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 text-sm text-ink">{value}</div>
    </div>
  )
}

const CAVEATS = [
  "20 images per breed is a real but small sample. Individual-breed accuracy numbers are noisier than the pooled fine and coarse curves shown here.",
  "Only blur was tested to a full crossover; noise was tested across the same range without reaching one. Whether the same pattern holds for contrast, rotation, or compression is untested.",
  "The fine and coarse classifiers are independent zero-shot runs, not a hierarchical model — a wrong fine prediction does not by itself determine the coarse classifier's answer.",
  "The noise result is bounded by the severity range tested (pixel standard deviation up to 45 of 255). It is not a claim that CLIP is robust to noise at any intensity.",
]

export function ResearchFindings() {
  const [selectedAxis, setSelectedAxis] = useState(PET_STUDY_AXES[0]?.axis ?? "blur")
  const active = PET_STUDY_AXES.find((a) => a.axis === selectedAxis) ?? PET_STUDY_AXES[0]
  const hasResults = !!active && active.results.length > 1

  return (
    <section id="findings" className="border-t border-border px-8 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold text-ink">Findings</h2>
        <p className="mt-2 text-sm text-muted">
          <InfoTip text={QUESTION_TIP}>An offline dataset study</InfoTip>, run once and reported here — not a
          live panel like the rest of the site.
        </p>

        {hasResults ? (
          <>
            <div className="mt-10 border-t border-border pt-5">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">Research question</div>
              <p className="text-sm leading-relaxed text-ink">
                As corruption severity increases, does CLIP's zero-shot classifier confuse fine-grained
                distinctions (breed vs. breed) before it confuses coarse ones (cat vs. dog) — or do both
                collapse together? Tested independently per corruption type, since a pattern found for one
                doesn't necessarily hold for another.
              </p>
            </div>

            <div className="mt-8 border-t border-border pt-5">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">Method</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <Field label="Model" value="CLIP ViT-B/32, zero-shot" />
                <Field
                  label="Dataset"
                  value={
                    <a
                      href={PET_STUDY_META.datasetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-dotted hover:text-accent-text"
                    >
                      {PET_STUDY_META.datasetName}
                    </a>
                  }
                />
                <Field
                  label="Sample"
                  value={`${PET_STUDY_META.imageCount} images, ${PET_STUDY_META.breedCount} breeds (${PET_STUDY_META.license})`}
                />
                <Field label="Perturbations" value="Blur, Gaussian noise — tested independently" />
                <Field label="Severity" value="11 fixed points, 0-100%" />
                <Field label="Metrics" value="Fine (37-way) and coarse (2-way) zero-shot accuracy" />
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted">
                <span>Results</span>
                {PET_STUDY_AXES.length > 1 && (
                  <div className="flex gap-2">
                    {PET_STUDY_AXES.map((a) => (
                      <button
                        key={a.axis}
                        type="button"
                        onClick={() => setSelectedAxis(a.axis)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium normal-case tracking-normal transition ${
                          selectedAxis === a.axis
                            ? "border-accent bg-accent-soft text-accent-text"
                            : "border-border text-muted hover:border-ink hover:text-ink"
                        }`}
                      >
                        {AXIS_LABELS[a.axis] ?? a.axis}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="mb-3 flex items-center gap-4 text-[10px] uppercase tracking-widest text-muted">
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
                    {active.crossoverSeverity !== null && (
                      <line
                        x1={curveX(active.crossoverSeverity)}
                        y1={PADDING}
                        x2={curveX(active.crossoverSeverity)}
                        y2={VIEW_H - PADDING}
                        stroke="var(--color-accent-text)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    )}
                    <path
                      key={`${active.axis}-coarse`}
                      d={`M ${active.results.map((p) => `${curveX(p.severity)},${curveY(p.coarseAccuracy)}`).join(" L ")}`}
                      fill="none"
                      stroke="var(--color-ink)"
                      strokeWidth={2}
                    />
                    <path
                      key={`${active.axis}-fine`}
                      d={`M ${active.results.map((p) => `${curveX(p.severity)},${curveY(p.fineAccuracy)}`).join(" L ")}`}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                    />
                  </svg>
                  <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted">
                    <span>Accuracy by severity</span>
                    <span>0% → 100%</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Correct
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink" /> Wrong breed, right species
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Wrong species
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                    {active.results.map((p, i, arr) => {
                      if (i === arr.length - 1) return null
                      const next = arr[i + 1]
                      const total = p.correctCount + p.withinSuperclassCount + p.crossSuperclassCount
                      const nextTotal = next.correctCount + next.withinSuperclassCount + next.crossSuperclassCount
                      const x0 = curveX(p.severity)
                      const x1 = curveX(next.severity)
                      const correct0 = p.correctCount / total
                      const correct1 = next.correctCount / nextTotal
                      const within0 = correct0 + p.withinSuperclassCount / total
                      const within1 = correct1 + next.withinSuperclassCount / nextTotal
                      return (
                        <g key={p.severity}>
                          <polygon
                            points={`${x0},${curveY(0)} ${x0},${curveY(correct0)} ${x1},${curveY(correct1)} ${x1},${curveY(0)}`}
                            fill="var(--color-positive)"
                            fillOpacity={0.6}
                          />
                          <polygon
                            points={`${x0},${curveY(correct0)} ${x0},${curveY(within0)} ${x1},${curveY(within1)} ${x1},${curveY(correct1)}`}
                            fill="var(--color-ink)"
                            fillOpacity={0.35}
                          />
                          <polygon
                            points={`${x0},${curveY(within0)} ${x0},${curveY(1)} ${x1},${curveY(1)} ${x1},${curveY(within1)}`}
                            fill="var(--color-accent)"
                            fillOpacity={0.6}
                          />
                        </g>
                      )
                    })}
                    <line
                      x1={PADDING}
                      y1={VIEW_H - PADDING}
                      x2={VIEW_W - PADDING}
                      y2={VIEW_H - PADDING}
                      stroke="var(--color-border)"
                      strokeWidth={1}
                    />
                  </svg>
                  <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted">
                    <span>Fine errors, decomposed</span>
                    <span>0% → 100%</span>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm leading-relaxed text-ink">
                {active.crossoverSeverity !== null
                  ? `Cross-superclass errors — where the model no longer even gets cat-vs-dog right — first become
                     non-trivial around ${Math.round(active.crossoverSeverity * 100)}% ${AXIS_LABELS[active.axis]?.toLowerCase() ?? active.axis}
                     severity. Below that, almost every mistake is a fine confusion (wrong breed, right species):
                     the coarse boundary holds even once the fine one has already broken.`
                  : `Across the severities tested, fine accuracy drifted only modestly and coarse accuracy stayed
                     near 100% throughout — no point where the coarse boundary broke down the way it does under blur.`}
              </p>
            </div>

            <div className="mt-8 border-t border-border pt-5">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-muted">Limitations</div>
              <ul className="flex flex-col gap-2">
                {CAVEATS.map((c) => (
                  <li key={c} className="flex gap-2 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="mt-10 text-sm text-muted">Results pending — the study script hasn't been run yet.</p>
        )}

        <p className="mt-8 border-t border-border pt-5 text-xs text-muted">
          Full write-up and reproduction steps in the repository under{" "}
          <span className="font-mono">backend/research/</span>.
        </p>
      </div>
    </section>
  )
}
