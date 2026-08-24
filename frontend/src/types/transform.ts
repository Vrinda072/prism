export interface TransformState {
  blur: number
  noise: number
  brightness: number
  rotation: number
  compression: number
}

export const DEFAULT_TRANSFORM: TransformState = {
  blur: 0,
  noise: 0,
  brightness: 0,
  rotation: 0,
  compression: 0,
}
