type LogoProps = {
  className?: string
}

export default function Logo({ className = 'logo' }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="luxWarm" x1="6" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff9b55" />
          <stop offset="0.55" stopColor="#f472b6" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <linearGradient id="luxCool" x1="24" y1="22" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <path
        fill="url(#luxWarm)"
        d="M20.2 8.4c8.6-5.2 19.6-.6 23.4 8.6 2.4 5.8.8 11.6-3.2 15.6 1.2.6 2.4 1.4 3.4 2.4-6.8-1.6-14.2.2-18.4 6.2-1.8-7.6.2-16 6.8-21.2-5.2-1.4-10.8.2-14.2 4.6-3.8-4.8-3.2-12.4 2.2-16.2z"
      />
      <path
        fill="url(#luxCool)"
        d="M43.8 55.6c-8.6 5.2-19.6.6-23.4-8.6-2.4-5.8-.8-11.6 3.2-15.6-1.2-.6-2.4-1.4-3.4-2.4 6.8 1.6 14.2-.2 18.4-6.2 1.8 7.6-.2 16-6.8 21.2 5.2 1.4 10.8-.2 14.2-4.6 3.8 4.8 3.2 12.4-2.2 16.2z"
      />
      <text
        x="32"
        y="36.5"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Syne, Outfit, sans-serif"
        fontSize="13"
        fontWeight="800"
      >
        lux
      </text>
    </svg>
  )
}
