export function detectQuality() {
  const mobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth < 768

  const dpr = window.devicePixelRatio || 1
  const dprCap = mobile ? 1.5 : 2

  return {
    mobile,
    dpr,
    hardwareScaling: dpr > dprCap ? dpr / dprCap : 1,
    linkCount: mobile ? 15 : 20,
    torusSeg: mobile ? 28 : 48,
    tubeSeg: mobile ? 12 : 20,
    puffMul: mobile ? 0.65 : 1,
    dust: !mobile,
    msaa: mobile ? 1 : 4,
    fxaa: true,
    bloomKernel: mobile ? 28 : 56,
    cloudTex: mobile ? 256 : 384,
    ringTex: 256,
  }
}
