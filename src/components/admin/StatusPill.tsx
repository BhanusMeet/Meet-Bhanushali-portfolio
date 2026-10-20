import { cn } from '@/lib/utils'

const tones: Record<string, string> = {
  pending: 'border-warn/40 bg-warn/10 text-warn',
  approved: 'border-accent/40 bg-accent/10 text-accent',
  used: 'border-accent/40 bg-accent/10 text-accent',
  rejected: 'border-danger/40 bg-danger/10 text-danger',
  revoked: 'border-danger/40 bg-danger/10 text-danger',
  expired: 'border-ink-500 bg-ink-700 text-fg-muted',
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider', tones[status] ?? tones.expired)}>{status}</span>
  )
}
