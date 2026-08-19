import { Quaternion, Vector3 } from '@babylonjs/core'

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function frameFromTangent(t) {
  const tangent = t.clone().normalize()
  let helper = new Vector3(0, 1, 0)
  if (Math.abs(Vector3.Dot(tangent, helper)) > 0.92) {
    helper = new Vector3(1, 0, 0)
  }
  const binormal = Vector3.Cross(tangent, helper).normalize()
  const normal = Vector3.Cross(binormal, tangent).normalize()
  return { t: tangent, normal, binormal }
}

export function lookRotation(forward, up) {
  return Quaternion.FromLookDirectionLH(forward, up)
}

export function chainPath(t) {
  const x = -8.15 + t * 16.3
  const y = 4.55 - t * 9.15 + Math.sin(t * Math.PI) * 0.42
  const z = 1.35 - t * 2.15 + Math.sin(t * Math.PI * 2) * 0.12
  return new Vector3(x, y, z)
}
