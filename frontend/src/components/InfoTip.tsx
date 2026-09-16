import { useId, useState, type ReactNode } from "react"

interface InfoTipProps {
  children: ReactNode
  text: string
  position?: "top" | "bottom"
  className?: string
}

/** Wraps a label in a dotted-underline hover/focus target that reveals a
 * short explanation — the app's "hovering text" teaching mechanism. */
export default function InfoTip({ children, text, position = "top", className = "" }: InfoTipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()

  return (
    <span
      className={`relative inline-flex cursor-help border-b border-dotted border-muted ${className}`}
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
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-20 w-56 -translate-x-1/2 animate-[tooltip-in_150ms_ease-out] border border-border bg-panel-raised p-2.5 text-xs leading-relaxed font-normal normal-case tracking-normal text-ink ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{ boxShadow: "var(--shadow-panel-raised)" }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
