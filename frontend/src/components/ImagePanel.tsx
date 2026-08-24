interface ImagePanelProps {
  label: string
  imageUrl: string | null
  emptyMessage: string
  large?: boolean
}

export default function ImagePanel({ label, imageUrl, emptyMessage, large = false }: ImagePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <span className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted">
        {label}
      </span>
      <div
        className={`flex flex-1 items-center justify-center overflow-hidden border border-border bg-panel ${
          large ? "min-h-[360px] lg:min-h-[480px]" : "min-h-[220px] lg:min-h-[280px]"
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="max-w-[16rem] px-6 text-center text-sm text-muted">{emptyMessage}</span>
        )}
      </div>
    </div>
  )
}
