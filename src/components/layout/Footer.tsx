import { ArrowUp } from 'lucide-react'
import { navItems, site } from '@/config/site'
import { useContent } from '@/content/ContentProvider'
import { Wordmark } from './Wordmark'

export function Footer() {
  const year = new Date().getFullYear()
  const { contact: contactChannels } = useContent()
  const socials = contactChannels.filter((c) => c.href && c.id !== 'email')

  return (
    <footer className="border-t border-ink-600 py-14">
      <div className="container-x">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-5 max-w-sm text-sm text-fg-muted">{site.tagline}</p>
          </div>

          <nav aria-label="Footer" className="md:col-span-3">
            <p className="label-mono mb-4">Navigate</p>
            <ul className="space-y-2 text-sm">
              {navItems.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="text-fg-muted hover:text-fg">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <p className="label-mono mb-4">Elsewhere</p>
            {socials.length ? (
              <ul className="space-y-2 text-sm">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-fg">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-dim">Profiles coming soon.</p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-600 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-fg-dim">
            © {year} {site.name}. All rights reserved.
          </p>
          <a
            href="#home"
            data-rope
            className="group inline-flex items-center gap-2 self-start rounded-full border border-ink-500 px-4 py-2 text-sm text-fg-muted transition-colors hover:border-accent/60 hover:text-fg sm:self-auto"
          >
            Back to top <ArrowUp aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
