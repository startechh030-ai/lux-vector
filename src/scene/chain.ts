import {
  Color3,
  Engine,
  Material,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Quaternion,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core'
import {
  chainPath,
  distPointSeg,
  fract,
  frameFromTangent,
  linkRotation,
  pathLength,
  pathTangent,
  projectToScreen,
  smoothstep,
} from './math'
import type { ChainState, PointerDir, Quality, SceneTextures } from './types'

type Link = {
  mesh: Mesh
  even: boolean
  u: number
  pos: Vector3
  old: Vector3
  rot: Quaternion
  pinned: boolean
  shattered: boolean
  rest: number
}

type Shard = {
  mesh: Mesh
  pos: Vector3
  vel: Vector3
  spin: Vector3
  life: number
  active: boolean
}

type Ring = {
  mesh: Mesh
  link: Link
  phase: number
}

function stadiumPath(length: number, width: number, segs: number) {
  const r = width * 0.5
  const straight = Math.max(0.02, length - width)
  const half = straight * 0.5
  const nCap = Math.max(10, Math.floor(segs * 0.35))
  const nStr = Math.max(4, Math.floor(segs * 0.15))
  const pts: Vector3[] = []
  const push = (x: number, y: number) => pts.push(new Vector3(x, y, 0))

  for (let i = 0; i < nStr; i += 1) {
    const t = i / nStr
    push(half - t * straight, r)
  }
  for (let i = 0; i <= nCap; i += 1) {
    const a = Math.PI * 0.5 + (i / nCap) * Math.PI
    push(-half + Math.cos(a) * r, Math.sin(a) * r)
  }
  for (let i = 0; i < nStr; i += 1) {
    const t = i / nStr
    push(-half + t * straight, -r)
  }
  for (let i = 0; i <= nCap; i += 1) {
    const a = -Math.PI * 0.5 + (i / nCap) * Math.PI
    push(half + Math.cos(a) * r, Math.sin(a) * r)
  }
  pts.push(pts[0].clone())
  return pts
}

function makeMetal(scene: Scene, name: string, albedo: Color3, roughness: number, scratch: Texture) {
  const mat = new PBRMaterial(name, scene)
  mat.albedoColor = albedo
  mat.metallic = 1
  mat.roughness = roughness
  mat.bumpTexture = scratch
  mat.bumpTexture.level = 0.28
  mat.metallicF0Factor = 0.95
  mat.clearCoat.isEnabled = true
  mat.clearCoat.intensity = 0.58
  mat.clearCoat.roughness = 0.1
  mat.environmentIntensity = 1.15
  mat.specularIntensity = 1.2
  return mat
}

function poseLink(link: Link, mobile: boolean, time: number, wave = 0) {
  const live = 0.035 * Math.sin(time * 0.9 + link.u * 10)
  const pos = chainPath(link.u, mobile)
  pos.y += live + wave
  const tangent = pathTangent(link.u, mobile)
  const frame = frameFromTangent(tangent)
  const hole = link.even ? frame.normal : frame.binormal
  const rot = linkRotation(frame.t, hole)
  link.pos.copyFrom(pos)
  link.old.copyFrom(pos)
  link.rot.copyFrom(rot)
  link.mesh.position.copyFrom(pos)
  link.mesh.rotationQuaternion = link.rot
}

export function createChain(scene: Scene, quality: Quality, textures: SceneTextures) {
  const mobile = quality.mobile
  const worldLen = pathLength(mobile)
  const spacing = quality.linkLength * 0.43
  const count = Math.max(14, Math.round(worldLen / spacing))
  const scrollSpeed = mobile ? 0.042 : 0.038

  const scratch = textures.scratch
  const matA = makeMetal(scene, 'chainA', new Color3(0.48, 0.45, 0.56), 0.2, scratch)
  const matB = makeMetal(scene, 'chainB', new Color3(0.36, 0.33, 0.44), 0.28, scratch)

  const proto = MeshBuilder.CreateTube(
    'linkProto',
    {
      path: stadiumPath(quality.linkLength, quality.linkWidth, quality.linkPathSegs),
      radius: quality.tubeRadius,
      tessellation: quality.tubeSegs,
      cap: Mesh.NO_CAP,
    },
    scene,
  )
  proto.isVisible = false
  proto.isPickable = false
  proto.position.set(0, -400, 0)

  const links: Link[] = []
  for (let i = 0; i < count; i += 1) {
    const mesh = proto.clone(`link-${i}`, null)
    if (!mesh) continue
    mesh.isVisible = true
    mesh.isPickable = false
    mesh.material = i % 3 === 0 ? matB : matA
    mesh.rotationQuaternion = Quaternion.Identity()
    const u = i / count
    const link: Link = {
      mesh,
      even: i % 2 === 0,
      u,
      pos: Vector3.Zero(),
      old: Vector3.Zero(),
      rot: Quaternion.Identity(),
      pinned: false,
      shattered: false,
      rest: spacing,
    }
    poseLink(link, mobile, 0)
    links.push(link)
  }

  const ringMat = new StandardMaterial('neonRing', scene)
  ringMat.diffuseTexture = textures.ring
  ringMat.opacityTexture = textures.ring
  ringMat.emissiveTexture = textures.ring
  ringMat.useAlphaFromDiffuseTexture = true
  ringMat.disableLighting = true
  ringMat.emissiveColor = new Color3(1, 0.42, 1)
  ringMat.backFaceCulling = false
  ringMat.transparencyMode = Material.MATERIAL_ALPHABLEND
  ringMat.alphaMode = Engine.ALPHA_ADD

  const rings: Ring[] = []
  for (let i = 2; i < links.length - 2; i += 4) {
    const plane = MeshBuilder.CreatePlane(`ring-${i}`, { size: quality.linkLength * 1.85 }, scene)
    plane.material = ringMat
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL
    plane.isPickable = false
    rings.push({ mesh: plane, link: links[i], phase: Math.random() * Math.PI * 2 })
  }

  const shardMat = makeMetal(scene, 'shardMat', new Color3(0.55, 0.5, 0.64), 0.18, scratch)
  const shards: Shard[] = []
  for (let i = 0; i < 16; i += 1) {
    const mesh = MeshBuilder.CreateBox(
      `shard-${i}`,
      { width: 0.2, height: 0.07, depth: 0.11 },
      scene,
    )
    mesh.material = shardMat
    mesh.isVisible = false
    mesh.isPickable = false
    shards.push({
      mesh,
      pos: Vector3.Zero(),
      vel: Vector3.Zero(),
      spin: Vector3.Zero(),
      life: 0,
      active: false,
    })
  }

  let state: ChainState = 'travel'
  let scroll = 0
  let cut: Link | null = null
  let rippleT = 0
  let reformT = 0
  let ordered: Link[] = links.slice()

  const tmp = new Vector3()

  function sortedByU() {
    return links.slice().sort((a, b) => a.u - b.u)
  }

  function applyPoseFromNodes(time: number) {
    for (let i = 0; i < ordered.length; i += 1) {
      const link = ordered[i]
      if (link.shattered) {
        link.mesh.isVisible = false
        continue
      }
      link.mesh.isVisible = true
      link.mesh.position.copyFrom(link.pos)

      let tangent: Vector3
      if (i > 0 && !ordered[i - 1].shattered) {
        tangent = link.pos.subtract(ordered[i - 1].pos)
      } else if (i < ordered.length - 1 && !ordered[i + 1].shattered) {
        tangent = ordered[i + 1].pos.subtract(link.pos)
      } else {
        tangent = pathTangent(link.u, mobile)
      }
      if (tangent.lengthSquared() < 1e-6) tangent = pathTangent(link.u, mobile)
      tangent.normalize()
      const frame = frameFromTangent(tangent)
      const hole = link.even ? frame.normal : frame.binormal
      const rot = linkRotation(frame.t, hole)
      if (rippleT < 1.15 && cut) {
        const du = Math.abs(link.u - cut.u) * count
        const wave = Math.sin(du * 0.85 - rippleT * 16) * Math.exp(-du * 0.22) * Math.exp(-rippleT * 2)
        link.mesh.position.addInPlace(frame.binormal.scale(wave * 0.32))
      }
      link.rot.copyFrom(rot)
      link.mesh.rotationQuaternion = link.rot
      void time
    }
  }

  function spawnShards(origin: Vector3, dir: PointerDir) {
    const push = new Vector3(dir.x, -dir.y, 0.2)
    if (push.lengthSquared() < 0.01) push.copyFromFloats(0, 1, 0.2)
    push.normalize()
    for (let i = 0; i < shards.length; i += 1) {
      const shard = shards[i]
      shard.active = true
      shard.life = 1.6 + Math.random() * 0.7
      shard.pos.copyFrom(origin)
      shard.pos.x += (Math.random() - 0.5) * 0.2
      shard.pos.y += (Math.random() - 0.5) * 0.2
      shard.vel = push.scale(3 + Math.random() * 5)
      shard.vel.x += (Math.random() - 0.5) * 4
      shard.vel.y += 1.4 + Math.random() * 3.2
      shard.vel.z += (Math.random() - 0.5) * 2.4
      shard.spin.copyFromFloats(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 14,
      )
      shard.mesh.isVisible = true
      shard.mesh.position.copyFrom(shard.pos)
      shard.mesh.scaling.setAll(0.7 + Math.random() * 0.8)
    }
  }

  function snap(hit: Link, dir: PointerDir) {
    if (state !== 'travel') return
    state = 'hanging'
    cut = hit
    rippleT = 0
    hit.shattered = true
    hit.mesh.isVisible = false
    spawnShards(hit.pos, dir)

    ordered = sortedByU()
    for (const link of links) {
      link.pinned = false
      link.old.copyFrom(link.pos)
    }
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (first) first.pinned = true
    if (last) last.pinned = true

    const cutU = hit.u
    for (const link of ordered) {
      if (link.shattered || link.pinned) continue
      const du = Math.abs(link.u - cutU) * count
      const frame = frameFromTangent(pathTangent(link.u, mobile))
      const kick = Math.exp(-du * 0.35) * 0.18
      const sideways = frame.binormal.scale(kick * (dir.x >= 0 ? 1 : -1))
      sideways.y -= 0.04 * Math.exp(-du * 0.25)
      link.old.subtractInPlace(sideways)
    }

    for (let i = 0; i < ordered.length - 1; i += 1) {
      const a = ordered[i]
      const b = ordered[i + 1]
      a.rest = Vector3.Distance(a.pos, b.pos)
    }
  }

  function tryBreak(sx: number, sy: number, prev: PointerDir, next: PointerDir) {
    if (state !== 'travel') return false
    const swipe = Math.hypot(next.x - prev.x, next.y - prev.y)
    if (swipe < 10) return false

    let best: Link | null = null
    let bestD = 56
    for (const link of links) {
      if (link.u < 0.06 || link.u > 0.94) continue
      const p = projectToScreen(link.mesh.getAbsolutePosition(), scene)
      const d = distPointSeg(p.x, p.y, prev.x, prev.y, next.x, next.y)
      if (d < bestD) {
        bestD = d
        best = link
      }
    }
    if (!best) return false
    snap(best, { x: next.x - prev.x, y: next.y - prev.y })
    return true
  }

  function wiggle(sx: number, sy: number, dir: PointerDir) {
    if (state !== 'hanging') return
    let best: Link | null = null
    let bestD = 90
    for (const link of links) {
      if (link.shattered || link.pinned) continue
      const p = projectToScreen(link.mesh.getAbsolutePosition(), scene)
      const d = Math.hypot(p.x - sx, p.y - sy)
      if (d < bestD) {
        bestD = d
        best = link
      }
    }
    if (!best) return
    const force = new Vector3(dir.x, -dir.y, 0).scale(0.0018)
    if (force.lengthSquared() < 1e-8) return
    best.pos.addInPlace(force)
    const idx = ordered.indexOf(best)
    if (idx > 0 && !ordered[idx - 1].shattered && !ordered[idx - 1].pinned) {
      ordered[idx - 1].pos.addInPlace(force.scale(0.45))
    }
    if (idx < ordered.length - 1 && !ordered[idx + 1].shattered && !ordered[idx + 1].pinned) {
      ordered[idx + 1].pos.addInPlace(force.scale(0.45))
    }
  }

  function solveConstraints() {
    for (let iter = 0; iter < 6; iter += 1) {
      for (let i = 0; i < ordered.length - 1; i += 1) {
        const a = ordered[i]
        const b = ordered[i + 1]
        if (a.shattered || b.shattered) continue
        tmp.copyFrom(b.pos).subtractInPlace(a.pos)
        const dist = tmp.length()
        if (dist < 1e-6) continue
        const rest = a.rest || spacing
        const diff = (dist - rest) / dist
        const corr = tmp.scale(0.5 * diff)
        if (!a.pinned && !b.pinned) {
          a.pos.addInPlace(corr)
          b.pos.subtractInPlace(corr)
        } else if (!a.pinned) {
          a.pos.addInPlace(corr.scale(2))
        } else if (!b.pinned) {
          b.pos.subtractInPlace(corr.scale(2))
        }
      }
    }
    for (const link of links) {
      if (link.pos.y < -5.8) link.pos.y = -5.8
    }
  }

  function startReform() {
    if (state !== 'hanging') return
    state = 'reforming'
    reformT = 0
    for (const link of links) {
      link.old.copyFrom(link.pos)
    }
  }

  function finishReform(time: number) {
    state = 'travel'
    cut = null
    rippleT = 0
    for (const link of links) {
      link.shattered = false
      link.pinned = false
      link.mesh.isVisible = true
      poseLink(link, mobile, time)
    }
    for (const shard of shards) {
      shard.active = false
      shard.mesh.isVisible = false
    }
  }

  function updateShards(dt: number) {
    for (const shard of shards) {
      if (!shard.active) continue
      shard.life -= dt
      shard.vel.y -= 11 * dt
      shard.vel.scaleInPlace(Math.pow(0.98, dt * 60))
      shard.pos.addInPlace(shard.vel.scale(dt))
      shard.mesh.position.copyFrom(shard.pos)
      shard.mesh.rotate(Vector3.Right(), shard.spin.x * dt)
      shard.mesh.rotate(Vector3.Up(), shard.spin.y * dt)
      shard.mesh.visibility = Math.max(0, shard.life / 1.4)
      if (shard.life <= 0) {
        shard.active = false
        shard.mesh.isVisible = false
      }
    }
  }

  function updateRings(time: number) {
    for (const ring of rings) {
      const dead = ring.link.shattered || state === 'reforming' && reformT > 0.15
      ring.mesh.position.copyFrom(ring.link.mesh.position)
      const pulse = 1 + Math.sin(time * 1.9 + ring.phase) * 0.08
      ring.mesh.scaling.setAll(dead ? 0.01 : pulse)
      ring.mesh.visibility = dead ? 0 : 1
      ring.mesh.isVisible = !dead
    }
  }

  function update(dt: number, time: number) {
    if (state === 'travel') {
      scroll = fract(scroll + scrollSpeed * dt)
      for (let i = 0; i < links.length; i += 1) {
        const link = links[i]
        link.u = fract(scroll + i / count)
        const wave = 0.05 * Math.sin(time * 1.1 + link.u * 8)
        poseLink(link, mobile, time, wave)
      }
    } else if (state === 'hanging') {
      rippleT += dt
      const damp = 0.988
      for (const link of links) {
        if (link.pinned || link.shattered) continue
        const vx = (link.pos.x - link.old.x) * damp
        const vy = (link.pos.y - link.old.y) * damp
        const vz = (link.pos.z - link.old.z) * damp
        link.old.copyFrom(link.pos)
        link.pos.x += vx
        link.pos.y += vy - 11.5 * dt * dt
        link.pos.z += vz
      }
      solveConstraints()
      applyPoseFromNodes(time)
    } else {
      reformT += dt
      const k = smoothstep(0, 2.1, reformT)
      const e = 1 - (1 - k) ** 3
      for (const link of links) {
        const target = chainPath(link.u, mobile)
        Vector3.LerpToRef(link.old, target, e, link.pos)
        const tangent = pathTangent(link.u, mobile)
        const frame = frameFromTangent(tangent)
        const hole = link.even ? frame.normal : frame.binormal
        const rot = linkRotation(frame.t, hole)
        link.mesh.position.copyFrom(link.pos)
        if (!link.mesh.rotationQuaternion) link.mesh.rotationQuaternion = link.rot.clone()
        Quaternion.SlerpToRef(link.rot, rot, e, link.mesh.rotationQuaternion)
        link.shattered = false
        link.mesh.isVisible = true
        link.mesh.visibility = link === cut ? e : 1
      }
      if (k >= 1) finishReform(time)
    }

    updateShards(dt)
    updateRings(time)
  }

  return {
    update,
    tryBreak,
    wiggle,
    startReform,
    isBroken: () => state === 'hanging',
    isReforming: () => state === 'reforming',
    state: () => state,
  }
}

export type ChainSystem = ReturnType<typeof createChain>
