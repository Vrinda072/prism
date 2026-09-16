export interface SampleImage {
  id: string
  label: string
  src: string
}

// Real photography from Wikimedia Commons — see public/samples/CREDITS.md for
// attribution. A warm pink-to-yellow floral palette, chosen deliberately so
// the sample set reads as one designed collection rather than random photos.
export const SAMPLE_IMAGES: SampleImage[] = [
  { id: "rose", label: "Rose", src: "/samples/rose.jpg" },
  { id: "tulip", label: "Tulip", src: "/samples/tulip.jpg" },
  { id: "marigold", label: "Marigold", src: "/samples/marigold.jpg" },
  { id: "sunflower", label: "Sunflower", src: "/samples/sunflower.jpg" },
]
