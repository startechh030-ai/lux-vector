import type { DynamicTexture } from '@babylonjs/core'

export type Quality = {
  mobile: boolean
  dpr: number
  hardwareScaling: number
  puffMul: number
  dust: boolean
  msaa: number
  fxaa: boolean
  bloomKernel: number
  cloudTex: number
  ringTex: number
  linkPathSegs: number
  tubeSegs: number
  linkLength: number
  linkWidth: number
  tubeRadius: number
}

export type SceneTextures = {
  cloudA: DynamicTexture
  cloudB: DynamicTexture
  ring: DynamicTexture
  dot: DynamicTexture
  scratch: DynamicTexture
}

export type PointerDir = {
  x: number
  y: number
}

export type ChainState = 'travel' | 'hanging' | 'reforming'
