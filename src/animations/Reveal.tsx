import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

type RevealFrom = 'up' | 'left' | 'right' | 'tilt'

type Props = {
  children: ReactNode
  /** Direction the element travels from while it settles into place. */
  from?: RevealFrom
  className?: string
  as?: 'div' | 'li' | 'article' | 'section'
}

const start: Record<RevealFrom, { x: number; y: number; rotate: number; scale: number; rx: number; ry: number }> = {
  up: { x: 0, y: 90, rotate: 0, scale: 0.97, rx: 22, ry: 0 },
  left: { x: -80, y: 40, rotate: -1.5, scale: 0.96, rx: 8, ry: 28 },
  right: { x: 80, y: 40, rotate: 1.5, scale: 0.96, rx: 8, ry: -28 },
  tilt: { x: 0, y: 110, rotate: 3, scale: 0.94, rx: 35, ry: -10 },
}

/**
 * Scroll-scrubbed arrangement: the element's position is tied to scroll progress, so it
 * glides into place as it enters the viewport and un-arranges if you scroll back up.
 * Only transform + opacity are animated. Disabled under prefers-reduced-motion.
 */
function Scrubbed({ children, from = 'up', className, as = 'div' }: Props) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.98', 'start 0.62'] })
  const s = start[from]
  const opacity = useTransform(scrollYProgress, [0, 0.75], [0, 1])
  const x = useTransform(scrollYProgress, [0, 1], [s.x, 0])
  const y = useTransform(scrollYProgress, [0, 1], [s.y, 0])
  const rotate = useTransform(scrollYProgress, [0, 1], [s.rotate, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [s.scale, 1])
  const rotateX = useTransform(scrollYProgress, [0, 1], [s.rx, 0])
  const rotateY = useTransform(scrollYProgress, [0, 1], [s.ry, 0])
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp ref={ref as never} className={className} style={{ opacity, x, y, rotate, rotateX, rotateY, scale, transformPerspective: 1000, willChange: 'transform, opacity' }}>
      {children}
    </Comp>
  )
}

export function Reveal(props: Props) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Comp = motion[props.as ?? 'div'] as typeof motion.div
    return <Comp className={props.className}>{props.children}</Comp>
  }
  return <Scrubbed {...props} />
}
