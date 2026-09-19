export interface ImageSource {
  url: string
  blob: Blob
  /** Human-readable name for display and export — a sample's label, or an
   * uploaded file's name. Optional so nothing breaks if a caller omits it. */
  label?: string
}
