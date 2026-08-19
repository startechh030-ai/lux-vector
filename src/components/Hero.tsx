import { useEffect, useRef } from 'react'
import HeroOverlay from './HeroOverlay'
import { bootHero } from '../scene/createScene'

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const api = bootHero(canvas)
    const onResize = () => api.engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      api.dispose()
    }
  }, [])

  return (
    <section className="hero">
      <canvas ref={canvasRef} className="hero-canvas" />
      <HeroOverlay />
    </section>
  )
}
