import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ButtonLink } from '@/components/ui/Button'
import { StatusDot } from '@/components/ui/primitives'
import { HeroVisual } from '@/3d/HeroVisual'
import { Avatar } from '@/components/avatar/Avatar'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Types a string out once. Full text is always exposed to assistive tech and reduced-motion users. */
function Typed({ text, delay = 0, speed = 22 }: { text: string; delay?: number; speed?: number }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? text.length : 0)

  useEffect(() => {
    if (reduce) return
    let i = 0
    let iv: number | undefined
    const t = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i += 1
        setN(i)
        if (i >= text.length) window.clearInterval(iv)
      }, speed)
    }, delay)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(iv)
    }
  }, [text, delay, speed, reduce])

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, n)}
        {n < text.length && <span className="ml-px inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] bg-accent" style={{ animation: 'blink 1s steps(1) infinite' }} />}
      </span>
    </>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const } }

  return (
    <section id="home" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div aria-hidden className="grid-bg absolute inset-0 -z-10 opacity-70" />

      {/* 3D core: sits behind the headline on desktop, reacts to pointer and to scroll */}
      {isDesktop && (
        <div className="absolute bottom-6 right-0 top-0 z-0 w-[46%]">
          <div className="absolute inset-0 opacity-50">
            <HeroVisual />
          </div>
          <div id="avatar-anchor" className="absolute inset-0">
            {reduce && <Avatar className="absolute inset-x-0 bottom-0 mx-auto h-[92%] w-auto" />}
          </div>
        </div>
      )}

      <div className="container-x relative z-10 flex flex-1 flex-col justify-center pb-10 pt-28 md:pt-32">
        <motion.p {...rise(0.05)} className="label-mono mb-8 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusDot />
          <span className="text-fg-muted">Meet Bhanushali</span>
          <span aria-hidden className="h-px w-8 bg-ink-500" />
          <span>Independent Developer · Digital Builder</span>
        </motion.p>

        <motion.h1 id="hero-title" {...rise(0.15)} className="text-[clamp(2.9rem,9.2vw,9rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
          Turning ideas
          <br />
          into systems.
          <br />
          <span className="text-fg-dim">Building things</span>
          <br />
          <span className="text-fg-dim">that matter.</span>
        </motion.h1>

        {!isDesktop && (
          <div className="relative -mb-4 mt-8 h-[340px] sm:h-[420px]">
            <div className="absolute inset-0 opacity-50">
              <HeroVisual />
            </div>
            <div id="avatar-anchor" className="absolute inset-0">
              {reduce && <Avatar className="absolute inset-x-0 bottom-0 mx-auto h-[92%] w-auto" />}
            </div>
          </div>
        )}

        <div className="mt-12 grid gap-10 border-t border-ink-600 pt-8 md:grid-cols-12">
          <motion.p {...rise(0.3)} className="max-w-xl text-lg leading-relaxed text-fg-muted md:col-span-6 md:text-xl">
            I build websites, eCommerce experiences, and intelligent digital systems, combining development, automation, and a security-first mindset.
          </motion.p>

          <div className="md:col-span-6 md:pl-10">
            <motion.div {...rise(0.4)} className="flex flex-wrap gap-3">
              <ButtonLink href="#work">Explore My Work</ButtonLink>
              <ButtonLink href="#contact" variant="ghost">
                Let’s Connect
              </ButtonLink>
            </motion.div>

            <motion.dl {...rise(0.5)} className="mt-8 grid gap-1.5 font-mono text-[0.72rem] leading-relaxed tracking-wide sm:text-xs">
              <div className="flex flex-wrap gap-x-3">
                <dt className="text-fg-dim">STATUS:</dt>
                <dd className="text-accent">
                  <Typed text="CURRENTLY BUILDING" delay={900} />
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <dt className="text-fg-dim">FOCUS:</dt>
                <dd className="text-fg-muted">
                  <Typed text="WEB DEVELOPMENT × CYBERSECURITY × AUTOMATION" delay={1500} speed={14} />
                </dd>
              </div>
            </motion.dl>
          </div>
        </div>
      </div>

    </section>
  )
}
