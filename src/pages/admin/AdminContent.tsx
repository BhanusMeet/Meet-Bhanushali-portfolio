import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { adminDeleteContent, adminListContent, adminSaveContent, adminSetPositions } from '@/lib/api'
import { KINDS, kindDef, validateValues, type ContentKind, type ContentRow, type FieldDef } from '@/lib/content'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/primitives'
import { ContentForm } from '@/components/admin/ContentForm'
import { cn } from '@/lib/utils'

type Editing = { id?: string; values: Record<string, unknown>; published: boolean }

const emptyFor = (f: FieldDef): unknown => (f.type === 'tags' || f.type === 'lines' || f.type === 'links' ? [] : f.type === 'checkbox' ? false : f.type === 'select' ? (f.options?.[0] ?? '') : '')

const blank = (kind: ContentKind): Record<string, unknown> => Object.fromEntries(kindDef(kind).fields.map((f) => [f.key, emptyFor(f)]))

/** Existing row -> editable values (missing keys filled with sensible empties). */
const toValues = (kind: ContentKind, data: Record<string, unknown>) => ({ ...blank(kind), ...data })

/** Editor values -> the JSON stored in the database (only known fields, trimmed). */
function toData(kind: ContentKind, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of kindDef(kind).fields) {
    const v = values[f.key]
    if (f.hideWhen && values[f.hideWhen] === true) out[f.key] = ''
    else if (f.type === 'links') out[f.key] = (Array.isArray(v) ? v : []).map((l) => ({ label: String((l as { label?: string }).label ?? '').trim(), href: String((l as { href?: string }).href ?? '').trim() })).filter((l) => l.href)
    else if (f.type === 'tags' || f.type === 'lines') out[f.key] = Array.isArray(v) ? v : []
    else if (f.type === 'checkbox') out[f.key] = v === true
    else out[f.key] = typeof v === 'string' ? v.trim() : ''
  }
  return out
}

export default function AdminContent() {
  const [rows, setRows] = useState<ContentRow[] | null>(null)
  const [kind, setKind] = useState<ContentKind>('experience')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const def = kindDef(kind)
  const load = useCallback(async () => {
    try {
      setRows(await adminListContent())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const items = useMemo(() => (rows ?? []).filter((r) => r.kind === kind).sort((a, b) => a.position - b.position), [rows, kind])
  const isSettings = kind === 'settings'

  function startEdit(r?: ContentRow) {
    setNotice(null)
    setErrors({})
    setEditing(r ? { id: r.id, values: toValues(kind, r.data), published: r.published !== false } : { values: blank(kind), published: true })
  }

  // Settings is a single row: open it straight away.
  useEffect(() => {
    if (rows && isSettings && !editing) {
      const existing = items[0]
      setEditing(existing ? { id: existing.id, values: toValues(kind, existing.data), published: true } : { values: blank(kind), published: true })
    }
  }, [rows, isSettings, editing, items, kind])

  function switchTab(k: ContentKind) {
    setKind(k)
    setEditing(null)
    setErrors({})
    setNotice(null)
    setConfirmDelete(null)
  }

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
      setNotice(ok)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!editing) return
    const errs = validateValues(kind, editing.values)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const position = editing.id ? (items.find((r) => r.id === editing.id)?.position ?? 0) : Math.max(-1, ...items.map((r) => r.position)) + 1
    await run(
      () => adminSaveContent({ id: editing.id, kind, data: toData(kind, editing.values), position, published: editing.published }),
      'Saved. It is live: visitors see it the next time the page loads.',
    )
    if (!isSettings) setEditing(null)
  }

  async function move(index: number, dir: -1 | 1) {
    const order = [...items]
    const j = index + dir
    if (j < 0 || j >= order.length) return
    ;[order[index], order[j]] = [order[j], order[index]]
    const updates = order.map((r, i) => ({ id: r.id, position: i })).filter((u, i) => order[i].position !== u.position)
    await run(() => adminSetPositions(updates), 'Order updated.')
  }

  const toggleVisible = (r: ContentRow) =>
    run(() => adminSaveContent({ id: r.id, kind: r.kind, data: r.data, position: r.position, published: r.published === false }), r.published === false ? 'Now visible on the site.' : 'Hidden from the site.')

  return (
    <div>
      <h1 className="text-3xl font-semibold">Content</h1>
      <p className="mt-2 max-w-2xl text-fg-muted">Edit what appears on your public site. Changes are live straight away, with no code and no redeploy.</p>

      <div role="tablist" aria-label="Content type" className="mt-6 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            role="tab"
            aria-selected={kind === k.kind}
            onClick={() => switchTab(k.kind)}
            className={cn('rounded-full border px-4 py-2 text-sm transition-colors', kind === k.kind ? 'border-accent/60 bg-accent/10 text-accent' : 'border-ink-600 text-fg-muted hover:text-fg')}
          >
            {k.tab}
          </button>
        ))}
      </div>

      <p className="mt-5 max-w-2xl text-sm text-fg-muted">{def.help}</p>
      {error && (
        <p role="alert" className="mt-4 text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 text-accent">
          {notice}
        </p>
      )}
      {!rows && !error && (
        <div className="mt-8">
          <Spinner />
        </div>
      )}

      {rows && !isSettings && (
        <div className="mt-6">
          {!editing && (
            <Button onClick={() => startEdit()} icon={false}>
              <Plus className="size-4" aria-hidden /> Add {def.singular}
            </Button>
          )}

          {!editing && (
            <ul className="mt-6 space-y-3">
              {items.length === 0 && <li className="surface p-8 text-fg-muted">Nothing here yet. Add your first {def.singular}.</li>}
              {items.map((r, i) => (
                <li key={r.id} className={cn('surface flex flex-wrap items-center justify-between gap-3 p-4 md:p-5', r.published === false && 'opacity-60')}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {def.title(r.data)} {r.published === false && <span className="ml-2 font-mono text-xs text-warn">hidden</span>}
                    </p>
                    {def.subtitle && <p className="truncate text-sm text-fg-muted">{def.subtitle(r.data)}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {kind !== 'experience' && (
                      <>
                        <button disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="inline-flex size-9 items-center justify-center rounded-full border border-ink-600 hover:border-accent/60 disabled:opacity-30">
                          <ArrowUp className="size-4" aria-hidden />
                        </button>
                        <button disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="inline-flex size-9 items-center justify-center rounded-full border border-ink-600 hover:border-accent/60 disabled:opacity-30">
                          <ArrowDown className="size-4" aria-hidden />
                        </button>
                      </>
                    )}
                    <button disabled={busy} onClick={() => toggleVisible(r)} aria-label={r.published === false ? 'Show on site' : 'Hide from site'} className="inline-flex size-9 items-center justify-center rounded-full border border-ink-600 hover:border-accent/60">
                      {r.published === false ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                    <button onClick={() => startEdit(r)} className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-4 py-2 text-sm hover:border-accent/60">
                      <Pencil className="size-4" aria-hidden /> Edit
                    </button>
                    {confirmDelete === r.id ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-danger/50 px-3 py-1.5 text-sm">
                        Delete?
                        <button disabled={busy} onClick={() => (setConfirmDelete(null), run(() => adminDeleteContent(r.id), 'Deleted.'))} className="rounded-full bg-danger px-3 py-1 text-ink-950">
                          Yes
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-fg-muted hover:text-fg">
                          No
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(r.id)} aria-label={`Delete ${def.title(r.data)}`} className="inline-flex size-9 items-center justify-center rounded-full text-fg-muted hover:text-danger">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {rows && editing && (
        <form
          onSubmit={(e) => (e.preventDefault(), save())}
          noValidate
          className="surface mt-6 space-y-6 p-5 md:p-7"
          aria-label={editing.id ? `Edit ${def.singular}` : `Add ${def.singular}`}
        >
          {!isSettings && <h2 className="text-xl font-semibold">{editing.id ? `Edit ${def.singular}` : `Add ${def.singular}`}</h2>}
          <ContentForm fields={def.fields} values={editing.values} errors={errors} onChange={(key, v) => setEditing((c) => (c ? { ...c, values: { ...c.values, [key]: v } } : c))} />
          {!isSettings && (
            <label className="flex cursor-pointer items-center gap-3 text-sm text-fg-muted">
              <input type="checkbox" checked={editing.published} onChange={(e) => setEditing((c) => (c ? { ...c, published: e.target.checked } : c))} className="size-4 accent-[#3dff8b]" />
              Show on the public site
            </label>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </Button>
            {!isSettings && (
              <button type="button" onClick={() => (setEditing(null), setErrors({}))} className="rounded-full border border-ink-500 px-5 py-3 text-sm hover:border-accent/60">
                Cancel
              </button>
            )}
            {Object.keys(errors).length > 0 && (
              <p role="alert" className="text-sm text-danger">
                Please fix the highlighted fields.
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
