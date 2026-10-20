import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listInvitations, listReviews } from '@/lib/api'
import { invitationStatus } from '@/lib/utils'
import { Spinner } from '@/components/ui/primitives'

export default function AdminOverview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listReviews(), listInvitations()])
      .then(([r, i]) => {
        const inv = i.map(invitationStatus)
        setStats({
          'Pending reviews': r.filter((x) => x.status === 'pending').length,
          'Approved reviews': r.filter((x) => x.status === 'approved').length,
          'Rejected reviews': r.filter((x) => x.status === 'rejected').length,
          'Open invitations': inv.filter((s) => s === 'pending').length,
        })
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-semibold">Overview</h1>
      <p className="mt-2 text-fg-muted">Private client review pipeline.</p>
      <div className="mt-8">
        {error ? (
          <p role="alert" className="text-danger">Could not load data: {error}</p>
        ) : !stats ? (
          <Spinner />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="surface p-5">
                <dt className="label-mono">{k}</dt>
                <dd className="mt-3 font-display text-4xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="rounded-full border border-ink-500 px-5 py-2.5 hover:border-accent/60" to="/admin/invitations">Create an invitation →</Link>
        <Link className="rounded-full border border-ink-500 px-5 py-2.5 hover:border-accent/60" to="/admin/reviews">Moderate reviews →</Link>
      </div>
    </div>
  )
}
