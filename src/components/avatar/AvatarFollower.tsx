import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { Avatar } from './Avatar'
import { cornerBox, RATIO } from './layout'
import { avatarBus } from './avatarBus'


const RUN_LINES = [
  'Slow down! I can’t keep up!',
  'Who is chasing you? I am running here!',
  'Heyyy, wait for me!',
  'My legs only go so fast. Be merciful.',
  'Scrolling up this fast? Did you forget something?',
  'I need a chai break. Slow down.',
]
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Scroll companion. In the hero it stands inside #avatar-anchor and scrolls with the page; as you
 * scroll on, it shrinks and walks to the bottom-right corner, then stays with you down the page.
 * Scroll very fast and it asks the stunt to play (he trips). Transform-only positioning.
 * Mounted only when reduced motion is NOT requested.
 */
export function AvatarFollower({ hidden = false }: { hidden?: boolean }) {
  const { scrollY } = useScroll()
  const [h, setH] = useState(360)
  const [geo, setGeo] = useState({ cx: 0, top: 0, ready: false })
  const hiddenRef = useRef(hidden)
  const [run, setRun] = useState<{ id: number; text: string } | null>(null)
  const runCount = useRef(0)
  const runTimer = useRef<number | undefined>(undefined)
  const suppressUntil = useRef(0)
  const runActive = useRef(false)
  const lastGag = useRef(-Infinity)

  const measure = useCallback(() => {
    const el = document.getElementById('avatar-anchor')
    if (!el) return
    const r = el.getBoundingClientRect()
    if (window.innerWidth >= 1024) {
      // Desktop: fit the whole figure inside the first screen, to the right of the headline.
      const ah = Math.min(window.innerHeight - 150, 620)
      setH(ah)
      setGeo({ cx: r.left + r.width * 0.55, top: 100, ready: true })
    } else {
      const ah = r.height * 0.92
      setH(ah)
      setGeo({ cx: r.left + r.width / 2, top: r.bottom + window.scrollY - ah, ready: true })
    }
  }, [])

  useEffect(() => {
    measure()
    const t1 = window.setTimeout(measure, 400)
    const t2 = window.setTimeout(measure, 1500)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [measure])

  // Fast scroll, measured as distance travelled in a short time window (independent of frame
  // rate). DOWN: he trips (stunt). UP: he sprints and tells you to slow down. Scrolls caused by
  // clicking in-page links or by a stunt are ignored.
  useEffect(() => {
    const samples: { t: number; y: number }[] = []
    const onLink = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href^="#"]')) suppressUntil.current = performance.now() + 2500
    }
    let lastY = window.scrollY
    let lastMove = performance.now()
    const endRun = () => {
      if (!runActive.current) return
      runActive.current = false
      window.clearTimeout(runTimer.current)
      setRun(null)
    }
    const tick = () => {
      const now = performance.now()
      // He stops running the moment you stop scrolling, or reach the top of the page.
      if (window.scrollY !== lastY) {
        lastY = window.scrollY
        lastMove = now
      }
      if (runActive.current && (now - lastMove > 400 || window.scrollY < 60)) endRun()
      samples.push({ t: now, y: window.scrollY })
      while (samples.length && now - samples[0].t > 900) samples.shift()
      // Going UP: about 0.85 of a screen within 0.9s is enough to make him run.
      // Going DOWN (trip): needs a much harder flick, measured over the last 0.5s only.
      const upDelta = window.scrollY - samples[0].y
      const recent = samples.find((p) => now - p.t <= 500) ?? samples[0]
      const downDelta = window.scrollY - recent.y
      const vh = window.innerHeight
      let signed = 0
      if (upDelta < 0 && -upDelta >= Math.max(700, vh * 0.85)) signed = upDelta
      else if (downDelta >= Math.max(2000, vh * 2.6)) signed = downDelta
      if (signed === 0) return
      if (now - lastGag.current < 7000 || now < suppressUntil.current || avatarBus.busy || hiddenRef.current) return
      lastGag.current = now
      samples.length = 0
      if (signed > 0) {
        window.dispatchEvent(new CustomEvent('avatar:fall'))
      } else {
        const text = RUN_LINES[runCount.current++ % RUN_LINES.length]
        if (window.scrollY < 60) return // already at the top: nothing to run from
        runActive.current = true
        setRun({ id: now, text })
        window.clearTimeout(runTimer.current)
        runTimer.current = window.setTimeout(endRun, 3200)
      }
    }
    document.addEventListener('click', onLink, true)
    // Sampling the position on a short timer (instead of scroll events) is steady even when the
    // browser batches scroll events during smooth scrolling.
    const iv = window.setInterval(tick, 100)
    return () => {
      document.removeEventListener('click', onLink, true)
      window.clearInterval(iv)
      window.clearTimeout(runTimer.current)
    }
  }, [])

  useEffect(() => {
    hiddenRef.current = hidden
  }, [hidden])

  const w = h * RATIO

  const place = (s: number) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const c = cornerBox(vw, vh)
    const cs = c.h / h
    const t = smooth(clamp((s - vh * 0.12) / (vh * 0.7)))
    const natLeft = geo.cx - w / 2
    const natTop = geo.top - s
    return { left: lerp(natLeft, c.left, t), top: lerp(natTop, c.top, t), scale: lerp(1, cs, t) }
  }

  const x = useTransform(scrollY, (s) => place(s).left)
  const y = useTransform(scrollY, (s) => place(s).top)
  const scale = useTransform(scrollY, (s) => place(s).scale)

  if (!geo.ready) return null
  return (
    <>
      <motion.div
        aria-hidden
        animate={{ opacity: hidden ? 0 : 1 }}
        className="pointer-events-none fixed left-0 top-0 z-40"
        style={{ x, y, scale, width: w, height: h, originX: 0, originY: 0, willChange: 'transform' }}
      >
        <Avatar decorative scroll={scrollY} running={!!run} className="size-full drop-shadow-[0_14px_28px_rgba(0,0,0,0.5)]" />
      </motion.div>

      <div className="pointer-events-none fixed bottom-[148px] right-3 z-40 md:bottom-[220px] md:right-6" role="status" aria-live="polite">
        <AnimatePresence>
          {run && !hidden && (
            <motion.p
              key={run.id}
              initial={{ scale: 0.5, opacity: 0, y: 12, rotate: 3 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: -1.5 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              style={{ transformOrigin: 'bottom right' }}
              className="relative max-w-[230px] rounded-2xl border border-ink-500 bg-fg px-4 py-3 text-sm font-medium leading-snug text-ink-950 shadow-xl md:max-w-[280px] md:text-base"
            >
              {run.text}
              <span aria-hidden className="absolute -bottom-2 right-8 size-4 rotate-45 border-b border-r border-ink-500 bg-fg" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
