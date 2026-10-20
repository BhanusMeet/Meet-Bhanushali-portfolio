import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { SceneFallback } from './SceneFallback'

const HeroScene = lazy(() => import('./scenes/HeroScene'))

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

/**
 * Lazy 3D scene wrapper: loads after first paint, falls back to SVG without WebGL,
 * pauses off-screen / in hidden tabs, and renders one static frame for reduced motion.
 */
export function HeroVisual() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const [webgl] = useState(() => hasWebGL())
  const [lowPower] = useState(() => window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4)

  useEffect(() => {
    const start = () => setReady(true)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const t = window.setTimeout(start, 300)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.01 })
    obs.observe(el)
    const onVis = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      obs.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div ref={ref} className="relative size-full" role="img" aria-label="Interactive 3D core that opens up as you scroll">
      <SceneFallback />
      {webgl && ready && (
        <div className="absolute inset-0 animate-[fadein_1.2s_ease-out_both]">
          <Suspense fallback={null}>
            <HeroScene running={inView && tabVisible} animate={!reduce} lowPower={lowPower} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
