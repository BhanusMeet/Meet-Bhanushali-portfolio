import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Star, Trash2, X } from 'lucide-react'
import { deleteReview, listInvitations, listReviews, moderateReview } from '@/lib/api'
import { cn, formatDateTime, invitationStatus } from '@/lib/utils'
import { Spinner } from '@/components/ui/primitives'
import { StatusPill } from '@/components/admin/StatusPill'
import type { AdminInvitation, AdminReview, ReviewStatus } from '@/types'

const FILTERS: Array<ReviewStatus | 'all'> = ['pending', 'approved', 'rejected', 'all']

export default function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null)
  const [invitations, setInvitations] = useState<Map<string, AdminInvitation>>(new Map())
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [r, i] = await Promise.all([listReviews(), listInvitations()])
      setReviews(r)
      setInvitations(new Map(i.map((x) => [x.id, x])))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => (reviews ?? []).filter((r) => filter === 'all' || r.status === filter), [reviews, filter])
  const count = (f: ReviewStatus | 'all') => (reviews ?? []).filter((r) => f === 'all' || r.status === f).length

  async function act(id: string, fn: () => Promise<void>) {
    setBusyId(id)
    try {
      await fn()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
      setConfirmDelete(null)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Reviews</h1>
      <p className="mt-2 text-fg-muted">Only <strong className="text-fg">approved</strong> reviews with public-display consent are visible on the site.</p>

      <div role="group" aria-label="Filter reviews" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn('rounded-full border px-4 py-2 text-sm capitalize', filter === f ? 'border-accent/60 bg-accent/10 text-accent' : 'border-ink-600 text-fg-muted hover:text-fg')}
          >
            {f} <span className="ml-1 font-mono text-xs opacity-70">{reviews ? count(f) : '–'}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-6 text-danger">{error}</p>}
      {!reviews && !error && <div className="mt-8"><Spinner /></div>}

      <ul className="mt-6 space-y-4">
        {shown.map((r) => {
          const inv = invitations.get(r.invitation_id)
          const busy = busyId === r.id
          return (
            <li key={r.id} className="surface p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{r.client_name}</p>
                  <p className="text-sm text-fg-muted">{[r.role, r.company_name].filter(Boolean).join(' · ') || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} aria-hidden className={i <= r.rating ? 'size-4 fill-accent text-accent' : 'size-4 text-ink-500'} />)}
                  </span>
                  <StatusPill status={r.status} />
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-fg">{r.review_text}</p>

              <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-ink-600 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="label-mono">Project</dt><dd className="mt-1 text-fg-muted">{r.project_name ?? inv?.project_name ?? '-'}</dd></div>
                <div><dt className="label-mono">Submitted</dt><dd className="mt-1 text-fg-muted">{formatDateTime(r.submitted_at)}</dd></div>
                <div>
                  <dt className="label-mono">Public display consent</dt>
                  <dd className={cn('mt-1', r.public_display_consent ? 'text-accent' : 'text-warn')}>{r.public_display_consent ? 'Yes' : 'No (stays private)'}</dd>
                </div>
                <div>
                  <dt className="label-mono">Invitation</dt>
                  <dd className="mt-1 text-fg-muted">{inv ? `${invitationStatus(inv)} · expires ${formatDateTime(inv.expires_at)}` : '-'}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                {r.status !== 'approved' && (
                  <button disabled={busy} onClick={() => act(r.id, () => moderateReview(r.id, 'approved'))} className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/15 disabled:opacity-50">
                    <Check className="size-4" aria-hidden /> Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button disabled={busy} onClick={() => act(r.id, () => moderateReview(r.id, 'rejected'))} className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-4 py-2 text-sm hover:border-danger/60 disabled:opacity-50">
                    <X className="size-4" aria-hidden /> Reject
                  </button>
                )}
                {r.status !== 'pending' && (
                  <button disabled={busy} onClick={() => act(r.id, () => moderateReview(r.id, 'pending'))} className="rounded-full border border-ink-500 px-4 py-2 text-sm text-fg-muted hover:text-fg disabled:opacity-50">
                    Move to pending
                  </button>
                )}
                {confirmDelete === r.id ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-danger/50 px-3 py-1.5 text-sm">
                    Delete permanently?
                    <button disabled={busy} onClick={() => act(r.id, () => deleteReview(r.id))} className="rounded-full bg-danger px-3 py-1 text-ink-950">Yes, delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-fg-muted hover:text-fg">Cancel</button>
                  </span>
                ) : (
                  <button disabled={busy} onClick={() => setConfirmDelete(r.id)} className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-fg-muted hover:text-danger">
                    <Trash2 className="size-4" aria-hidden /> Delete
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {reviews && shown.length === 0 && <p className="surface mt-6 p-8 text-fg-muted">No {filter === 'all' ? '' : filter} reviews.</p>}
    </div>
  )
}
