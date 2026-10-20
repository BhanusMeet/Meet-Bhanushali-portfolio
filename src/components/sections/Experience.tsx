import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { experience } from '@/data/experience'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StatusDot, Tag } from '@/components/ui/primitives'
import { cn, formatYearMonth, monthIndex } from '@/lib/utils'
import type { ExperienceEntry } from '@/types'

const nowYm = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function rangeLabel(e: ExperienceEntry) {
  if (e.current) return `${formatYearMonth(e.start)} – Present`
  if (!e.end || e.end === e.start) return formatYearMonth(e.start)
  return `${formatYearMonth(e.start)} – ${formatYearMonth(e.end)}`
}

/**
 * Overlap-aware ribbon: every engagement is drawn against a shared time axis
 * so concurrent roles are visibly parallel rather than sequential.
 */
function TimelineRibbon({ entries }: { entries: ExperienceEntry[] }) {
  const { min, span, years } = useMemo(() => {
    const now = monthIndex(nowYm())
    const starts = entries.map((e) => monthIndex(e.start))
    const ends = entries.map((e) => (e.current ? now : monthIndex(e.end ?? e.start)))
    const lo = Math.min(...starts)
    const hi = Math.max(...ends) + 1
    const ys: { label: number; at: number }[] = []
    // Include the year the range starts in (clamped to the left edge) so every year is labelled.
    for (let y = Math.floor(lo / 12); y * 12 < hi; y++) ys.push({ label: y, at: Math.max(0, ((y * 12 - lo) / (hi - lo)) * 100) })
    return { min: lo, span: hi - lo, years: ys }
  }, [entries])

  const now = monthIndex(nowYm())
  const asc = [...entries].sort((a, b) => monthIndex(a.start) - monthIndex(b.start))

  return (
    <div className="surface mb-10 p-5 md:p-7" role="img" aria-label={`Timeline of ${entries.length} engagements. ${asc.map((e) => `${e.organization}, ${rangeLabel(e)}`).join('; ')}.`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="label-mono">timeline.overview</p>
        <p className="label-mono hidden sm:block">overlaps shown in parallel</p>
      </div>
      <div className="relative">
        {years.map((y) => (
          <div key={y.label} aria-hidden className="absolute inset-y-0 border-l border-dashed border-ink-600" style={{ left: `${y.at}%` }}>
            <span className="absolute -top-1 left-1.5 font-mono text-[0.65rem] text-fg-dim">{y.label}</span>
          </div>
        ))}
        <ul className="relative space-y-2 pt-6">
          {asc.map((e) => {
            const s = monthIndex(e.start)
            const en = e.current ? now : monthIndex(e.end ?? e.start)
            const left = ((s - min) / span) * 100
            const width = Math.max(((en - s + 1) / span) * 100, 3)
            // Wide bars hold their label; narrow ones put it beside the bar, on whichever side has room.
            const inside = width >= 42
            const labelLeft = left > 100 - (left + width)
            const tone = e.current ? 'border-accent/60 bg-accent/20' : 'border-ink-500 bg-ink-600'
            return (
              <li key={e.id} className="relative h-8">
                <div className={cn('absolute top-0 flex h-8 items-center overflow-hidden rounded-md border px-2 font-mono text-[0.68rem] whitespace-nowrap', tone, e.current ? 'text-accent' : 'text-fg-muted')} style={{ left: `${left}%`, width: `${width}%` }}>
                  {inside && <span className="truncate">{e.organization}</span>}
                </div>
                {!inside && (
                  <span
                    className={cn('absolute top-0 flex h-8 items-center font-mono text-[0.68rem] whitespace-nowrap', e.current ? 'text-accent' : 'text-fg-muted')}
                    style={labelLeft ? { right: `${100 - left + 1.5}%` } : { left: `${left + width + 1.5}%` }}
                  >
                    {e.organization}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Placeholder({ children }: { children: string }) {
  return <span className="text-fg-dim italic">{children}</span>
}

function ExperienceCard({ entry, defaultOpen }: { entry: ExperienceEntry; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const reduce = useReducedMotion()
  const panelId = useId()

  return (
    <div className="relative pl-8 md:pl-12">
      {/* rail + node */}
      <span aria-hidden className={cn('absolute left-[7px] top-8 z-10 size-[9px] rounded-full border-2 md:left-[15px]', entry.current ? 'border-accent bg-accent' : 'border-ink-500 bg-ink-950')} />
      <div className={cn('surface overflow-hidden transition-colors duration-300 hover:border-ink-500', open && 'border-ink-500')}>
        <h3 className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="group flex w-full items-start justify-between gap-4 p-5 text-left md:p-6"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-xl font-semibold tracking-tight md:text-2xl">{entry.organization}</span>
                {entry.current && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-accent">
                    <StatusDot /> Current
                  </span>
                )}
                {entry.type && <Tag>{entry.type}</Tag>}
              </span>
              <span className="mt-1.5 block font-mono text-xs text-fg-muted">{rangeLabel(entry)}</span>
            </span>
            <ChevronDown aria-hidden className={cn('mt-1 size-5 shrink-0 text-fg-muted transition-transform duration-300 group-hover:text-fg', open && 'rotate-180')} />
          </button>
        </h3>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              role="region"
              aria-label={`${entry.organization} details`}
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-5 border-t border-ink-600 px-5 pb-6 pt-5 md:px-6">
                <dl className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="label-mono">Role</dt>
                    <dd className="mt-1.5">{entry.role ?? <Placeholder>Role, to be added</Placeholder>}</dd>
                  </div>
                  <div>
                    <dt className="label-mono">Duration</dt>
                    <dd className="mt-1.5">{rangeLabel(entry)}</dd>
                  </div>
                </dl>
                <div>
                  <p className="label-mono">Work</p>
                  <p className="mt-1.5 text-fg-muted">{entry.description ?? <Placeholder>Description of responsibilities, to be added.</Placeholder>}</p>
                </div>
                <div>
                  <p className="label-mono">Technologies</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.technologies?.length ? entry.technologies.map((t) => <Tag key={t}>{t}</Tag>) : <Placeholder>Technologies, to be added.</Placeholder>}
                  </div>
                </div>
                {entry.achievements?.length ? (
                  <div>
                    <p className="label-mono">Highlights</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-muted marker:text-accent">
                      {entry.achievements.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {entry.links?.length ? (
                  <div>
                    <p className="label-mono">Websites</p>
                    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                      {entry.links.map((l) => (
                        <li key={l.href}>
                          <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                            {l.label} <ExternalLink aria-hidden className="size-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function Experience() {
  // Most recent start first. Dates are shown exactly as supplied; overlap is visible in the ribbon.
  const sorted = useMemo(() => [...experience].sort((a, b) => monthIndex(b.start) - monthIndex(a.start)), [])

  return (
    <section id="work" aria-labelledby="work-title" className="relative py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="work-title" eyebrow="Experience" title="Where I’ve been building.">
          Select a role to expand it. Some engagements overlap, dates are shown as they happened.
        </SectionHeading>

        <Reveal>
          <TimelineRibbon entries={experience} />
        </Reveal>

        <ol className="relative space-y-4">
          <span aria-hidden className="absolute bottom-6 left-[11px] top-6 w-px bg-gradient-to-b from-accent/60 via-ink-600 to-transparent md:left-[19px]" />
          {sorted.map((e, i) => (
            <Reveal as="li" key={e.id} from={i % 2 ? 'right' : 'left'} className="list-none">
              <ExperienceCard entry={e} defaultOpen={i === 0} />
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
