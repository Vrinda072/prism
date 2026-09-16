import type { ReactNode } from "react"

interface PanelProps {
  label: ReactNode
  children: ReactNode
  headerRight?: ReactNode
  className?: string
  raised?: boolean
  /** 0–1: tints the panel border toward the accent color, live-updating —
   * used to tie a panel visually to a metric it's driven by (e.g. the
   * transformed image's border reflecting current drift), so the change is
   * visible on the image itself, not just in the numbers beside it. */
  accentIntensity?: number
}

export default function Panel({
  label,
  children,
  headerRight,
  className = "",
  raised = false,
  accentIntensity,
}: PanelProps) {
  const borderColor =
    accentIntensity !== undefined
      ? `color-mix(in srgb, var(--color-accent) ${Math.round(Math.min(1, Math.max(0, accentIntensity)) * 100)}%, var(--color-border))`
      : undefined

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted">{label}</span>
        {headerRight}
      </div>
      <div
        className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-panel transition-[border-color,box-shadow] duration-500"
        style={{
          boxShadow: raised ? "var(--shadow-panel-raised)" : "var(--shadow-panel)",
          borderColor,
        }}
      >
        {children}
      </div>
    </div>
  )
}
