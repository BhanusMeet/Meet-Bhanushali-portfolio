import { skillCategories } from '@/data/skills'
import { certificates } from '@/data/certificates'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-title" className="relative py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="skills-title" eyebrow="Skills" title="What I work with.">
          Grouped by what each thing is for. No scores or percentages, just the tools I use.
        </SectionHeading>

        <ul className="border-t border-ink-600">
          {skillCategories.map((c, i) => (
            <Reveal as="li" key={c.id} from={i % 2 ? 'right' : 'left'} className="list-none">
              <div className="group grid gap-4 border-b border-ink-600 py-8 transition-colors duration-300 hover:bg-white/[0.015] md:grid-cols-12 md:gap-10 md:py-10">
                <div className="md:col-span-4">
                  <h3 className="font-display text-2xl font-semibold tracking-tight transition-colors group-hover:text-accent md:text-3xl">{c.title}</h3>
                  <p className="mt-2 max-w-xs text-sm text-fg-muted">{c.blurb}</p>
                </div>
                <ul className="flex flex-wrap content-start gap-x-3 gap-y-2 md:col-span-8">
                  {c.skills.map((s) => (
                    <li key={s.name} className="rounded-full border border-ink-500 px-4 py-2 text-sm text-fg transition-colors hover:border-accent/60 hover:text-accent">
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-20" from="up">
          <h3 className="font-display text-2xl font-semibold tracking-tight">Training and certificates of completion</h3>
          <ul className="mt-6 divide-y divide-ink-600 border-y border-ink-600">
            {certificates.map((c) => (
              <li key={c.id} className="grid gap-1 py-5 md:grid-cols-12 md:gap-8">
                <p className="font-medium md:col-span-6">{c.title}</p>
                <p className="text-sm text-fg-muted md:col-span-3">{c.issuer}</p>
                <p className="font-mono text-xs text-fg-dim md:col-span-3 md:text-right">
                  {c.date} · {c.detail.split(' · ').slice(0, 2).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
