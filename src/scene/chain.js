import {
  Color3,
  Engine,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Quaternion,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core'
import { chainPath, frameFromTangent, lookRotation } from './math.js'

function metal(scene, name, albedo, roughness) {
  const mat = new PBRMaterial(name, scene)
  mat.albedoColor = albedo
  mat.metallic = 1
  mat.roughness = roughness
  mat.metallicF0Factor = 0.92
  mat.clearCoat.isEnabled = true
  mat.clearCoat.intensity = 0.42
  mat.clearCoat.roughness = 0.12
  mat.environmentIntensity = 1.05
  mat.specularIntensity = 1.15
  return mat
}

export function createChain(scene, quality, textures) {
  const count = quality.linkCount
  const matA = metal(scene, 'chainA', new Color3(0.62, 0.58, 0.72), 0.24)
  const matB = metal(scene, 'chainB', new Color3(0.5, 0.46, 0.62), 0.32)

  const ringMat = new StandardMaterial('neonRing', scene)
  ringMat.diffuseTexture = textures.ring
  ringMat.opacityTexture = textures.ring
  ringMat.emissiveTexture = textures.ring
  ringMat.useAlphaFromDiffuseTexture = true
  ringMat.disableLighting = true
  ringMat.emissiveColor = new Color3(1, 0.42, 1)
  ringMat.backFaceCulling = false
  ringMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND
  ringMat.alphaMode = Engine.ALPHA_ADD

  const links = []

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1)
    const restPos = chainPath(t)
    const tangent = chainPath(Math.min(1, t + 0.02))
      .subtract(chainPath(Math.max(0, t - 0.02)))
      .normalize()
    const frame = frameFromTangent(tangent)
    const hole = i % 2 === 0 ? frame.normal : frame.binormal
    const rot = lookRotation(frame.t, hole)

    const mesh = MeshBuilder.CreateTorus(
      `link-${i}`,
      {
        diameter: 1.06,
        thickness: 0.2,
        tessellation: quality.torusSeg,
        tube: quality.tubeSeg,
      },
      scene,
    )
    mesh.scaling = new Vector3(1, 1, 1.46)
    mesh.position.copyFrom(restPos)
    mesh.rotationQuaternion = rot.clone()
    mesh.material = i % 3 === 0 ? matB : matA
    mesh.isPickable = false

    links.push({
      mesh,
      restPos: restPos.clone(),
      restRot: rot.clone(),
      pos: restPos.clone(),
      vel: Vector3.Zero(),
      angVel: Vector3.Zero(),
      rot: rot.clone(),
      broken: false,
      reform: 0,
      lastHit: 0,
    })
  }

  const rings = []
  for (let i = 1; i < count - 1; i += 3) {
    const plane = MeshBuilder.CreatePlane(`ring-${i}`, { size: 2.15 }, scene)
    plane.material = ringMat
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL
    plane.position.copyFrom(links[i].restPos)
    plane.isPickable = false
    rings.push({ mesh: plane, linkIndex: i, phase: Math.random() * Math.PI * 2 })
  }

  function project(position, transform, viewport) {
    return Vector3.Project(position, Matrix.Identity(), transform, viewport)
  }

  function breakNear(sx, sy, dir, radius, now) {
    const engine = scene.getEngine()
    const transform = scene.getTransformMatrix()
    const viewport = scene.activeCamera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    )
    let hits = 0

    for (let i = 0; i < links.length; i += 1) {
      const link = links[i]
      const projected = project(link.mesh.getAbsolutePosition(), transform, viewport)
      const dx = projected.x - sx
      const dy = projected.y - sy
      if (dx * dx + dy * dy > radius * radius) continue
      if (now - link.lastHit < 90) continue

      const force = new Vector3(dir.x, -dir.y, 0.35)
      if (force.lengthSquared() < 0.01) {
        force.copyFromFloats((Math.random() - 0.5) * 2, 1, 0.2)
      }
      force.normalize()

      link.broken = true
      link.reform = 0
      link.lastHit = now
      link.pos.copyFrom(link.mesh.position)
      link.rot.copyFrom(link.mesh.rotationQuaternion)
      link.vel = force.scale(4.4 + Math.random() * 5.2)
      link.vel.x += (Math.random() - 0.5) * 2.4
      link.vel.y += 1.1 + Math.random() * 1.6
      link.angVel.copyFromFloats(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.5) * 9,
      )
      hits += 1
    }

    return hits
  }

  function startReform() {
    for (const link of links) {
      if (!link.broken && link.reform === 0) continue
      link.broken = false
      link.reform = 0.001
      link.pos.copyFrom(link.mesh.position)
      if (link.mesh.rotationQuaternion) {
        link.rot.copyFrom(link.mesh.rotationQuaternion)
      }
    }
  }

  function update(dt, time) {
    for (let i = 0; i < links.length; i += 1) {
      const link = links[i]
      if (link.broken) {
        link.vel.y -= 5.4 * dt
        link.vel.scaleInPlace(Math.pow(0.94, dt * 60))
        link.pos.addInPlace(link.vel.scale(dt))
        link.mesh.position.copyFrom(link.pos)
        link.mesh.rotate(Vector3.Right(), link.angVel.x * dt)
        link.mesh.rotate(Vector3.Up(), link.angVel.y * dt)
        link.mesh.rotate(Vector3.Forward(), link.angVel.z * dt)
        if (link.mesh.rotationQuaternion) {
          link.rot.copyFrom(link.mesh.rotationQuaternion)
        }
      } else if (link.reform > 0) {
        link.reform += dt
        const k = Math.min(1, link.reform / 1.55)
        const e = 1 - (1 - k) ** 3
        Vector3.LerpToRef(link.pos, link.restPos, e, link.mesh.position)
        Quaternion.SlerpToRef(link.rot, link.restRot, e, link.mesh.rotationQuaternion)
        if (k >= 1) {
          link.reform = 0
          link.mesh.position.copyFrom(link.restPos)
          link.mesh.rotationQuaternion.copyFrom(link.restRot)
        }
      } else {
        const breathe = Math.sin(time * 0.7 + i * 0.45) * 0.03
        link.mesh.position.copyFrom(link.restPos)
        link.mesh.position.y += breathe
        link.mesh.rotationQuaternion.copyFrom(link.restRot)
      }
    }

    for (const ring of rings) {
      const link = links[ring.linkIndex]
      ring.mesh.position.copyFrom(link.mesh.position)
      const pulse = 1 + Math.sin(time * 1.8 + ring.phase) * 0.08
      const fade = link.broken ? 0.18 : 1
      ring.mesh.scaling.setAll(pulse * fade)
      ring.mesh.visibility = fade
    }
  }

  return { links, rings, breakNear, startReform, update }
}
