import { useId, useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import type { FieldDef } from '@/lib/content'
import { cn } from '@/lib/utils'

type Values = Record<string, unknown>

type LinkItem = { label: string; href: string }

function Field({ def, error, children, id }: { def: FieldDef; error?: string; children: ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block">
        {def.label}
        {def.required && ' *'}
      </label>
      {children}
      {def.help && !error && <p className="mt-1.5 text-xs text-fg-dim">{def.help}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Comma separated list, stored as an array. Keeps its own text so typing a comma is not swallowed. */
function ListField({ id, value, onChange, separator, rows }: { id: string; value: string[]; onChange: (v: string[]) => void; separator: ',' | '\n'; rows?: number }) {
  const [text, setText] = useState(value.join(separator === ',' ? ', ' : '\n'))
  const parse = (t: string) => t.split(separator === ',' ? /,/ : /\n/).map((x) => x.trim()).filter(Boolean)
  const common = { id, value: text, className: 'field', onChange: (e: { target: { value: string } }) => (setText(e.target.value), onChange(parse(e.target.value))) }
  return separator === '\n' ? <textarea rows={rows ?? 4} {...common} /> : <input {...common} />
}

function LinksField({ id, value, onChange }: { id: string; value: LinkItem[]; onChange: (v: LinkItem[]) => void }) {
  const set = (i: number, patch: Partial<LinkItem>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  return (
    <div id={id} className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
          <input aria-label={`Link ${i + 1} name`} placeholder="Name (e.g. mystore.in)" value={l.label} onChange={(e) => set(i, { label: e.target.value })} className="field" />
          <input aria-label={`Link ${i + 1} address`} placeholder="https://..." value={l.href} onChange={(e) => set(i, { href: e.target.value })} className="field" />
          <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="inline-flex size-11 items-center justify-center rounded-lg border border-ink-600 hover:border-danger/60">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { label: '', href: '' }])} className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-4 py-2 text-sm hover:border-accent/60">
        <Plus className="size-4" aria-hidden /> Add a link
      </button>
    </div>
  )
}

export function ContentForm({ fields, values, errors, onChange }: { fields: FieldDef[]; values: Values; errors: Record<string, string>; onChange: (key: string, v: unknown) => void }) {
  const uid = useId()
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((f) => {
        if (f.hideWhen && values[f.hideWhen] === true) return null
        const id = `${uid}-${f.key}`
        const v = values[f.key]
        const wide = f.type === 'textarea' || f.type === 'lines' || f.type === 'links' || f.type === 'tags'
        const err = errors[f.key]
        const invalid = { 'aria-invalid': !!err, 'aria-describedby': undefined }
        return (
          <div key={f.key} className={cn(wide && 'md:col-span-2')}>
            {f.type === 'checkbox' ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4">
                <input type="checkbox" checked={v === true} onChange={(e) => onChange(f.key, e.target.checked)} className="size-4 accent-[#3dff8b]" />
                <span>{f.label}</span>
              </label>
            ) : (
              <Field def={f} error={err} id={id}>
                {f.type === 'textarea' ? (
                  <textarea id={id} rows={4} maxLength={f.max} value={typeof v === 'string' ? v : ''} onChange={(e) => onChange(f.key, e.target.value)} className="field resize-y" {...invalid} />
                ) : f.type === 'select' ? (
                  <select id={id} value={typeof v === 'string' ? v : ''} onChange={(e) => onChange(f.key, e.target.value)} className="field" {...invalid}>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o || 'None'}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'tags' ? (
                  <ListField id={id} separator="," value={Array.isArray(v) ? (v as string[]) : []} onChange={(x) => onChange(f.key, x)} />
                ) : f.type === 'lines' ? (
                  <ListField id={id} separator={'\n'} value={Array.isArray(v) ? (v as string[]) : []} onChange={(x) => onChange(f.key, x)} />
                ) : f.type === 'links' ? (
                  <LinksField id={id} value={Array.isArray(v) ? (v as LinkItem[]) : []} onChange={(x) => onChange(f.key, x)} />
                ) : (
                  <input
                    id={id}
                    type={f.type === 'month' ? 'month' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}
                    maxLength={f.max}
                    placeholder={f.placeholder}
                    value={typeof v === 'string' ? v : ''}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="field"
                    {...invalid}
                  />
                )}
              </Field>
            )}
          </div>
        )
      })}
    </div>
  )
}
