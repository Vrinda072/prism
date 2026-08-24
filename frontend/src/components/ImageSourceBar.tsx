import { useRef, useState } from "react"
import { SAMPLE_IMAGES } from "../data/sampleImages"
import type { ImageSource } from "../types/image"

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]

interface ImageSourceBarProps {
  onSelect: (image: ImageSource) => void
}

export default function ImageSourceBar({ onSelect }: ImageSourceBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPG, or WEBP image.")
      return
    }
    setError(null)
    setActiveSampleId(null)
    onSelect({ url: URL.createObjectURL(file), blob: file })
  }

  const handleSample = async (id: string, src: string) => {
    setError(null)
    setActiveSampleId(id)
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      onSelect({ url: src, blob })
    } catch {
      setError("Could not load this sample image.")
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-widest text-muted">Sample Images</span>
        <div className="flex gap-2">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSample(sample.id, sample.src)}
              aria-label={`Use sample image: ${sample.label}`}
              aria-pressed={activeSampleId === sample.id}
              className={`h-10 w-10 overflow-hidden border transition ${
                activeSampleId === sample.id ? "border-accent" : "border-border hover:border-ink"
              }`}
            >
              <img src={sample.src} alt={sample.label} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {error && <span className="text-xs text-accent-text">{error}</span>}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border border-ink px-4 py-2 text-xs font-medium uppercase tracking-widest text-ink transition hover:bg-ink hover:text-paper"
        >
          Upload Image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
