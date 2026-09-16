import { useModelStatus } from "../hooks/useModelStatus"

const STATUS_LABEL = {
  checking: "Checking...",
  online: "CLIP ViT-B/32 · 512 dims · local inference",
  offline: "Model offline",
} as const

const STATUS_DOT = {
  checking: "bg-muted",
  online: "bg-positive",
  offline: "bg-accent",
} as const

export default function Hero() {
  const status = useModelStatus()

  return (
    <section id="overview" className="px-8 pt-20 pb-16 text-center">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2 font-mono text-xs text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {STATUS_LABEL[status]}
        </span>

        <h1 className="mt-8 font-heading text-5xl leading-[1.05] font-bold tracking-tight text-ink sm:text-6xl md:text-7xl">
          Distort an image.
          <br />
          <span className="text-accent-text">Watch the model</span>
          <br />
          <span className="text-accent-text">change its mind.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Pick an image, drag a slider, and watch CLIP re-encode your changes in real time. Every number
          on screen comes from an actual forward pass through the model running locally.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#workspace"
            className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-85"
          >
            Run it locally
          </a>
          <a
            href="#numbers"
            className="rounded-full border border-ink px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            See real results
          </a>
        </div>
      </div>
    </section>
  )
}
