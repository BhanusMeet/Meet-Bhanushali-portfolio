import { useRef, type ComponentType } from 'react'
import { easeOut, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { ChefHat, ChessKnight, Feather, Gamepad2, Hand, Music2 } from 'lucide-react'
import { hobbies } from '@/data/hobbies'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { Hobby } from '@/types'

const icons: Record<Hobby['icon'], ComponentType<{ className?: string }>> = {
  cooking: ChefHat,
  chess: ChessKnight,
  garba: Music2,
  gaming: Gamepad2,
  badminton: Feather,
  martial: Hand,
}

function CardBody({ h }: { h: Hobby }) {
  const Icon = icons[h.icon]
  return (
    <>
      <span className="inline-flex size-11 items-center justify-center rounded-xl border border-ink-500 bg-ink-900 text-silver transition-colors duration-500 group-hover:border-accent/50 group-hover:text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-2xl font-semibold">{h.title}</h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-fg-muted">{h.line}</p>
      <p className="mt-4 font-mono text-xs text-fg-dim transition-colors group-hover:text-accent">
        <span aria-hidden>// </span>
        {h.tag}
      </p>
    </>
  )
}

/** Where each card starts in 3D space (px / degrees) before it flies into its slot. */
const scatter = [
  { x: -460, y: -240, z: -520, rx: 42, ry: -55, rz: -18 },
  { x: 40, y: -420, z: -760, rx: -60, ry: 22, rz: 10 },
  { x: 480, y: -220, z: -480, rx: 36, ry: 58, rz: 16 },
  { x: -480, y: 280, z: -420, rx: -38, ry: -48, rz: 12 },
  { x: -30, y: 440, z: -700, rx: 58, ry: -16, rz: -8 },
  { x: 460, y: 260, z: -540, rx: -32, ry: 52, rz: -15 },
] as const

function PinnedCard({ h, i, progress }: { h: Hobby; i: number; progress: MotionValue<number> }) {
  const s = scatter[i % scatter.length]
  // Each card has its own window of the scroll range, so they land one after another.
  const start = 0.04 + i * 0.085
  const p = useTransform(progress, [start, start + 0.36], [0, 1], { ease: easeOut })
  const x = useTransform(p, [0, 1], [s.x, 0])
  const y = useTransform(p, [0, 1], [s.y, 0])
  const z = useTransform(p, [0, 1], [s.z, 0])
  const rotateX = useTransform(p, [0, 1], [s.rx, 0])
  const rotateY = useTransform(p, [0, 1], [s.ry, 0])
  const rotateZ = useTransform(p, [0, 1], [s.rz, 0])
  const opacity = useTransform(p, [0, 0.45], [0.25, 1])
  const slot = useTransform(p, [0.85, 1], [1, 0])

  return (
    <li className="relative list-none">
      {/* the slot this card belongs in */}
      <motion.div aria-hidden style={{ opacity: slot }} className="absolute inset-0 rounded-2xl border border-dashed border-ink-500">
        <span className="absolute left-4 top-3 font-mono text-[0.65rem] text-fg-dim">slot {String(i + 1).padStart(2, '0')}</span>
      </motion.div>
      <motion.article
        style={{ x, y, z, rotateX, rotateY, rotateZ, opacity, transformPerspective: 1300, willChange: 'transform, opacity' }}
        className="surface group relative h-full p-6 hover:border-accent/40"
      >
        <CardBody h={h} />
      </motion.article>
    </li>
  )
}

/** Desktop: the section pins to the screen and the cards assemble as you scroll through it. */
function PinnedStage() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const placed = useTransform(scrollYProgress, (v) => `${Math.min(hobbies.length, Math.max(0, Math.floor((v - 0.04 - 0.36) / 0.085) + 2))}/${hobbies.length} placed`)

  return (
    <section id="hobbies" ref={ref} aria-labelledby="hobbies-title" className="relative h-[290svh]">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <div className="container-x">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="label-mono">Personal</p>
              <h2 id="hobbies-title" className="mt-3 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-none tracking-[-0.035em]">
                OFF THE KEYBOARD
              </h2>
            </div>
            <motion.p aria-hidden className="label-mono text-accent">
              {placed}
            </motion.p>
          </div>
          <ul className="grid grid-cols-3 gap-4">
            {hobbies.map((h, i) => (
              <PinnedCard key={h.id} h={h} i={i} progress={scrollYProgress} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Mobile, tablet and reduced-motion: a normal grid (cards still glide in on mobile via Reveal). */
function PlainGrid() {
  return (
    <section id="hobbies" aria-labelledby="hobbies-title" className="relative py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="hobbies-title" eyebrow="Personal" title="OFF THE KEYBOARD">
          What happens when the laptop is closed.
        </SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hobbies.map((h) => (
            <Reveal as="li" key={h.id} from="tilt" className="list-none">
              <article className="surface group h-full p-6 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-accent/40 md:p-7">
                <CardBody h={h} />
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Hobbies() {
  const reduce = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px) and (min-height: 640px)')
  return wide && !reduce ? <PinnedStage /> : <PlainGrid />
}
