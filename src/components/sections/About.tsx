import { useState } from 'react'
import { Boxes, Bot, Globe, ShieldCheck, ShoppingBag } from 'lucide-react'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { cn } from '@/lib/utils'

const nodes = [
  { id: 'web', label: 'Web', x: 200, y: 36, Icon: Globe, text: 'Interfaces that look exceptional and load fast.' },
  { id: 'shop', label: 'eCommerce', x: 364, y: 150, Icon: ShoppingBag, text: 'Storefronts built around real business problems.' },
  { id: 'sec', label: 'Security', x: 200, y: 264, Icon: ShieldCheck, text: 'Thinking about how things break, so they don’t.' },
  { id: 'auto', label: 'Automation', x: 36, y: 150, Icon: Bot, text: 'AI-assisted workflows that remove repetitive work.' },
] as const

/** Small interactive graphic: four disciplines feeding one build. Hover, focus or tap a node. */
function SystemMap() {
  const [active, setActive] = useState<(typeof nodes)[number]['id']>('web')
  const current = nodes.find((n) => n.id === active)!

  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="label-mono">system.map</p>
        <p className="label-mono text-accent">interactive</p>
      </div>
      <svg viewBox="0 -30 400 344" className="mx-auto mt-2 w-full max-w-md" role="group" aria-label="Disciplines that feed into each build">
        {nodes.map((n) => (
          <line
            key={n.id}
            x1="200"
            y1="150"
            x2={n.x}
            y2={n.y}
            stroke={active === n.id ? '#3dff8b' : '#323a44'}
            strokeWidth="1.2"
            strokeDasharray="3 5"
            style={{ transition: 'stroke 0.3s' }}
          />
        ))}
        <circle cx="200" cy="150" r="34" fill="#0a0c0e" stroke="#3dff8b" strokeOpacity=".5" />
        <circle cx="200" cy="150" r="46" fill="none" stroke="#3dff8b" strokeOpacity=".15" />
        <text x="200" y="154" textAnchor="middle" fill="#e9ecea" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.5">
          BUILD
        </text>
        {nodes.map((n) => {
          const on = active === n.id
          return (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${n.label}: ${n.text}`}
              onMouseEnter={() => setActive(n.id)}
              onFocus={() => setActive(n.id)}
              onClick={() => setActive(n.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(n.id)}
              className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[#3dff8b]"
            >
              <circle cx={n.x} cy={n.y} r="26" fill={on ? '#143824' : '#101316'} stroke={on ? '#3dff8b' : '#323a44'} style={{ transition: 'all .3s' }} />
              <foreignObject x={n.x - 10} y={n.y - 10} width="20" height="20" pointerEvents="none">
                <n.Icon className={cn('size-5', on ? 'text-accent' : 'text-fg-muted')} aria-hidden />
              </foreignObject>
              <text x={n.x} y={n.y + (n.y > 150 ? 46 : n.y < 150 ? -34 : 46)} textAnchor="middle" fill={on ? '#e9ecea' : '#98a2ad'} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1">
                {n.label.toUpperCase()}
              </text>
            </g>
          )
        })}
      </svg>
      <p aria-live="polite" className="mt-3 min-h-12 border-t border-ink-600 pt-4 text-sm text-fg-muted">
        <span className="mr-2 font-mono text-xs text-accent">&gt; {current.label.toLowerCase()}</span>
        {current.text}
      </p>
    </div>
  )
}

const highlights = [
  { k: 'Builds', v: 'Websites & eCommerce platforms' },
  { k: 'Curious about', v: 'How digital systems work behind the scenes' },
  { k: 'Mindset', v: 'Security-first, business-aware' },
  { k: 'Approach', v: 'Stay curious. Build relentlessly.' },
]

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="about-title" eyebrow="About" title="More than a developer. A builder of digital systems." />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="space-y-7 lg:col-span-7">
            <Reveal>
              <p className="font-display text-2xl leading-snug tracking-tight text-fg md:text-[1.7rem]">
                I’m Meet Bhanushali, a developer and digital builder interested in the intersection of web technology, cybersecurity, eCommerce, and automation.
              </p>
            </Reveal>
            <Reveal>
              <p className="text-lg text-fg-muted">
                From building websites and managing eCommerce platforms to exploring how digital systems work behind the scenes, I enjoy understanding the bigger picture, not just writing the code.
              </p>
            </Reveal>
            <Reveal>
              <p className="text-lg text-fg-muted">
                I’m interested in creating experiences that look exceptional, work reliably, and solve real business problems.
              </p>
            </Reveal>
            <Reveal>
              <p className="border-l-2 border-accent pl-5 text-lg text-fg">
                My approach is simple: stay curious, build relentlessly, and make every project better than the last.
              </p>
            </Reveal>

            <Reveal>
              <dl className="grid gap-px overflow-hidden rounded-2xl border border-ink-600 bg-ink-600 sm:grid-cols-2">
                {highlights.map((h) => (
                  <div key={h.k} className="bg-ink-900 p-5">
                    <dt className="label-mono">{h.k}</dt>
                    <dd className="mt-2 text-fg">{h.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SystemMap />
              <p className="mt-4 flex items-center gap-2 font-mono text-xs text-fg-dim">
                <Boxes aria-hidden className="size-4" /> Four disciplines. One build.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
