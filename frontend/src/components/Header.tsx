import { useEffect, useState } from "react"
import { checkHealth } from "../api/client"

type ModelStatus = "checking" | "online" | "offline"

const POLL_INTERVAL_MS = 15000

const STATUS_LABEL: Record<ModelStatus, string> = {
  checking: "Checking...",
  online: "Online",
  offline: "Offline",
}

const STATUS_DOT: Record<ModelStatus, string> = {
  checking: "bg-muted",
  online: "bg-emerald-500",
  offline: "bg-accent",
}

export default function Header() {
  const [status, setStatus] = useState<ModelStatus>("checking")

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const health = await checkHealth()
        if (!cancelled) setStatus(health.model_ready ? "online" : "offline")
      } catch {
        if (!cancelled) setStatus("offline")
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-8 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">PRISM</h1>
          <p className="mt-1 text-sm text-muted">Explore how visual AI representations change.</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[11px] uppercase tracking-widest text-muted">Model</div>
          <div className="mt-1 font-mono text-sm text-ink">CLIP ViT-B/32</div>
          <div className="mt-1 flex items-center gap-1.5 sm:justify-end">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-xs text-muted">{STATUS_LABEL[status]}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
