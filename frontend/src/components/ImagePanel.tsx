import Panel from "./Panel"

interface ImagePanelProps {
  label: string
  imageUrl: string | null
  emptyMessage: string
  large?: boolean
}

export default function ImagePanel({ label, imageUrl, emptyMessage, large = false }: ImagePanelProps) {
  return (
    <Panel label={label}>
      <div
        className={`flex flex-1 items-center justify-center overflow-hidden ${
          large ? "min-h-[360px] lg:min-h-[480px]" : "min-h-[220px] lg:min-h-[280px]"
        }`}
      >
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
