import type { ReactNode } from 'react'
import { Reveal } from '@/animations/Reveal'

export function SectionHeading({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow: string
  title: ReactNode
  id: string
  children?: ReactNode
}) {
  return (
    <Reveal className="mb-14 max-w-4xl md:mb-20">
      <p className="label-mono">{eyebrow}</p>
      <h2 id={id} className="mt-4 text-[clamp(2.2rem,5.6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
        {title}
      </h2>
      {children && <p className="mt-6 max-w-2xl text-lg text-fg-muted">{children}</p>}
    </Reveal>
  )
}
