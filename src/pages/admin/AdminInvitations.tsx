import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { createInvitation, listInvitations, revokeInvitation } from '@/lib/api'
import { useCopy } from '@/hooks/useCopy'
import { formatDateTime, invitationStatus } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/primitives'
import { StatusPill } from '@/components/admin/StatusPill'
import type { AdminInvitation } from '@/types'

const EXPIRY_OPTIONS = [1, 3, 7, 14, 30]

// Built from the current origin so links generated on production point at production.
const reviewUrl = (token: string) => `${window.location.origin}/review/${token}`

export default function AdminInvitations() {
  const [items, setItems] = useState<AdminInvitation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ url: string; name: string; expiresAt: string } | null>(null)
  const { state: copyState, copy } = useCopy()

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [projectName, setProjectName] = useState('')
  const [days, setDays] = useState(7)

  const load = useCallback(async () => {
    try {
      setItems(await listInvitations())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await createInvitation({ clientName: clientName.trim(), clientEmail: clientEmail.trim() || undefined, projectName: projectName.trim() || undefined, expiresInDays: days })
      // The raw token exists only in this response. It is not stored and cannot be shown again.
      setCreated({ url: reviewUrl(r.token), name: clientName.trim(), expiresAt: r.expiresAt })
      setClientName('')
      setClientEmail('')
      setProjectName('')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onRevoke(id: string) {
    try {
      await revokeInvitation(id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Invitations</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Each invitation is a unique, single-use, expiring link. Only a SHA-256 hash is stored, so the link is shown once, copy it right away. No email is sent automatically.
        </p>
      </div>

      <form onSubmit={onCreate} className="surface grid gap-4 p-6 md:grid-cols-2" noValidate>
        <div>
          <label htmlFor="cn" className="label-mono mb-2 block">Client name *</label>
          <input id="cn" required maxLength={80} value={clientName} onChange={(e) => setClientName(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="ce" className="label-mono mb-2 block">Client email (optional, private)</label>
          <input id="ce" type="email" maxLength={254} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="cp" className="label-mono mb-2 block">Project (optional)</label>
          <input id="cp" maxLength={100} value={projectName} onChange={(e) => setProjectName(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="cx" className="label-mono mb-2 block">Expires after</label>
          <select id="cx" value={days} onChange={(e) => setDays(Number(e.target.value))} className="field">
            {EXPIRY_OPTIONS.map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 flex items-center gap-4">
          <Button type="submit" disabled={busy || !clientName.trim()}>{busy ? 'Generating…' : 'Generate invitation'}</Button>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </form>

      {created && (
        <div role="status" className="rounded-2xl border border-accent/50 bg-accent/5 p-6">
          <p className="label-mono text-accent">Invitation for {created.name}, shown once</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" className="field font-mono text-xs" />
            <button onClick={() => copy(created.url)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-fg px-5 py-3 text-sm font-medium text-ink-950">
              {copyState === 'copied' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed, select & copy manually' : 'Copy link'}
            </button>
          </div>
          <p className="mt-3 text-sm text-fg-muted">Expires {formatDateTime(created.expiresAt)}. Send it to the client yourself, nothing has been emailed.</p>
        </div>
      )}

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Link2 className="size-5 text-accent" aria-hidden /> All invitations</h2>
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="surface p-8 text-fg-muted">No invitations yet.</p>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="label-mono border-b border-ink-600">
                <tr>
                  <th scope="col" className="p-4">Client</th>
                  <th scope="col" className="p-4">Project</th>
                  <th scope="col" className="p-4">Status</th>
                  <th scope="col" className="p-4">Created</th>
                  <th scope="col" className="p-4">Expires</th>
                  <th scope="col" className="p-4">Used</th>
                  <th scope="col" className="p-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const s = invitationStatus(i)
                  return (
                    <tr key={i.id} className="border-b border-ink-600/60 last:border-0">
                      <td className="p-4"><div className="font-medium">{i.client_name}</div>{i.client_email && <div className="font-mono text-xs text-fg-dim">{i.client_email}</div>}</td>
                      <td className="p-4 text-fg-muted">{i.project_name ?? '-'}</td>
                      <td className="p-4"><StatusPill status={s} /></td>
                      <td className="p-4 text-fg-muted">{formatDateTime(i.created_at)}</td>
                      <td className="p-4 text-fg-muted">{formatDateTime(i.expires_at)}</td>
                      <td className="p-4 text-fg-muted">{formatDateTime(i.used_at)}</td>
                      <td className="p-4 text-right">
                        {s === 'pending' && <button onClick={() => onRevoke(i.id)} className="rounded-full border border-ink-500 px-3 py-1.5 text-xs hover:border-danger/60 hover:text-danger">Revoke</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-fg-dim">Lost a link? Raw tokens cannot be recovered, revoke the old invitation and generate a new one.</p>
      </div>
    </div>
  )
}
