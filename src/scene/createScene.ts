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
import { createChain } from './chain'
import { createClouds } from './clouds'
import { detectQuality } from './quality'
import {
  createCloudTexture,
  createEnvCube,
  createRingTexture,
  createScratchTexture,
  createSoftDot,
} from './textures'

function setupLights(scene: Scene, mobile: boolean) {
  const hemi = new HemisphericLight('hemi', new Vector3(0.15, 1, -0.35), scene)
  hemi.intensity = 0.36
  hemi.diffuse = new Color3(0.72, 0.64, 0.95)
  hemi.groundColor = new Color3(0.08, 0.03, 0.12)
  hemi.specular = new Color3(0.55, 0.4, 0.8)

  const key = new DirectionalLight('key', new Vector3(-0.45, -0.7, 0.55), scene)
  key.intensity = 1.22
  key.diffuse = new Color3(1, 0.94, 1)

  const rim = new DirectionalLight('rim', new Vector3(0.65, 0.15, 0.55), scene)
  rim.intensity = 0.62
  rim.diffuse = new Color3(0.86, 0.4, 1)

  const neon = new PointLight('neon', new Vector3(mobile ? 0 : -1.2, 0.5, 1.5), scene)
  neon.intensity = 20
  neon.diffuse = new Color3(0.95, 0.25, 1)
  neon.range = 18

  const fill = new PointLight('fill', new Vector3(4.2, -2.0, 2.2), scene)
  fill.intensity = 8
  fill.diffuse = new Color3(0.7, 0.55, 1)
  fill.range = 14
}

function setupPost(scene: Scene, camera: FreeCamera, quality: ReturnType<typeof detectQuality>) {
  const pipeline = new DefaultRenderingPipeline('look', true, scene, [camera])
  pipeline.samples = quality.msaa
  pipeline.fxaaEnabled = quality.fxaa
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 0.4
  pipeline.bloomWeight = 0.46
  pipeline.bloomKernel = quality.bloomKernel
  pipeline.bloomScale = 0.6
  pipeline.imageProcessingEnabled = true
  pipeline.imageProcessing.toneMappingEnabled = true
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  pipeline.imageProcessing.exposure = 1.14
  pipeline.imageProcessing.contrast = 1.16
  pipeline.imageProcessing.vignetteEnabled = true
  pipeline.imageProcessing.vignetteWeight = 2.6
  pipeline.imageProcessing.vignetteStretch = 0.15
  pipeline.imageProcessing.vignetteColor = new Color4(0.02, 0, 0.05, 1)

  const glow = new GlowLayer('glow', scene, { blurKernelSize: quality.mobile ? 24 : 36 })
  glow.intensity = 0.6
  return { pipeline, glow }
}

function setupDust(scene: Scene, texture: ReturnType<typeof createSoftDot>) {
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

export function bootHero(canvas: HTMLCanvasElement) {
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
  scene.fogDensity = 0.015
  scene.fogColor = new Color3(0.05, 0.02, 0.09)
  scene.skipPointerMovePicking = true
  scene.constantlyUpdateMeshUnderPointer = false

  const camera = new FreeCamera(
    'camera',
    quality.mobile ? new Vector3(0.1, 0.35, -8.15) : new Vector3(0.55, 0.12, -11.4),
    scene,
  )
  camera.setTarget(quality.mobile ? new Vector3(0.05, 0.1, 0) : new Vector3(0.35, -0.25, 0))
  camera.fov = quality.mobile ? 0.78 : 0.7
  camera.minZ = 0.2
  camera.maxZ = 80

  scene.environmentTexture = createEnvCube(scene)
  scene.environmentIntensity = 0.92

  setupLights(scene, quality.mobile)

  const textures = {
    cloudA: createCloudTexture(scene, quality.cloudTex, 1),
    cloudB: createCloudTexture(scene, quality.cloudTex, 4.2),
    ring: createRingTexture(scene, quality.ringTex),
    dot: createSoftDot(scene),
    scratch: createScratchTexture(scene),
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

  let down = false
  let lastX = 0
  let lastY = 0
  let lastInteract = 0
  let pointerX = 0.5
  let pointerY = 0.5

  const toRender = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * engine.getRenderWidth(),
      y: ((event.clientY - rect.top) / rect.height) * engine.getRenderHeight(),
    }
  }

  const onDown = (event: PointerEvent) => {
    down = true
    canvas.setPointerCapture?.(event.pointerId)
    const p = toRender(event)
    lastX = p.x
    lastY = p.y
    const cloudHits = clouds.scatterNear(p.x, p.y, { x: 0, y: 0 }, 120)
    if (cloudHits) lastInteract = performance.now()
    event.preventDefault()
  }

  const onMove = (event: PointerEvent) => {
    pointerX = event.clientX / window.innerWidth
    pointerY = event.clientY / window.innerHeight
    if (!down) return
    const p = toRender(event)
    const dir = { x: p.x - lastX, y: p.y - lastY }
    if (chain.isBroken()) {
      chain.wiggle(p.x, p.y, dir)
      lastInteract = performance.now()
    } else if (!chain.isReforming()) {
      const broke = chain.tryBreak(lastX, lastY, { x: lastX, y: lastY }, { x: p.x, y: p.y })
      if (broke) lastInteract = performance.now()
      const cloudHits = clouds.scatterNear(p.x, p.y, dir, 130)
      if (cloudHits) lastInteract = performance.now()
    }
    lastX = p.x
    lastY = p.y
    event.preventDefault()
  }

  const onUp = (event: PointerEvent) => {
    down = false
    event.preventDefault()
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onUp)

  const basePos = camera.position.clone()
  const baseTarget = camera.getTarget().clone()
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

    if (!down && lastInteract > 0 && performance.now() - lastInteract > 4800) {
      if (chain.isBroken()) chain.startReform()
      clouds.startReform()
      lastInteract = 0
    }

    const targetYaw = (pointerX - 0.5) * 0.2
    const targetPitch = (pointerY - 0.5) * 0.1
    yaw += (targetYaw - yaw) * Math.min(1, dt * 2.4)
    pitch += (targetPitch - pitch) * Math.min(1, dt * 2.4)
    camera.position.x = basePos.x + yaw * 1.05
    camera.position.y = basePos.y - pitch * 0.7
    camera.setTarget(
      new Vector3(baseTarget.x + yaw * 0.24, baseTarget.y - pitch * 0.16, baseTarget.z),
    )

    scene.render()
  })

  return {
    engine,
    scene,
    dispose: () => {
      disposed = true
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onUp)
      dust?.dispose()
      scene.dispose()
      engine.dispose()
    },
  }
}
