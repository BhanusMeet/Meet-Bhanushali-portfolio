import { useEffect, useState } from 'react'
import { Quote, Star } from 'lucide-react'
import { fetchPublicTestimonials } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Reveal } from '@/animations/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Spinner } from '@/components/ui/primitives'
import type { PublicTestimonial } from '@/types'

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={i <= n ? 'size-4 fill-accent text-accent' : 'size-4 text-ink-500'} />
      ))}
    </span>
  )
}

/**
 * Only approved reviews with public-display consent ever reach this component:
 * the data comes from a database function that re-checks both conditions.
 * React escapes all text, so review content can never inject markup.
 */
export function Testimonials() {
  const [items, setItems] = useState<PublicTestimonial[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setItems([])
      return
    }
    let live = true
    fetchPublicTestimonials()
      .then((d) => live && setItems(d))
      .catch(() => live && (setFailed(true), setItems([])))
    return () => {
      live = false
    }
  }, [])

  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="relative py-24 md:py-36">
      <div className="container-x">
        <SectionHeading id="testimonials-title" eyebrow="Client words" title="What working together feels like.">
          Reviews are collected privately, by invitation, and published only after approval.
        </SectionHeading>

        {items === null ? (
          <Spinner label="Loading reviews" />
        ) : items.length === 0 ? (
          <Reveal>
            <div className="surface flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:p-10">
              <Quote aria-hidden className="size-8 shrink-0 text-accent" />
              <div>
                <p className="font-display text-xl font-semibold">{failed ? 'Reviews are temporarily unavailable.' : 'No public reviews yet.'}</p>
                <p className="mt-1 text-fg-muted">Verified client reviews will appear here once they’ve been submitted and approved. Nothing is fabricated in the meantime.</p>
              </div>
            </div>
          </Reveal>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((t, i) => (
              <Reveal as="li" key={t.id} from={i % 2 ? 'right' : 'left'} className="list-none">
                <figure className="surface flex h-full flex-col p-6 md:p-7">
                  <Stars n={t.rating} />
                  <blockquote className="mt-5 flex-1 whitespace-pre-line text-fg">“{t.review_text}”</blockquote>
                  <figcaption className="mt-6 border-t border-ink-600 pt-4">
                    <p className="font-medium">{t.client_name}</p>
                    <p className="text-sm text-fg-muted">{[t.role, t.company_name].filter(Boolean).join(' · ')}</p>
                    {t.project_name && <p className="mt-1 font-mono text-xs text-fg-dim">Project: {t.project_name}</p>}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
