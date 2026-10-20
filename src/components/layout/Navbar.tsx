import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { navItems, site } from '@/config/site'
import { useActiveSection } from '@/hooks/useActiveSection'
import { cn } from '@/lib/utils'
import { Wordmark } from './Wordmark'

const ids = navItems.map((n) => n.id)

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(ids)
  const reduce = useReducedMotion()
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes the mobile menu and returns focus to the toggle.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled || open ? 'border-b border-ink-600/70 bg-ink-950/80 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <a
        href="#main"
        className="absolute left-4 top-2 -translate-y-20 rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink-950 focus:translate-y-0"
      >
        Skip to content
      </a>
      <nav aria-label="Primary" className="container-x flex h-16 items-center justify-between">
        <a href="#home" aria-label={`${site.name}, home`} className="rounded-md">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                className={cn(
                  'relative rounded-full px-4 py-2 text-sm transition-colors',
                  active === item.id ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
                {active === item.id && <span aria-hidden className="absolute inset-x-4 -bottom-0.5 h-px bg-accent" />}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#contact"
            className="group hidden items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs text-accent transition-colors hover:border-accent hover:bg-accent/15 sm:inline-flex"
          >
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">&gt;</span>
            Let’s Talk
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-ink-600 text-fg md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden md:hidden"
          >
            <ul className="container-x flex flex-col gap-1 pb-6 pt-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setOpen(false)}
                    className={cn('flex items-center justify-between rounded-xl px-3 py-3 font-display text-2xl', active === item.id ? 'text-fg' : 'text-fg-muted')}
                  >
                    {item.label}
                    {active === item.id && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
                  </a>
                </li>
              ))}
              <li className="pt-3">
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-full bg-fg py-3 text-sm font-medium text-ink-950"
                >
                  Let’s Talk
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
