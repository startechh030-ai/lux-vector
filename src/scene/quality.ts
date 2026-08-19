import type { Quality } from './types'

export function detectQuality(): Quality {
  const mobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth < 768

  const dpr = window.devicePixelRatio || 1
  const dprCap = mobile ? 1.5 : 2

  return {
    mobile,
    dpr,
    hardwareScaling: dpr > dprCap ? dpr / dprCap : 1,
    puffMul: mobile ? 0.75 : 1,
    dust: !mobile,
    msaa: mobile ? 1 : 4,
    fxaa: true,
    bloomKernel: mobile ? 28 : 56,
    cloudTex: mobile ? 256 : 384,
    ringTex: 256,
    linkPathSegs: mobile ? 36 : 56,
    tubeSegs: mobile ? 8 : 12,
    linkLength: mobile ? 1.42 : 1.28,
    linkWidth: mobile ? 0.74 : 0.66,
    tubeRadius: mobile ? 0.118 : 0.108,
  }
}
