import type { TransformState } from "../types/transform"

// Intensity is normalized 0–1 for every control. This is the single source of
// truth for what "0" and "1" mean per transform — mirrored nowhere else.
export const TRANSFORM_CONFIG = {
  maxBlurPx: 20,
  maxNoiseStdDev: 45, // std. deviation added per RGB channel, in 0–255 units
  maxBrightnessPercent: 220, // 100% = unchanged
  maxRotationDegrees: 45,
  minJpegQuality: 0.1, // compression = 1 encodes at this quality
} as const

export const MAX_IMAGE_DIMENSION = 1024

// The live preview and the backend-analysis pipeline each render the
// transform independently (different debounce timings). A fixed seed makes
// noise generation deterministic, so the same (image, transform) combination
// always produces byte-identical output — otherwise Math.random() would make
// the backend analyze different noise than what's actually on screen.
const NOISE_SEED = 1337

// mulberry32: a small, fast, deterministic PRNG.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = url
  })
}

function computeCanvasSize(img: HTMLImageElement) {
  const { naturalWidth: w, naturalHeight: h } = img
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

// Box-Muller transform: converts uniform random samples into a standard
// normal (Gaussian) distribution.
function gaussianSample(random: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = random()
  while (v === 0) v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function applyNoise(ctx: CanvasRenderingContext2D, width: number, height: number, stdDev: number) {
  const random = createSeededRandom(NOISE_SEED)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampByte(data[i] + gaussianSample(random) * stdDev)
    data[i + 1] = clampByte(data[i + 1] + gaussianSample(random) * stdDev)
    data[i + 2] = clampByte(data[i + 2] + gaussianSample(random) * stdDev)
  }
  ctx.putImageData(imageData, 0, 0)
}

function encodeCanvas(canvas: HTMLCanvasElement, compression: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const handleBlob = (blob: Blob | null) => {
      if (blob) resolve(blob)
      else reject(new Error("Failed to encode transformed image"))
    }
    if (compression <= 0) {
      canvas.toBlob(handleBlob, "image/png")
    } else {
      const quality = 1 - compression * (1 - TRANSFORM_CONFIG.minJpegQuality)
      canvas.toBlob(handleBlob, "image/jpeg", quality)
    }
  })
}

export interface TransformedImage {
  url: string
  blob: Blob
}

export async function applyTransform(
  img: HTMLImageElement,
  transform: TransformState,
): Promise<TransformedImage> {
  const { width, height } = computeCanvasSize(img)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context is not available")

  const blurPx = transform.blur * TRANSFORM_CONFIG.maxBlurPx
  const brightnessPercent = 100 + transform.brightness * (TRANSFORM_CONFIG.maxBrightnessPercent - 100)
  const rotationDegrees = transform.rotation * TRANSFORM_CONFIG.maxRotationDegrees

  // Rotation can expose corners outside the source image — filled white.
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.filter = `brightness(${brightnessPercent}%) blur(${blurPx}px)`
  ctx.translate(width / 2, height / 2)
  ctx.rotate((rotationDegrees * Math.PI) / 180)
  ctx.drawImage(img, -width / 2, -height / 2, width, height)
  ctx.restore()

  if (transform.noise > 0) {
    applyNoise(ctx, width, height, transform.noise * TRANSFORM_CONFIG.maxNoiseStdDev)
  }

  const blob = await encodeCanvas(canvas, transform.compression)
  return { url: URL.createObjectURL(blob), blob }
}
