import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, FolderOpen, X } from 'lucide-react'
import { projectCategories, projects as realProjects, sampleProjects } from '@/data/projects'
import { showSampleProjects } from '@/config/site'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Tag } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

function ProjectCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  return (
    <article className="surface group relative flex flex-col overflow-hidden transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-accent/40">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-ink-600 bg-ink-900">
        {p.cover ? (
          <img src={p.cover} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <div aria-hidden className="grid-bg absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs text-fg-dim">// preview</span>
          </div>
        )}
        {p.placeholder && (
          <span className="absolute left-3 top-3 rounded-md border border-warn/50 bg-ink-950/80 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-warn">placeholder</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="label-mono text-accent">{p.category}</p>
        <h3 className="mt-3 text-xl font-semibold">{p.name}</h3>
        <p className="mt-2 flex-1 text-sm text-fg-muted">{p.description}</p>
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technology stack">
          {p.stack.map((s) => (
            <li key={s}>
              <Tag>{s}</Tag>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          {p.caseStudy && (
            <button type="button" onClick={onOpen} className="rounded font-medium text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
              View case study
            </button>
          )}
          {p.liveUrl && (
            <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              Live site <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
          {p.repoUrl && (
            <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              Source <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

/** Native <dialog>: built-in focus trap, Escape to close, and inert background. */
function CaseStudyDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (project && !d.open) d.showModal()
    if (!project && d.open) d.close()
  }, [project])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="case-title"
      className="m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[85svh] rounded-2xl border border-ink-500 bg-ink-800 p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {project && (
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-mono text-accent">{project.category}</p>
              <h3 id="case-title" className="mt-2 text-2xl font-semibold">{project.name}</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Close case study" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-ink-500 hover:border-accent/60">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-4 text-fg-muted">{project.description}</p>
          <dl className="mt-6 space-y-5">
            {([['Challenge', project.caseStudy?.challenge], ['Solution', project.caseStudy?.solution], ['Results', project.caseStudy?.results]] as const).map(
              ([k, v]) =>
                v && (
                  <div key={k}>
                    <dt className="label-mono">{k}</dt>
                    <dd className="mt-1.5 text-fg-muted">{v}</dd>
                  </div>
                ),
            )}
          </dl>
        </div>
      )}
    </dialog>
  )
}

export function Projects() {
  const items = useMemo(() => (showSampleProjects ? [...realProjects, ...sampleProjects] : realProjects), [])
  const [filter, setFilter] = useState<string>('All')
  const [open, setOpen] = useState<Project | null>(null)
  const visible = filter === 'All' ? items : items.filter((p) => p.category === filter)

  return (
    <section id="projects" aria-labelledby="projects-title" className="relative py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="projects-title" eyebrow="Projects" title="Selected work.">
          A showcase across the web, eCommerce, security experiments and automation.
        </SectionHeading>

        <Reveal>
          <div role="group" aria-label="Filter projects by category" className="mb-8 flex flex-wrap gap-2">
            {['All', ...projectCategories].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm transition-colors',
                  filter === c ? 'border-accent/60 bg-accent/10 text-accent' : 'border-ink-600 text-fg-muted hover:border-ink-500 hover:text-fg',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>

        {items.length === 0 ? (
          <Reveal>
            <div className="surface relative overflow-hidden p-8 md:p-12">
              <div aria-hidden className="grid-bg absolute inset-0 opacity-70" />
              <div className="relative max-w-xl">
                <FolderOpen aria-hidden className="size-8 text-accent" />
                <h3 className="mt-6 text-2xl font-semibold md:text-3xl">The project vault is being assembled.</h3>
                <p className="mt-3 text-fg-muted">
                  Real projects, with live links, repositories and honest case studies, will appear here. Nothing is padded with filler in the meantime.
                </p>
                <pre className="mt-6 overflow-x-auto rounded-lg border border-ink-600 bg-ink-950 p-4 font-mono text-xs leading-relaxed text-fg-muted" aria-hidden>
                  <span className="text-accent">$</span> ls ./projects{'\n'}
                  <span className="text-fg-dim">total 0, new entries coming soon</span>
                </pre>
              </div>
            </div>
          </Reveal>
        ) : visible.length === 0 ? (
          <p className="surface p-8 text-fg-muted">Nothing in “{filter}” yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((p, i) => (
              <Reveal as="li" key={p.id} from={i % 2 ? 'right' : 'left'} className="list-none">
                <ProjectCard p={p} onOpen={() => setOpen(p)} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
      <CaseStudyDialog project={open} onClose={() => setOpen(null)} />
    </section>
  )
}
