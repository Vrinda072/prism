import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"

interface InfoTipProps {
  children: ReactNode
  text: string
  position?: "top" | "bottom"
  className?: string
  /** Skip the dotted-underline decoration — for wrapping an element that
   * already has its own clear affordance (a button), rather than plain text. */
  plain?: boolean
}

/** Wraps a label in a dotted-underline hover/focus target that reveals a
 * short explanation — the app's "hovering text" teaching mechanism. */
export default function InfoTip({ children, text, position = "top", className = "", plain = false }: InfoTipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()
  const containerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [marginLeft, setMarginLeft] = useState(0)

  // Default position centers the tooltip under/over its trigger. Computed
  // from the trigger's and tooltip's actual rects (not the tooltip's
  // currently-rendered position, which starts uncentered) so the clamp is
  // correct on the very first measurement — near a screen edge, this pulls
  // the tooltip back in instead of letting it run off-screen. Applied via
  // useLayoutEffect, before paint, so there's no visible jump.
  useLayoutEffect(() => {
    if (!visible || !containerRef.current || !tooltipRef.current) return
    const triggerRect = containerRef.current.getBoundingClientRect()
    const tooltipWidth = tooltipRef.current.getBoundingClientRect().width
    const triggerCenterX = triggerRect.left + triggerRect.width / 2
    const edgeMargin = 8

    const naturalLeft = triggerCenterX - tooltipWidth / 2
    const maxLeft = window.innerWidth - edgeMargin - tooltipWidth
    const clampedLeft = Math.min(Math.max(naturalLeft, edgeMargin), maxLeft)

    setMarginLeft(clampedLeft - triggerCenterX)
  }, [visible])

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex ${plain ? "" : "cursor-help border-b border-dotted border-muted"} ${className}`}
      tabIndex={0}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      aria-describedby={tooltipId}
    >
      {children}
      {visible && (
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-20 w-56 animate-[tooltip-in_150ms_ease-out] border border-border bg-panel-raised p-2.5 text-xs leading-relaxed font-normal normal-case tracking-normal text-ink ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{ boxShadow: "var(--shadow-panel-raised)", marginLeft }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
