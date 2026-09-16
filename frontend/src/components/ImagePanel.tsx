import Panel from "./Panel"

interface ImagePanelProps {
  label: string
  imageUrl: string | null
  emptyMessage: string
  accentIntensity?: number
}

export default function ImagePanel({ label, imageUrl, emptyMessage, accentIntensity }: ImagePanelProps) {
  return (
    <Panel label={label} accentIntensity={accentIntensity}>
      <div className="flex flex-1 min-h-[360px] items-center justify-center overflow-hidden lg:min-h-[480px]">
        {imageUrl ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={label}
            className="h-full w-full animate-[fade-in_300ms_ease] object-contain"
          />
        ) : (
          <span className="max-w-[16rem] px-6 text-center text-sm text-muted">{emptyMessage}</span>
        )}
      </div>
    </Panel>
  )
}
