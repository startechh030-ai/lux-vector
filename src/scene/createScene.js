import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  Engine,
  FreeCamera,
  GlowLayer,
  HemisphericLight,
  ImageProcessingConfiguration,
  ParticleSystem,
  PointLight,
  Scene,
  Vector3,
} from '@babylonjs/core'
import { createChain } from './chain.js'
import { createClouds } from './clouds.js'
import { detectQuality } from './quality.js'
import {
  createCloudTexture,
  createEnvCube,
  createRingTexture,
  createSoftDot,
} from './textures.js'

function setupLights(scene) {
  const hemi = new HemisphericLight('hemi', new Vector3(0.15, 1, -0.35), scene)
  hemi.intensity = 0.38
  hemi.diffuse = new Color3(0.72, 0.64, 0.95)
  hemi.groundColor = new Color3(0.08, 0.03, 0.12)
  hemi.specular = new Color3(0.55, 0.4, 0.8)

  const key = new DirectionalLight('key', new Vector3(-0.45, -0.7, 0.55), scene)
  key.intensity = 1.15
  key.diffuse = new Color3(1, 0.94, 1)

  const rim = new DirectionalLight('rim', new Vector3(0.65, 0.15, 0.55), scene)
  rim.intensity = 0.55
  rim.diffuse = new Color3(0.86, 0.4, 1)

  const neon = new PointLight('neon', new Vector3(-1.2, 0.6, 1.4), scene)
  neon.intensity = 18
  neon.diffuse = new Color3(0.95, 0.25, 1)
  neon.range = 18

  const fill = new PointLight('fill', new Vector3(4.5, -2.2, 2.2), scene)
  fill.intensity = 8
  fill.diffuse = new Color3(0.7, 0.55, 1)
  fill.range = 14
}

function setupPost(scene, camera, quality) {
  const pipeline = new DefaultRenderingPipeline('look', true, scene, [camera])
  pipeline.samples = quality.msaa
  pipeline.fxaaEnabled = quality.fxaa
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 0.42
  pipeline.bloomWeight = 0.42
  pipeline.bloomKernel = quality.bloomKernel
  pipeline.bloomScale = 0.6
  pipeline.imageProcessingEnabled = true
  pipeline.imageProcessing.toneMappingEnabled = true
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  pipeline.imageProcessing.exposure = 1.12
  pipeline.imageProcessing.contrast = 1.14
  pipeline.imageProcessing.vignetteEnabled = true
  pipeline.imageProcessing.vignetteWeight = 2.6
  pipeline.imageProcessing.vignetteStretch = 0.15
  pipeline.imageProcessing.vignetteColor = new Color4(0.02, 0, 0.05, 1)
  pipeline.imageProcessing.colorCurvesEnabled = false

  const glow = new GlowLayer('glow', scene, { blurKernelSize: quality.mobile ? 24 : 36 })
  glow.intensity = 0.55

  return { pipeline, glow }
}

function setupDust(scene, texture) {
  const ps = new ParticleSystem('dust', 180, scene)
  ps.particleTexture = texture
  ps.emitter = Vector3.Zero()
  ps.minEmitBox = new Vector3(-10, -6, -3)
  ps.maxEmitBox = new Vector3(10, 6, 3)
  ps.color1 = new Color4(0.86, 0.55, 1, 0.35)
  ps.color2 = new Color4(1, 0.85, 1, 0.12)
  ps.colorDead = new Color4(0.4, 0.2, 0.6, 0)
  ps.minSize = 0.02
  ps.maxSize = 0.08
  ps.minLifeTime = 3
  ps.maxLifeTime = 7
  ps.emitRate = 18
  ps.blendMode = ParticleSystem.BLENDMODE_ADD
  ps.direction1 = new Vector3(-0.1, 0.05, 0)
  ps.direction2 = new Vector3(0.1, 0.2, 0.05)
  ps.minEmitPower = 0.02
  ps.maxEmitPower = 0.08
  ps.updateSpeed = 0.01
  ps.start()
  return ps
}

function bindInput(canvas, scene, chain, clouds) {
  let down = false
  let lastX = 0
  let lastY = 0
  let lastInteract = 0
  let reformAt = 0

  const toRender = (event) => {
    const rect = canvas.getBoundingClientRect()
    const engine = scene.getEngine()
    return {
      x: ((event.clientX - rect.left) / rect.width) * engine.getRenderWidth(),
      y: ((event.clientY - rect.top) / rect.height) * engine.getRenderHeight(),
    }
  }

  const interact = (event, first) => {
    const p = toRender(event)
    const dir = first
      ? { x: 0, y: 0 }
      : { x: p.x - lastX, y: p.y - lastY }
    const now = performance.now()
    const chainHits = chain.breakNear(p.x, p.y, dir, first ? 78 : 92, now)
    const cloudHits = clouds.scatterNear(p.x, p.y, dir, first ? 110 : 140)
    lastX = p.x
    lastY = p.y
    if (chainHits + cloudHits > 0) {
      lastInteract = now
      reformAt = now + 2800
    }
  }

  const onDown = (event) => {
    down = true
    canvas.setPointerCapture?.(event.pointerId)
    interact(event, true)
    event.preventDefault()
  }

  const onMove = (event) => {
    if (!down) {
      const nx = event.clientX / window.innerWidth
      const ny = event.clientY / window.innerHeight
      canvas.dataset.px = String(nx)
      canvas.dataset.py = String(ny)
      return
    }
    interact(event, false)
    event.preventDefault()
  }

  const onUp = (event) => {
    down = false
    event.preventDefault()
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onUp)

  return {
    getReformDue: () => reformAt > 0 && performance.now() > reformAt && !down,
    clearReform: () => {
      reformAt = 0
      lastInteract = 0
    },
    getPointer: () => ({
      x: Number(canvas.dataset.px || 0.5),
      y: Number(canvas.dataset.py || 0.5),
    }),
    dispose: () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onUp)
    },
    get lastInteract() {
      return lastInteract
    },
  }
}

export function bootHero(canvas) {
  const quality = detectQuality()
  const engine = new Engine(canvas, true, {
    antialias: true,
    adaptToDeviceRatio: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    stencil: false,
  })
  engine.setHardwareScalingLevel(quality.hardwareScaling)

  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.027, 0.016, 0.047, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogDensity = 0.016
  scene.fogColor = new Color3(0.05, 0.02, 0.09)
  scene.autoClear = true
  scene.skipPointerMovePicking = true
  scene.constantlyUpdateMeshUnderPointer = false

  const camera = new FreeCamera('camera', new Vector3(0.55, 0.12, -11.6), scene)
  camera.setTarget(new Vector3(0.35, -0.25, 0))
  camera.fov = 0.7
  camera.minZ = 0.2
  camera.maxZ = 80

  scene.environmentTexture = createEnvCube(scene)
  scene.environmentIntensity = 0.85

  setupLights(scene)

  const textures = {
    cloudA: createCloudTexture(scene, quality.cloudTex, 1),
    cloudB: createCloudTexture(scene, quality.cloudTex, 4.2),
    ring: createRingTexture(scene, quality.ringTex),
    dot: createSoftDot(scene),
  }

  const chain = createChain(scene, quality, textures)
  const clouds = createClouds(scene, quality, textures)
  const { glow } = setupPost(scene, camera, quality)

  for (const cluster of clouds.clusters) {
    for (const puff of cluster.puffs) {
      glow.addExcludedMesh(puff.mesh)
    }
  }

  const dust = quality.dust ? setupDust(scene, textures.dot) : null
  const input = bindInput(canvas, scene, chain, clouds)

  const basePos = camera.position.clone()
  const baseTarget = new Vector3(0.35, -0.25, 0)
  let yaw = 0
  let pitch = 0

  let disposed = false
  const started = performance.now()

  engine.runRenderLoop(() => {
    if (disposed) return
    const dt = Math.min(0.033, engine.getDeltaTime() / 1000)
    const time = (performance.now() - started) / 1000

    chain.update(dt, time)
    clouds.update(dt, time)

    if (input.getReformDue()) {
      chain.startReform()
      clouds.startReform()
      input.clearReform()
    }

    const pointer = input.getPointer()
    const targetYaw = (pointer.x - 0.5) * 0.22
    const targetPitch = (pointer.y - 0.5) * 0.12
    yaw += (targetYaw - yaw) * Math.min(1, dt * 2.6)
    pitch += (targetPitch - pitch) * Math.min(1, dt * 2.6)
    camera.position.x = basePos.x + yaw * 1.15
    camera.position.y = basePos.y - pitch * 0.75
    camera.setTarget(
      new Vector3(baseTarget.x + yaw * 0.28, baseTarget.y - pitch * 0.18, baseTarget.z),
    )

    scene.render()
  })

  return {
    engine,
    scene,
    dispose: () => {
      disposed = true
      input.dispose()
      dust?.dispose()
      scene.dispose()
      engine.dispose()
    },
  }
}
