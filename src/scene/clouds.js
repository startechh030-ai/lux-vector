import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'

const CLUSTERS = [
  { id: 'bl', pos: [-6.4, -2.9, 1.7], scale: 3.6, puffs: 13 },
  { id: 'ml', pos: [-5.5, 0.45, 0.55], scale: 2.5, puffs: 9 },
  { id: 'top', pos: [-0.35, 2.55, 1.15], scale: 2.25, puffs: 8 },
  { id: 'mid', pos: [1.7, 1.35, -0.45], scale: 1.7, puffs: 6 },
  { id: 'br', pos: [5.9, -3.35, 0.95], scale: 3.3, puffs: 12 },
  { id: 'front', pos: [3.1, -4.15, 2.1], scale: 2.15, puffs: 7 },
]

function cloudMaterial(scene, texture, tint, key) {
  const mat = new StandardMaterial(`cloudMat-${key}`, scene)
  mat.diffuseTexture = texture
  mat.opacityTexture = texture
  mat.emissiveTexture = texture
  mat.useAlphaFromDiffuseTexture = true
  mat.disableLighting = true
  mat.emissiveColor = tint
  mat.backFaceCulling = false
  mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND
  return mat
}

export function createClouds(scene, quality, textures) {
  const mats = [
    cloudMaterial(scene, textures.cloudA, new Color3(0.9, 0.82, 1), 'a'),
    cloudMaterial(scene, textures.cloudB, new Color3(0.78, 0.7, 0.98), 'b'),
    cloudMaterial(scene, textures.cloudA, new Color3(0.96, 0.9, 1), 'c'),
  ]

  const clusters = CLUSTERS.map((spec, ci) => {
    const origin = Vector3.FromArray(spec.pos)
    const count = Math.max(4, Math.round(spec.puffs * quality.puffMul))
    const puffs = []

    for (let i = 0; i < count; i += 1) {
      const size = spec.scale * (0.55 + Math.random() * 0.7)
      const mesh = MeshBuilder.CreatePlane(`puff-${spec.id}-${i}`, { size }, scene)
      mesh.material = mats[(ci + i) % mats.length]
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
      mesh.isPickable = false
      mesh.alphaIndex = 800 + ci * 20 + i

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
        scattered: false,
        reform: 0,
        spin: (Math.random() - 0.5) * 0.4,
      })
    }

    return { id: spec.id, origin, puffs }
  })

  function scatterNear(sx, sy, dir, radius) {
    const engine = scene.getEngine()
    const transform = scene.getTransformMatrix()
    const viewport = scene.activeCamera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    )
    let hits = 0

    for (const cluster of clusters) {
      const projected = Vector3.Project(
        cluster.origin,
        Matrix.Identity(),
        transform,
        viewport,
      )
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
        puff.vel = out.scale(2.6 + Math.random() * 4.4).addInPlace(push.scale(2.8))
        puff.vel.y += 0.6 + Math.random()
        puff.spin = (Math.random() - 0.5) * 3.2
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
        puff.pos.copyFrom(puff.mesh.position)
      }
    }
  }

  function update(dt, time) {
    for (const cluster of clusters) {
      for (const puff of cluster.puffs) {
        if (puff.scattered) {
          puff.vel.y -= 0.55 * dt
          puff.vel.scaleInPlace(Math.pow(0.96, dt * 60))
          puff.pos.addInPlace(puff.vel.scale(dt))
          puff.mesh.position.copyFrom(puff.pos)
          puff.mesh.rotation.z += puff.spin * dt
          puff.mesh.visibility = Math.max(0.35, puff.mesh.visibility - dt * 0.15)
        } else if (puff.reform > 0) {
          puff.reform += dt
          const k = Math.min(1, puff.reform / 1.7)
          const e = 1 - (1 - k) ** 3
          Vector3.LerpToRef(puff.pos, puff.rest, e, puff.mesh.position)
          puff.mesh.visibility = 0.35 + e * 0.65
          if (k >= 1) {
            puff.reform = 0
            puff.mesh.position.copyFrom(puff.rest)
            puff.mesh.visibility = 1
          }
        } else {
          const driftX = Math.sin(time * 0.22 + puff.phase) * 0.12
          const driftY = Math.cos(time * 0.18 + puff.phase * 1.3) * 0.09
          puff.mesh.position.copyFrom(puff.rest)
          puff.mesh.position.x += driftX
          puff.mesh.position.y += driftY
          puff.mesh.visibility = 1
        }
      }
    }
  }

  return { clusters, scatterNear, startReform, update }
}
