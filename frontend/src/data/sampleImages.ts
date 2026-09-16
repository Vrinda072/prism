export interface SampleImage {
  id: string
  label: string
  src: string
}

// Real photography from Wikimedia Commons — see public/samples/CREDITS.md for attribution.
export const SAMPLE_IMAGES: SampleImage[] = [
  { id: "animal", label: "Animal", src: "/samples/animal.jpg" },
  { id: "vehicle", label: "Vehicle", src: "/samples/vehicle.jpg" },
  { id: "architecture", label: "Architecture", src: "/samples/architecture.jpg" },
  { id: "object", label: "Object", src: "/samples/object.jpg" },
]
