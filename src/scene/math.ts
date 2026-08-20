import { Matrix, Quaternion, Scene, Vector3 } from '@babylonjs/core'

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

export function fract(v: number) {
  return v - Math.floor(v)
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function frameFromTangent(t: Vector3) {
  const tangent = t.clone().normalize()
  let helper = new Vector3(0, 1, 0)
  if (Math.abs(Vector3.Dot(tangent, helper)) > 0.92) {
    helper = new Vector3(1, 0, 0)
  }
  const binormal = Vector3.Cross(tangent, helper).normalize()
  const normal = Vector3.Cross(binormal, tangent).normalize()
  return { t: tangent, normal, binormal }
}

export function linkRotation(tangent: Vector3, hole: Vector3) {
  const y = hole.clone().normalize()
  const x = tangent.clone().normalize()
  x.subtractInPlace(y.scale(Vector3.Dot(x, y)))
  if (x.lengthSquared() < 1e-6) {
    x.copyFromFloats(1, 0, 0)
    x.subtractInPlace(y.scale(Vector3.Dot(x, y)))
  }
  x.normalize()
  const z = Vector3.Cross(x, y).normalize()
  return Quaternion.FromLookDirectionLH(z, y)
}

export function chainPath(u: number, mobile: boolean) {
  const t = clamp(u, 0, 1)
  if (mobile) {
    const x = -7.4 + t * 14.8
    const y = 1.25 - t * 2.15 + Math.sin(t * Math.PI) * 0.32
    const z = 0.55 - t * 0.7
    return new Vector3(x, y, z)
  }
  const x = -9.4 + t * 18.8
  const y = 4.35 - t * 8.5 + Math.sin(t * Math.PI) * 0.48
  const z = 1.25 - t * 2.05 + Math.sin(t * Math.PI * 2) * 0.1
  return new Vector3(x, y, z)
}

export function pathTangent(u: number, mobile: boolean) {
  const a = chainPath(Math.max(0, u - 0.004), mobile)
  const b = chainPath(Math.min(1, u + 0.004), mobile)
  const t = b.subtract(a)
  if (t.lengthSquared() < 1e-8) return new Vector3(1, 0, 0)
  return t.normalize()
}

export function pathLength(mobile: boolean, samples = 48) {
  let len = 0
  let prev = chainPath(0, mobile)
  for (let i = 1; i <= samples; i += 1) {
    const p = chainPath(i / samples, mobile)
    len += Vector3.Distance(prev, p)
    prev = p
  }
  return len
}

export function distPointSeg(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const vx = x1 - x0
  const vy = y1 - y0
  const l2 = vx * vx + vy * vy
  if (l2 < 1e-6) return Math.hypot(px - x0, py - y0)
  const t = clamp(((px - x0) * vx + (py - y0) * vy) / l2, 0, 1)
  return Math.hypot(px - (x0 + t * vx), py - (y0 + t * vy))
}

export function projectToScreen(position: Vector3, scene: Scene) {
  const camera = scene.activeCamera
  if (!camera) return { x: -9999, y: -9999 }
  const engine = scene.getEngine()
  const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
  const p = Vector3.Project(position, Matrix.Identity(), scene.getTransformMatrix(), viewport)
  return { x: p.x, y: p.y }
}
