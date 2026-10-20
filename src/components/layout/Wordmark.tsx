import { site } from '@/config/site'

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span aria-hidden className="relative inline-flex size-8 items-center justify-center rounded-lg border border-ink-500 bg-ink-900 font-display text-[0.8rem] font-semibold">
        MB
        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />
      </span>
      <span className="font-display text-[0.95rem] font-semibold tracking-tight">{site.name}</span>
    </span>
  )
}
