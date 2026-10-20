import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'accent'

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-tight whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-fg text-ink-950 hover:bg-white hover:shadow-[0_0_0_4px_rgb(61_255_139/0.18)]',
  ghost: 'border border-ink-500 text-fg hover:border-accent/60 hover:text-white hover:bg-white/[0.03]',
  accent: 'border border-accent/50 bg-accent/10 text-accent hover:bg-accent/15 hover:border-accent',
}

type CommonProps = { variant?: Variant; icon?: boolean; children: ReactNode; className?: string }

export function ButtonLink({
  variant = 'primary',
  icon = true,
  className,
  children,
  href,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = typeof href === 'string' && /^https?:\/\//i.test(href)
  return (
    <a
      href={href}
      className={cn(base, variants[variant], className)}
      // External links never get access to window.opener or the referrer.
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
      {icon && (
        <ArrowUpRight
          aria-hidden
          className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      )}
    </a>
  )
}

export function Button({
  variant = 'primary',
  icon = false,
  className,
  children,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cn(base, variants[variant], className)} {...rest}>
      {children}
      {icon && <ArrowUpRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
    </button>
  )
}
