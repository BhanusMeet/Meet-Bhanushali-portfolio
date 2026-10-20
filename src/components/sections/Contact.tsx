import type { ComponentType, SVGProps } from 'react'
import { Check, Copy, Mail } from 'lucide-react'
import type { ContactChannel } from '@/config/site'
import { useContent } from '@/content/ContentProvider'
import { useCopy } from '@/hooks/useCopy'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { FiverrIcon, InstagramIcon, LinkedinIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

const icons: Record<ContactChannel['id'], ComponentType<SVGProps<SVGSVGElement>>> = {
  email: Mail as ComponentType<SVGProps<SVGSVGElement>>,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  fiverr: FiverrIcon,
}

function Channel({ c }: { c: ContactChannel }) {
  const Icon = icons[c.id]
  const external = c.id !== 'email'
  const base = 'group flex items-center justify-between gap-4 rounded-2xl border p-5 transition-[border-color,background-color,transform] duration-300'

  if (!c.href) {
    // Unconfigured: hidden in production, visible as a dev-time hint.
    if (!import.meta.env.DEV) return null
    return (
      <li>
        <div className={cn(base, 'border-dashed border-ink-500 text-fg-dim')}>
          <span className="flex items-center gap-4">
            <Icon className="size-6" />
            <span>
              {c.label}
              <span className="block font-mono text-xs">not set, add {c.envKey}</span>
            </span>
          </span>
        </div>
      </li>
    )
  }

  return (
    <li>
      <a
        href={c.href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cn(base, 'border-ink-600 bg-ink-900/60 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-ink-800')}
      >
        <span className="flex items-center gap-4">
          <Icon className="size-6 text-silver transition-colors group-hover:text-accent" />
          <span>
            <span className="block font-medium">{c.label}</span>
            {c.display && <span className="block font-mono text-xs text-fg-muted">{c.display}</span>}
          </span>
        </span>
        <span aria-hidden className="font-mono text-fg-dim transition-transform group-hover:translate-x-1 group-hover:text-accent">→</span>
      </a>
    </li>
  )
}

export function Contact() {
  const { state, copy } = useCopy()
  const { contact: contactChannels } = useContent()
  const anyConfigured = contactChannels.some((c) => c.href)
  const email = contactChannels.find((c) => c.id === 'email')?.display

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative py-24 md:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink-500 to-transparent" />
      <div className="container-x">
        <SectionHeading id="contact-title" eyebrow="Contact" title="Have an idea worth building?" />

        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="space-y-5 text-lg text-fg-muted lg:col-span-6">
            <p>A website. An eCommerce experience. An automation workflow. Or something that hasn’t been built yet.</p>
            <p>I’m always interested in good ideas, interesting challenges, and people who want to build something meaningful.</p>
            <p className="font-display text-2xl text-fg">Let’s make something happen.</p>

            {email && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-medium text-ink-950 transition-shadow hover:shadow-[0_0_0_4px_rgb(61_255_139/0.18)]">
                  <Mail aria-hidden className="size-4" /> Send an email
                </a>
                <button
                  type="button"
                  onClick={() => void copy(email)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-5 py-3 text-sm text-fg transition-colors hover:border-accent/60"
                >
                  {state === 'copied' ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}
                  {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy email'}
                </button>
                <span role="status" aria-live="polite" className="sr-only">
                  {state === 'copied' ? 'Email address copied to clipboard' : state === 'failed' ? 'Could not copy the email address' : ''}
                </span>
              </div>
            )}
          </Reveal>

          <Reveal className="lg:col-span-6">
            <ul className="grid gap-3 sm:grid-cols-2">
              {contactChannels.map((c) => (
                <Channel key={c.id} c={c} />
              ))}
            </ul>
            {!anyConfigured && !import.meta.env.DEV && (
              <p className="surface mt-3 p-5 text-fg-muted">Contact channels are being set up. Please check back shortly.</p>
            )}
            {import.meta.env.DEV && !email && (
              <p className="mt-4 font-mono text-xs text-fg-dim">dev hint: add your contact links in the admin panel (Content, then Contact links). Unset channels are hidden in production builds.</p>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
