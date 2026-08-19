import {
  CubeTexture,
  DynamicTexture,
  Texture,
} from '@babylonjs/core'

function hash(ix, iy) {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function valueNoise(x, y) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0)
  const b = hash(x0 + 1, y0)
  const c = hash(x0, y0 + 1)
  const d = hash(x0 + 1, y0 + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x, y) {
  let v = 0
  let a = 0.55
  let f = 1
  for (let i = 0; i < 5; i += 1) {
    v += a * valueNoise(x * f, y * f)
    f *= 2.05
    a *= 0.5
  }
  return v
}

export function createCloudTexture(scene, size, seed = 1) {
  const tex = new DynamicTexture(
    `cloudTex-${seed}`,
    { width: size, height: size },
    scene,
    false,
  )
  const ctx = tex.getContext()
  const data = ctx.createImageData(size, size)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size
      const dx = u - 0.5
      const dy = v - 0.5
      const r = Math.sqrt(dx * dx + dy * dy)
      const n = fbm(u * 4.2 + seed * 1.7, v * 4.2 - seed)
      const n2 = fbm(u * 8 + seed, v * 8)
      const shape = Math.max(0, 1 - r * 2.05)
      const wisps = Math.max(0, n * 0.78 + n2 * 0.28 - 0.18)
      const alpha = Math.min(1, shape * wisps * 2.15)
      const i = (y * size + x) * 4
      const lift = 210 + n * 45
      data.data[i] = Math.min(255, lift)
      data.data[i + 1] = Math.min(255, 188 + n * 40)
      data.data[i + 2] = 255
      data.data[i + 3] = Math.floor(alpha * 255)
    }
  }

  ctx.putImageData(data, 0, 0)
  tex.update(false)
  tex.hasAlpha = true
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  return tex
}

export function createRingTexture(scene, size) {
  const tex = new DynamicTexture('ringTex', { width: size, height: size }, scene, false)
  const ctx = tex.getContext()
  const data = ctx.createImageData(size, size)
  const rings = [0.16, 0.255, 0.35]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size - 0.5
      const v = y / size - 0.5
      const d = Math.sqrt(u * u + v * v)
      let glow = 0
      for (let r = 0; r < rings.length; r += 1) {
        const w = r === 1 ? 0.018 : 0.014
        const dist = Math.abs(d - rings[r])
        glow += Math.exp(-((dist / w) ** 2)) * (r === 1 ? 1 : 0.72)
      }
      glow *= d < 0.46 ? 1 : Math.max(0, 1 - (d - 0.46) * 18)
      const i = (y * size + x) * 4
      data.data[i] = 255
      data.data[i + 1] = 92
      data.data[i + 2] = 255
      data.data[i + 3] = Math.min(255, Math.floor(glow * 255))
    }
  }

  ctx.putImageData(data, 0, 0)
  tex.update(false)
  tex.hasAlpha = true
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  return tex
}

export function createSoftDot(scene, size = 128) {
  const tex = new DynamicTexture('softDot', { width: size, height: size }, scene, false)
  const ctx = tex.getContext()
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(236,200,255,0.55)')
  g.addColorStop(1, 'rgba(160,80,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  tex.update(false)
  tex.hasAlpha = true
  return tex
}

function paintFace(kind, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, size, size)

  if (kind === 'py') {
    g.addColorStop(0, '#ead9ff')
    g.addColorStop(0.45, '#8b5cf6')
    g.addColorStop(1, '#2a1544')
  } else if (kind === 'ny') {
    g.addColorStop(0, '#140816')
    g.addColorStop(1, '#050208')
  } else if (kind === 'px') {
    g.addColorStop(0, '#2a0d28')
    g.addColorStop(0.5, '#e879f9')
    g.addColorStop(1, '#1a0824')
  } else if (kind === 'nx') {
    g.addColorStop(0, '#0b1024')
    g.addColorStop(0.6, '#4338ca')
    g.addColorStop(1, '#120818')
  } else if (kind === 'pz') {
    g.addColorStop(0, '#241036')
    g.addColorStop(0.5, '#c084fc')
    g.addColorStop(1, '#0c0614')
  } else {
    g.addColorStop(0, '#120814')
    g.addColorStop(0.55, '#3b0764')
    g.addColorStop(1, '#050208')
  }

  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  if (kind === 'py' || kind === 'pz') {
    const blob = ctx.createRadialGradient(size * 0.35, size * 0.3, 4, size * 0.35, size * 0.3, size * 0.45)
    blob.addColorStop(0, 'rgba(255,255,255,0.55)')
    blob.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = blob
    ctx.fillRect(0, 0, size, size)
  }

  return canvas.toDataURL('image/png')
}

export function createEnvCube(scene) {
  const size = 128
  const files = [
    paintFace('px', size),
    paintFace('py', size),
    paintFace('pz', size),
    paintFace('nx', size),
    paintFace('ny', size),
    paintFace('nz', size),
  ]
  const cube = CubeTexture.CreateFromImages(files, scene)
  cube.rotationY = 0.55
  return cube
}
