import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Settings } from 'lucide-react'
import { Avatar } from './Avatar'
import { cornerBox } from './layout'
import { avatarBus } from './avatarBus'

type Stage = 'idle' | 'drop' | 'haul'

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * "Back to top" with a mechanical twist: a steel cable and winch drop from the top of the screen,
 * Meet grabs hold and is hauled up while the whole page scrolls up with him.
 * Triggered by any link marked data-rope. Not mounted under prefers-reduced-motion.
 */
export function AvatarRope({ onActive }: { onActive: (active: boolean) => void }) {
  const [stage, setStage] = useState<Stage>('idle')
  const [geo, setGeo] = useState({ left: 0, top: 0, w: 0, h: 0, cx: 0, hands: 0 })
  const drop = useMotionValue(0)
  const avY = useMotionValue(0)
  const cableH = useTransform([drop, avY] as const, ([d, y]: number[]) => Math.max(0, d + y))
  const hookY = useTransform(cableH, (h) => h - 2)
  const raf = useRef<number | undefined>(undefined)
  const timers = useRef<number[]>([])
  const controls = useRef<{ stop: () => void }[]>([])

  const finish = useCallback(
    (instant = false) => {
      if (raf.current) cancelAnimationFrame(raf.current)
      timers.current.forEach(window.clearTimeout)
      timers.current = []
      controls.current.forEach((c) => c.stop())
      controls.current = []
      if (instant) window.scrollTo({ top: 0, behavior: 'instant' })
      setStage('idle')
      avatarBus.busy = false
      onActive(false)
    },
    [onActive],
  )

  const start = useCallback(() => {
    avatarBus.busy = true
    onActive(true)

    // Match the on-screen position of the scroll companion in the bottom-right corner.
    const vh = window.innerHeight
    const { h, w, left, top } = cornerBox(window.innerWidth, vh)
    const hands = top - 58 * (h / 490)
    setGeo({ left, top, w, h, cx: left + w / 2, hands })
    drop.set(0)
    avY.set(0)
    setStage('drop')

    // 1) cable and hook lower to his hands
    controls.current.push(animate(drop, hands, { duration: 0.75, ease: [0.3, 0.7, 0.3, 1] }))

    // 2) he grabs on, then 3) winch hauls him up while the page scrolls up with him
    timers.current.push(
      window.setTimeout(() => {
        setStage('haul')
        const from = window.scrollY
        const dur = Math.min(2.8, Math.max(1.5, 0.9 + from / 6000))
        controls.current.push(animate(avY, -(top + h + 240), { duration: dur, ease: [0.5, 0, 0.75, 0.55] }))
        const t0 = performance.now()
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / (dur * 1000))
          window.scrollTo({ top: from * (1 - easeInOut(t)), behavior: 'instant' })
          if (t < 1) raf.current = requestAnimationFrame(step)
          else timers.current.push(window.setTimeout(() => finish(), 350))
        }
        raf.current = requestAnimationFrame(step)
      }, 1000),
    )
  }, [avY, drop, finish, onActive])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[data-rope]')
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (avatarBus.busy || window.scrollY < 400) return // too close to the top, or busy: plain scroll
      e.preventDefault()
      start()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [start])

  useEffect(() => {
    if (stage === 'idle') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, finish])

  if (stage === 'idle') return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden>
      {/* winch housing */}
      <motion.div
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ left: geo.cx - 30, top: 0 }}
        className="absolute flex h-10 w-[60px] items-center justify-center gap-2 rounded-b-xl border border-ink-500 bg-ink-700 shadow-lg"
      >
        <motion.span animate={stage === 'haul' ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}>
          <Settings className="size-5 text-silver" />
        </motion.span>
        <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_#3dff8b]" />
      </motion.div>

      {/* steel cable */}
      <motion.div
        style={{ left: geo.cx - 3, top: 0, height: cableH, width: 6 }}
        className="absolute rounded-b bg-[repeating-linear-gradient(135deg,#aab3bb_0_3px,#5f6870_3px_6px)] shadow-[0_0_0_1px_#0f1b20]"
      />
      {/* hook, only while he has not grabbed on yet */}
      {stage === 'drop' && (
        <motion.div style={{ left: geo.cx - 11, top: 0, y: hookY }} className="absolute">
          <svg viewBox="0 0 22 26" className="h-[26px] w-[22px]">
            <path d="M11,0 V8 M11,8 C2,8 2,24 11,24 C19,24 19,16 13,16" fill="none" stroke="#c9d1da" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </motion.div>
      )}

      {/* Meet */}
      <motion.div
        style={{ left: geo.left, top: geo.top, width: geo.w, height: geo.h, y: avY, transformOrigin: '50% -25%' }}
        animate={stage === 'haul' ? { rotate: [-4, 4, -4] } : { rotate: 0 }}
        transition={stage === 'haul' ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        className="absolute drop-shadow-[0_14px_28px_rgba(0,0,0,0.5)]"
      >
        <Avatar decorative hanging={stage === 'haul'} mood={stage === 'haul' ? 'ouch' : 'happy'} className="size-full" />
      </motion.div>
    </div>
  )
}
