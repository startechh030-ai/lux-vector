import {
  Color3,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'
import { projectToScreen, smoothstep } from './math'
import type { PointerDir, Quality, SceneTextures } from './types'

type Puff = {
  mesh: Mesh
  rest: Vector3
  pos: Vector3
  vel: Vector3
  offset: Vector3
  phase: number
  form: number
  formSpeed: number
  size: number
  scattered: boolean
  reform: number
  spin: number
}

type Cluster = {
  id: string
  origin: Vector3
  puffs: Puff[]
}

const SPECS = [
  { id: 'bl', pos: [-6.2, -2.7, 1.7], scale: 3.5, puffs: 14 },
  { id: 'ml', pos: [-5.4, 0.7, 0.5], scale: 2.6, puffs: 10 },
  { id: 'top', pos: [-0.2, 2.7, 1.2], scale: 2.4, puffs: 10 },
  { id: 'mid', pos: [1.8, 1.5, -0.4], scale: 1.8, puffs: 7 },
  { id: 'br', pos: [5.8, -3.2, 0.95], scale: 3.2, puffs: 12 },
  { id: 'front', pos: [3.0, -4.0, 2.1], scale: 2.2, puffs: 8 },
]

function cloudMaterial(scene: Scene, texture: SceneTextures['cloudA'], tint: Color3, key: string) {
  const mat = new StandardMaterial(`cloudMat-${key}`, scene)
  mat.diffuseTexture = texture
  mat.opacityTexture = texture
  mat.emissiveTexture = texture
  mat.useAlphaFromDiffuseTexture = true
  mat.disableLighting = true
  mat.emissiveColor = tint
  mat.backFaceCulling = false
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND
  return mat
}

export function createClouds(scene: Scene, quality: Quality, textures: SceneTextures) {
  const mats = [
    cloudMaterial(scene, textures.cloudA, new Color3(0.9, 0.82, 1), 'a'),
    cloudMaterial(scene, textures.cloudB, new Color3(0.78, 0.7, 0.98), 'b'),
    cloudMaterial(scene, textures.cloudA, new Color3(0.96, 0.9, 1), 'c'),
  ]

  const clusters: Cluster[] = SPECS.map((spec, ci) => {
    const origin = Vector3.FromArray(spec.pos)
    const count = Math.max(5, Math.round(spec.puffs * quality.puffMul))
    const puffs: Puff[] = []

    for (let i = 0; i < count; i += 1) {
      const size = spec.scale * (0.52 + Math.random() * 0.72)
      const mesh = MeshBuilder.CreatePlane(`puff-${spec.id}-${i}`, { size }, scene)
      mesh.material = mats[(ci + i) % mats.length]
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
      mesh.isPickable = false
      mesh.alphaIndex = 800 + ci * 20 + i
      mesh.visibility = 0

      const offset = new Vector3(
        (Math.random() - 0.5) * spec.scale * 1.15,
        (Math.random() - 0.5) * spec.scale * 0.62,
        (Math.random() - 0.5) * spec.scale * 0.7,
      )
      const rest = origin.add(offset)
      mesh.position.copyFrom(rest)
      mesh.rotation.z = Math.random() * Math.PI

      puffs.push({
        mesh,
        rest: rest.clone(),
        pos: rest.clone(),
        vel: Vector3.Zero(),
        offset,
        phase: Math.random() * Math.PI * 2,
        form: -Math.random() * 1.8,
        formSpeed: 0.28 + Math.random() * 0.22,
        size,
        scattered: false,
        reform: 0,
        spin: (Math.random() - 0.5) * 0.25,
      })
    }

    return { id: spec.id, origin, puffs }
  })

  function scatterNear(sx: number, sy: number, dir: PointerDir, radius: number) {
    let hits = 0
    for (const cluster of clusters) {
      const projected = projectToScreen(cluster.origin, scene)
      const dx = projected.x - sx
      const dy = projected.y - sy
      if (dx * dx + dy * dy > radius * radius) continue

      const push = new Vector3(dir.x, -dir.y, 0.2)
      if (push.lengthSquared() < 0.01) push.copyFromFloats(dx, -dy, 0.2)
      push.normalize()

      for (const puff of cluster.puffs) {
        const out =
          puff.offset.lengthSquared() > 0.01
            ? puff.offset.clone().normalize()
            : new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        puff.scattered = true
        puff.reform = 0
        puff.pos.copyFrom(puff.mesh.position)
        puff.vel = out.scale(2.8 + Math.random() * 4.6)
        puff.vel.addInPlace(push.scale(3.1))
        puff.vel.y += 0.8 + Math.random()
        puff.spin = (Math.random() - 0.5) * 3.4
      }
      hits += 1
    }
    return hits
  }

  function startReform() {
    for (const cluster of clusters) {
      for (const puff of cluster.puffs) {
        if (!puff.scattered && puff.reform === 0) continue
        puff.scattered = false
        puff.reform = 0.001
        puff.form = 0
        puff.pos.copyFrom(puff.mesh.position)
      }
    }
  }

  function update(dt: number, time: number) {
    for (const cluster of clusters) {
      for (const puff of cluster.puffs) {
        if (puff.scattered) {
          puff.vel.y -= 0.55 * dt
          puff.vel.scaleInPlace(Math.pow(0.96, dt * 60))
          puff.pos.addInPlace(puff.vel.scale(dt))
          puff.mesh.position.copyFrom(puff.pos)
          puff.mesh.rotation.z += puff.spin * dt
          puff.mesh.visibility = Math.max(0.2, puff.mesh.visibility - dt * 0.18)
          continue
        }

        if (puff.reform > 0) {
          puff.reform += dt
          const k = Math.min(1, puff.reform / 2)
          const e = 1 - (1 - k) ** 3
          Vector3.LerpToRef(puff.pos, puff.rest, e, puff.mesh.position)
          puff.mesh.visibility = 0.2 + e * 0.8
          puff.form = e
          if (k >= 1) {
            puff.reform = 0
            puff.form = 1
          }
          continue
        }

        puff.form = Math.min(1, puff.form + dt * puff.formSpeed)
        const formed = smoothstep(0, 1, puff.form)
        const windX = Math.sin(time * 0.16 + puff.phase) * 0.28 + time * 0.04
        const windY = Math.cos(time * 0.13 + puff.phase * 1.4) * 0.16
        const billow = 1 + Math.sin(time * 0.35 + puff.phase) * 0.07
        puff.mesh.position.copyFrom(puff.rest)
        puff.mesh.position.x += windX
        puff.mesh.position.y += windY
        puff.mesh.scaling.setAll(formed * billow)
        puff.mesh.visibility = formed
        puff.mesh.rotation.z += puff.spin * dt
      }
    }
  }

  return { clusters, scatterNear, startReform, update }
}

export type CloudSystem = ReturnType<typeof createClouds>
