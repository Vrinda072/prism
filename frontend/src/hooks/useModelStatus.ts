import { useEffect, useState } from "react"
import { checkHealth } from "../api/client"

export type ModelStatus = "checking" | "online" | "offline"

const POLL_INTERVAL_MS = 15000

export function useModelStatus(): ModelStatus {
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

  return status
}
