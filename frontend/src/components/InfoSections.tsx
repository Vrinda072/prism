const STEPS = [
  {
    n: "01",
    title: "Perturb",
    body: "Drag a slider — blur, noise, brightness, rotation, or JPEG compression — applied to real pixels on a canvas, not a CSS filter approximation.",
  },
  {
    n: "02",
    title: "Measure",
    body: "The original and perturbed images each get a real forward pass through CLIP ViT-B/32, producing two 512-dimensional embeddings.",
  },
  {
    n: "03",
    title: "Visualize",
    body: "Cosine similarity, drift, and a PCA-projected embedding trajectory turn those two vectors into something you can actually look at.",
  },
  {
    n: "04",
    title: "Investigate",
    body: "Run a controlled severity sweep on one variable at a time and watch where — and how suddenly — the model's representation breaks down.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border px-8 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-3xl font-bold text-ink">How it works</h2>
        <p className="mt-3 max-w-xl text-muted">
          PRISM studies one question: how stable is a vision-language model's representation when the
          visual input is systematically changed?
        </p>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span className="font-mono text-sm text-accent-text">{step.n}</span>
              <h3 className="mt-2 font-heading text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

interface Endpoint {
  method: string
  path: string
  description: string
}

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/health", description: "Model load state and inference device (cpu/mps/cuda)." },
  { method: "POST", path: "/analyze", description: "One image in, its 512-d CLIP embedding out." },
  {
    method: "POST",
    path: "/compare",
    description: "Two images in, cosine similarity, drift, and both embeddings out.",
  },
  {
    method: "POST",
    path: "/project",
    description: "A set of embeddings in, PCA-projected 2D points out (sign-stabilized across calls).",
  },
  {
    method: "POST",
    path: "/semantic",
    description: "One image in, CLIP zero-shot scores against a fixed 6-concept set, plus confidence and entropy.",
  },
]

export function ApiReference() {
  return (
    <section id="api" className="border-t border-border px-8 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold text-ink">API</h2>
        <p className="mt-3 text-muted">The actual routes this app calls — nothing here is illustrative.</p>
        <div className="mt-10 flex flex-col gap-1">
          {ENDPOINTS.map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex flex-col gap-1 rounded-2xl border border-border bg-panel px-5 py-4 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="shrink-0 font-mono text-xs font-medium text-accent-text">{endpoint.method}</span>
              <span className="shrink-0 font-mono text-sm text-ink">{endpoint.path}</span>
              <span className="text-sm text-muted">{endpoint.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const LIMITATIONS = [
  "Inference runs on one local CLIP ViT-B/32 model — no larger model, no ensemble, no cloud API.",
  "Experiment history lives in memory for this browser session only; it's gone on refresh.",
  "Canvas-based perturbations approximate real-world image corruption — they aren't a literal camera-sensor or codec simulation.",
  "The embedding trajectory's axes come from PCA on whatever points exist so far — only relative positions and distances are meaningful, not the axes themselves.",
  "Semantic Analysis and the Robustness Sweep score against a small fixed set of six concepts — a real zero-shot classification, not a general-purpose one.",
]

export function Limitations() {
  return (
    <section id="limitations" className="border-t border-border px-8 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading text-3xl font-bold text-ink">Limitations</h2>
        <p className="mt-3 text-muted">Stated plainly, not hidden in a footnote.</p>
        <ul className="mt-10 flex flex-col gap-4">
          {LIMITATIONS.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
