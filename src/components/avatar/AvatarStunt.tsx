import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar, type Mood } from './Avatar'
import { avatarBus } from './avatarBus'

type Stage = 'idle' | 'scrolling' | 'fall' | 'lie' | 'rise' | 'rub'
type Playing = Exclude<Stage, 'idle' | 'scrolling'>

type Reason = 'contact' | 'work' | 'fast'

const JOKES = [
  'Whoa, slow down! The page isn’t going anywhere.',
  'This fast? I haven’t even finished my chai.',
  'Easy! I’m a developer, not a rollercoaster.',
  'Scrolling at this speed is a sport. Gold medal.',
  'Slow down, the good stuff is right here.',
  'My legs are doing their best. Please be gentle.',
]

function linesFor(reason: Reason, joke: string): Record<Playing, string> {
  return {
    fall: 'Waaaaah!',
    lie: 'THUD.',
    rise: reason === 'fast' ? 'Ow. Too fast for me.' : '...I am fine. Totally fine.',
    rub: reason === 'contact' ? 'Ouch! Okay, okay. Let’s talk.' : reason === 'work' ? 'Ouch! Okay, okay. Have a look at my work.' : joke,
  }
}
const MOODS: Record<Playing, Mood> = { fall: 'dizzy', lie: 'dizzy', rise: 'ouch', rub: 'ouch' }

/**
 * Easter egg. It plays EVERY time, for:
 *  - any "#contact" or "#work" link (page scrolls there first, then Meet falls in), and
 *  - a very fast scroll (he falls where you are; fired by AvatarFollower via "avatar:fall").
 * He lands on his face, gets up and rubs his head. Skip with the button or Escape. Not mounted
 * at all under prefers-reduced-motion (links then just scroll normally).
 */
export function AvatarStunt({ onActive }: { onActive: (active: boolean) => void }) {
  const [stage, setStage] = useState<Stage>('idle')
  const [reason, setReason] = useState<Reason>('contact')
  const [joke, setJoke] = useState(JOKES[0])
  const jokeIdx = useRef(0)
  const timers = useRef<number[]>([])
  const poll = useRef<number | undefined>(undefined)

  const clearAll = useCallback(() => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    window.clearInterval(poll.current)
  }, [])

  const finish = useCallback(() => {
    clearAll()
    avatarBus.busy = false
    setStage('idle')
    onActive(false)
  }, [clearAll, onActive])

  const playFall = useCallback(() => {
    const at = (ms: number, s: Stage) => timers.current.push(window.setTimeout(() => setStage(s), ms))
    setStage('fall')
    at(650, 'lie')
    at(1500, 'rise')
    at(2200, 'rub')
    timers.current.push(window.setTimeout(finish, 3900))
  }, [finish])

  const begin = useCallback(
    (why: Reason, scrollToId: string | null) => {
      avatarBus.busy = true
      setReason(why)
      setJoke(JOKES[jokeIdx.current++ % JOKES.length])
      onActive(true)
      if (!scrollToId) return playFall()

      // 1) scroll to the section, 2) wait until the page stops moving, 3) fall in.
      setStage('scrolling')
      document.getElementById(scrollToId)?.scrollIntoView({ behavior: 'smooth' })
      const started = performance.now()
      let lastY = window.scrollY
      let still = 0
      poll.current = window.setInterval(() => {
        const y = window.scrollY
        still = Math.abs(y - lastY) < 1 ? still + 1 : 0
        lastY = y
        const waited = performance.now() - started
        if ((still >= 2 && waited > 350) || waited > 3500) {
          window.clearInterval(poll.current)
          playFall()
        }
      }, 120)
    },
    [onActive, playFall],
  )

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#contact"], a[href="#work"]')
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (avatarBus.busy) return // already mid-stunt: let the link scroll normally
      e.preventDefault()
      const id = a.getAttribute('href')!.slice(1)
      begin(id === 'work' ? 'work' : 'contact', id)
    }
    const onFast = () => {
      if (!avatarBus.busy) begin('fast', null)
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('avatar:fall', onFast)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('avatar:fall', onFast)
      clearAll()
    }
  }, [begin, clearAll])

  useEffect(() => {
    if (stage === 'idle') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, finish])

  if (stage === 'idle' || stage === 'scrolling') return null
  const LINES = linesFor(reason, joke)

  const motionFor = {
    fall: { y: 0, rotate: 0, scaleY: 1, transition: { duration: 0.6, ease: [0.5, 0, 1, 0.6] as const } },
    lie: { y: -26, rotate: 88, scaleY: 1, transition: { type: 'spring' as const, stiffness: 150, damping: 9 } },
    rise: { y: 0, rotate: 0, scaleY: 1, transition: { type: 'spring' as const, stiffness: 110, damping: 11 } },
    rub: { y: 0, rotate: 0, scaleY: 1, transition: { duration: 0.2 } },
  }[stage]

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <p role="status" className="sr-only">
        A short animation is playing. Press Escape to skip.
      </p>
      <button
        type="button"
        onClick={finish}
        className="pointer-events-auto absolute right-5 top-20 rounded-full border border-ink-500 bg-ink-900/90 px-4 py-2 font-mono text-xs text-fg-muted hover:text-fg"
      >
        Skip
      </button>

      <div className="absolute inset-x-0 top-[22%] flex justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            className="rounded-2xl border border-ink-500 bg-fg px-5 py-3 font-display text-xl font-semibold text-ink-950 shadow-xl md:text-3xl"
          >
            {LINES[stage]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <motion.div
          initial={{ y: '-115vh', rotate: 0 }}
          animate={motionFor}
          style={{ transformOrigin: '50% 96%' }}
          className="h-[min(52vh,480px)] drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
        >
          <Avatar decorative mood={MOODS[stage]} rubbing={stage === 'rub'} className="h-full w-auto" />
        </motion.div>
      </div>
    </div>
  )
}
