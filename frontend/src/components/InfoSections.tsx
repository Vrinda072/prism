const STEPS = [
  {
    n: "01",
    title: "Perturb",
    body: "Drag a slider — blur, noise, brightness, contrast, rotation, or JPEG compression — applied to real pixels on a canvas, not a CSS filter approximation.",
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

