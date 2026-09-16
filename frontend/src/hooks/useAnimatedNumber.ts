import { useEffect, useRef, useState } from "react"

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Tweens a numeric value toward its latest target over `durationMs`, via requestAnimationFrame. */
export function useAnimatedNumber(target: number | null, durationMs = 500): number | null {
  const [value, setValue] = useState(target)
  // Mirrors the animation's current position on every frame, independent of
  // React's render cycle — lets a new target mid-tween redirect smoothly
  // from wherever the animation actually is, instead of jumping back to a
  // stale value captured when the effect was last set up.
  const currentRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === null) {
      currentRef.current = null
      setValue(null)
      return
    }

    const from = currentRef.current ?? target
    if (from === target) {
      currentRef.current = target
      setValue(target)
      return
    }

    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const next = from + (target - from) * easeOutCubic(t)
      currentRef.current = next
      setValue(next)

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        currentRef.current = target
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs])

  return value
}
