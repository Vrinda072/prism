import type { ReactNode } from "react"

interface PanelProps {
  label: string
  children: ReactNode
  headerRight?: ReactNode
  className?: string
  raised?: boolean
}

export default function Panel({ label, children, headerRight, className = "", raised = false }: PanelProps) {
  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted">{label}</span>
        {headerRight}
      </div>
      <div
        className="flex flex-1 flex-col border border-border bg-panel transition-shadow duration-300"
        style={{ boxShadow: raised ? "var(--shadow-panel-raised)" : "var(--shadow-panel)" }}
      >
        {children}
      </div>
    </div>
  )
}
