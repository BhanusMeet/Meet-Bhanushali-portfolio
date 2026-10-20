import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, Star, TriangleAlert } from 'lucide-react'
import { checkInvitation, submitReview, type InvitationCheck } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { isPlausibleToken, LIMITS, validateReview, type FieldErrors, type ReviewInput } from '@/lib/validation'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/primitives'
import { Wordmark } from '@/components/layout/Wordmark'
import { cn } from '@/lib/utils'

type Stage = { kind: 'loading' } | { kind: 'form'; clientName: string; projectName: string | null } | { kind: 'done' } | { kind: 'blocked'; reason: string }

const BLOCKED: Record<string, { title: string; body: string }> = {
  invalid: { title: 'This invitation link isn’t valid', body: 'Please check that you copied the whole link, or ask Meet for a new one.' },
  expired: { title: 'This invitation has expired', body: 'Invitations are time-limited. Ask Meet for a fresh link if you’d still like to leave a review.' },
  used: { title: 'This invitation has already been used', body: 'Each invitation can be used once. Thank you, your review has already been received.' },
  revoked: { title: 'This invitation is no longer active', body: 'Please contact Meet if you think this is a mistake.' },
  rate_limited: { title: 'Too many attempts', body: 'Please wait a few minutes and try again.' },
  error: { title: 'Something went wrong', body: 'We couldn’t reach the server. Please try again in a moment.' },
  not_configured: { title: 'Reviews aren’t available yet', body: 'The review service has not been set up on this site.' },
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="relative min-h-svh px-5 py-10">
      <div aria-hidden className="grid-bg absolute inset-0 -z-10" />
      <div className="mx-auto max-w-2xl">
        <Link to="/" aria-label="Back to site"><Wordmark /></Link>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  )
}

function StarInput({ value, onChange, invalid }: { value: number; onChange: (n: number) => void; invalid: boolean }) {
  return (
    <div role="radiogroup" aria-label="Rating" aria-invalid={invalid} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="rounded-md p-1 transition-transform hover:scale-110"
        >
          <Star aria-hidden className={cn('size-8 transition-colors', n <= value ? 'fill-accent text-accent' : 'text-ink-500')} />
        </button>
      ))}
    </div>
  )
}

export default function ReviewPage() {
  usePageMeta('Leave a review · Meet Bhanushali', { noindex: true })
  const { token = '' } = useParams()
  const [stage, setStage] = useState<Stage>({ kind: 'loading' })
  const [form, setForm] = useState<ReviewInput>({ clientName: '', companyName: '', projectName: '', role: '', rating: 0, reviewText: '', consent: false })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const done = (s: Stage) => live && setStage(s)
    if (!isSupabaseConfigured) return done({ kind: 'blocked', reason: 'not_configured' }), undefined
    if (!isPlausibleToken(token)) return done({ kind: 'blocked', reason: 'invalid' }), undefined
    checkInvitation(token).then((r: InvitationCheck) => {
      if (!live) return
      if (r.state === 'valid') {
        setForm((f) => ({ ...f, clientName: r.clientName, projectName: r.projectName ?? '' }))
        setStage({ kind: 'form', clientName: r.clientName, projectName: r.projectName })
      } else setStage({ kind: 'blocked', reason: r.state })
    })
    return () => {
      live = false
    }
  }, [token])

  const set = <K extends keyof ReviewInput>(k: K, v: ReviewInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const v = validateReview(form)
    setErrors(v.errors)
    setFormError(null)
    if (!v.ok) {
      document.getElementById(Object.keys(v.errors)[0] === 'rating' ? 'rating-label' : Object.keys(v.errors)[0])?.focus()
      return
    }
    setSubmitting(true)
    // The server re-validates everything and decides whether the invitation is still usable.
    const res = await submitReview(token, v.clean)
    setSubmitting(false)
    if (res.ok) return setStage({ kind: 'done' })
    if (res.reason === 'validation') return setFormError('Some details were rejected. Please review your answers and try again.')
    if (res.reason === 'error') return setFormError('We couldn’t submit your review. Please try again.')
    setStage({ kind: 'blocked', reason: res.reason })
  }

  if (stage.kind === 'loading')
    return <Shell><Spinner label="Verifying your invitation" /></Shell>

  if (stage.kind === 'blocked') {
    const b = BLOCKED[stage.reason] ?? BLOCKED.invalid
    return (
      <Shell>
        <div role="alert" className="surface p-8">
          <TriangleAlert aria-hidden className="size-8 text-warn" />
          <h1 className="mt-4 text-3xl font-semibold">{b.title}</h1>
          <p className="mt-3 text-fg-muted">{b.body}</p>
        </div>
      </Shell>
    )
  }

  if (stage.kind === 'done')
    return (
      <Shell>
        <div role="status" className="surface p-8">
          <CheckCircle2 aria-hidden className="size-9 text-accent" />
          <h1 className="mt-4 text-3xl font-semibold">Thank you.</h1>
          <p className="mt-3 text-fg-muted">Your review has been received and is awaiting approval. It will only appear publicly if you gave consent and it’s approved.</p>
        </div>
      </Shell>
    )

  const err = (k: keyof ReviewInput) => (errors[k] ? <p id={`${k}-err`} className="mt-1.5 text-sm text-danger">{errors[k]}</p> : null)
  const a11y = (k: keyof ReviewInput) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined })

  return (
    <Shell>
      <p className="label-mono flex items-center gap-2 text-accent"><ShieldCheck aria-hidden className="size-4" /> private invitation</p>
      <h1 className="mt-4 text-4xl font-semibold">Share your experience{stage.clientName ? `, ${stage.clientName.split(' ')[0]}` : ''}.</h1>
      <p className="mt-4 text-fg-muted">
        Meet invited you to leave a short review of working together. It takes about two minutes. Your review is only published if you consent below <em>and</em> it’s approved.
      </p>
      {stage.projectName && <p className="mt-4 inline-flex rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 font-mono text-xs text-fg-muted">Project: {stage.projectName}</p>}

      <form onSubmit={onSubmit} noValidate className="surface mt-8 space-y-6 p-6 md:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="clientName" className="label-mono mb-2 block">Your name *</label>
            <input id="clientName" autoComplete="name" maxLength={LIMITS.name} value={form.clientName} onChange={(e) => set('clientName', e.target.value)} className="field" {...a11y('clientName')} />
            {err('clientName')}
          </div>
          <div>
            <label htmlFor="role" className="label-mono mb-2 block">Role / designation</label>
            <input id="role" autoComplete="organization-title" maxLength={LIMITS.role} value={form.role} onChange={(e) => set('role', e.target.value)} className="field" {...a11y('role')} />
            {err('role')}
          </div>
          <div>
            <label htmlFor="companyName" className="label-mono mb-2 block">Company</label>
            <input id="companyName" autoComplete="organization" maxLength={LIMITS.company} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} className="field" {...a11y('companyName')} />
            {err('companyName')}
          </div>
          <div>
            <label htmlFor="projectName" className="label-mono mb-2 block">Project</label>
            <input id="projectName" maxLength={LIMITS.project} value={form.projectName} onChange={(e) => set('projectName', e.target.value)} className="field" {...a11y('projectName')} />
            {err('projectName')}
          </div>
        </div>

        <div>
          <p id="rating-label" tabIndex={-1} className="label-mono mb-2">Rating *</p>
          <StarInput value={form.rating} onChange={(n) => set('rating', n)} invalid={!!errors.rating} />
          {err('rating')}
        </div>

        <div>
          <label htmlFor="reviewText" className="label-mono mb-2 block">Your review *</label>
          <textarea id="reviewText" rows={6} maxLength={LIMITS.reviewMax} value={form.reviewText} onChange={(e) => set('reviewText', e.target.value)} className="field resize-y" {...a11y('reviewText')} />
          <div className="mt-1.5 flex justify-between text-xs text-fg-dim"><span>{err('reviewText') ?? `Minimum ${LIMITS.reviewMin} characters`}</span><span>{form.reviewText.length}/{LIMITS.reviewMax}</span></div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4">
          <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-1 size-4 accent-[#3dff8b]" />
          <span className="text-sm text-fg-muted">
            <span className="text-fg">I consent to my review, name and the details above being displayed publicly on this website (if approved).</span>
            <br />Leave this unchecked and your feedback will stay private.
          </span>
        </label>

        <p role="alert" aria-live="assertive" className="min-h-5 text-sm text-danger">{formError}</p>
        <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit review'}</Button>
      </form>
    </Shell>
  )
}
