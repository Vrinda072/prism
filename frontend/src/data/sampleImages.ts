export interface SampleImage {
  id: string
  label: string
  src: string
}

// Real photography from Wikimedia Commons — see public/samples/CREDITS.md for
// attribution. Four deliberately different subjects (object, traffic,
// landscape, animal) so the semantic-analysis panel has something genuinely
// varied to score, unified by one warm golden-hour palette so the set still
// reads as one designed collection rather than random photos.
export const SAMPLE_IMAGES: SampleImage[] = [
  { id: "typewriter", label: "Typewriter", src: "/samples/typewriter.jpg" },
  { id: "traffic", label: "Traffic", src: "/samples/traffic.jpg" },
  { id: "desert", label: "Desert", src: "/samples/desert.jpg" },
  { id: "fox", label: "Fox", src: "/samples/fox.jpg" },
]
