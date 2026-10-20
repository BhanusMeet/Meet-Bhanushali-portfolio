/** Lightweight SVG stand-in shown while the 3D chunk loads, or when WebGL is unavailable. */
export function SceneFallback() {
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="core" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#dfe5ea" />
          <stop offset="55%" stopColor="#6f7a86" />
          <stop offset="100%" stopColor="#1a1f25" />
        </radialGradient>
      </defs>
      <g fill="none" strokeWidth="1">
        <ellipse cx="200" cy="200" rx="150" ry="52" stroke="#b9c2cc" strokeOpacity=".5" transform="rotate(-20 200 200)" />
        <ellipse cx="200" cy="200" rx="170" ry="70" stroke="#3dff8b" strokeOpacity=".45" transform="rotate(35 200 200)" />
      </g>
      <polygon points="200,130 262,165 262,235 200,270 138,235 138,165" fill="url(#core)" stroke="#3dff8b" strokeOpacity=".35" />
    </svg>
  )
}
