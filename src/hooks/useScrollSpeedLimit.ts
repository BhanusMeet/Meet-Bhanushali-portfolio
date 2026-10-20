import { useEffect } from 'react'
import { avatarBus } from '@/components/avatar/avatarBus'

const MAX_SPEED = 3000 // px per second: about four screens a second
const MAX_LEAD = 1400 // never queue more than this much scroll ahead of the page

const isEditable = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest('textarea, input, select, [contenteditable="true"], dialog, [data-native-scroll]')

/**
 * Caps how fast the mouse wheel / touchpad can move the page, so extreme flicks cannot whip the
 * page (and the animations tied to it) faster than they can follow. The page glides toward the
 * wheel's target at no more than MAX_SPEED, and stops as soon as the wheel stops (no long
 * coasting). Keyboard, scrollbar dragging, touch and the stunts' own scrolling are untouched.
 */
export function useScrollSpeedLimit(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let target = 0
    let current = 0
    let raf = 0
    let last = 0
    let mine = 0 // the scrollY value we last set, to detect scrolling done by someone else

    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    const loop = (now: number) => {
      // Someone else moved the page (scrollbar, keyboard, a stunt): hand control back.
      if (Math.abs(window.scrollY - mine) > 3 || avatarBus.busy) return stop()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      current = window.scrollY
      target = Math.min(current + MAX_LEAD, Math.max(current - MAX_LEAD, target))
      const want = (target - current) * (1 - Math.exp(-dt * 11))
      const cap = MAX_SPEED * dt
      const step = Math.max(-cap, Math.min(cap, want))
      const max = document.documentElement.scrollHeight - window.innerHeight
      const next = Math.min(max, Math.max(0, current + step))
      window.scrollTo({ top: next, behavior: 'instant' })
      mine = window.scrollY
      if (Math.abs(target - mine) < 0.6 || next === 0 || next === max) return stop()
      raf = requestAnimationFrame(loop)
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented || avatarBus.busy || isEditable(e.target)) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1
      const dy = e.deltaY * unit
      if (!dy) return
      e.preventDefault()
      if (!raf) {
        current = window.scrollY
        target = current
        mine = current
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
      target += dy
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      stop()
    }
  }, [enabled])
}
