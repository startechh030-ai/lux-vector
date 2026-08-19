import Logo from './Logo.jsx'

export default function HeroOverlay() {
  return (
    <div className="hero-overlay">
      <div className="hero-grain" />

      <div className="brand">
        <Logo />
        <div className="brand-name">
          lux <span>Vector</span>
        </div>
      </div>

      <div className="copy">
        <h1>
          The team
          <br />
          that delivers.
        </h1>
        <div className="rule" />
        <p className="mantra">Innovate. Create. Elevate.</p>
        <p className="lede">
          A digital unit that turns sharp ideas into living products — designed
          with intent, built with precision, shipped without noise.
        </p>
      </div>

      <p className="hint">Swipe the chain to break it · Sweep the clouds to scatter them</p>
    </div>
  )
}
