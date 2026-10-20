import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Pulsing green status indicator. The pulse is decorative and disabled for reduced motion by the global CSS. */
export function StatusDot({ className, tone = 'accent' }: { className?: string; tone?: 'accent' | 'dim' }) {
  const color = tone === 'accent' ? 'bg-accent' : 'bg-fg-dim'
  return (
    <span aria-hidden className={cn('relative inline-flex size-2', className)}>
      {tone === 'accent' && <span className="absolute inset-0 rounded-full bg-accent" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />}
      <span className={cn('relative size-2 rounded-full', color)} />
    </span>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border border-ink-600 bg-ink-900 px-2 py-1 font-mono text-[0.7rem] text-fg-muted', className)}>
      {children}
    </span>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-3 font-mono text-xs text-fg-muted">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-ink-500 border-t-accent" />
      {label}…
    </span>
  )
}
