/**
 * Database tests for the editable site content (supabase/migrations/20261021000000_site_content.sql).
 * Verifies that only administrators can read all rows or change anything, and that the public
 * function exposes published rows only.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { ADMIN, STRANGER, createTestDb, runAs, type Role } from './helpers/db'

let db: PGlite
const as = <T>(role: Role, sub: string | null, fn: () => Promise<T>) => runAs(db, role, sub, fn)

const denied = async (p: Promise<unknown>) => {
  await expect(p).rejects.toThrow(/permission denied|row-level security|violates/i)
}

beforeAll(async () => {
  db = await createTestDb()
})

describe('site_content access control', () => {
  it('anonymous users cannot read or write the table directly', async () => {
    await denied(as('anon', null, () => db.query(`select * from public.site_content`)))
    await denied(as('anon', null, () => db.query(`insert into public.site_content (kind, data) values ('hobby', '{}')`)))
    await denied(as('anon', null, () => db.query(`delete from public.site_content`)))
  })

  it('a signed-in non-admin cannot insert, and sees nothing', async () => {
    await denied(as('authenticated', STRANGER, () => db.query(`insert into public.site_content (kind, data) values ('hobby', '{"title":"x"}')`)))
    const r = await as('authenticated', STRANGER, () => db.query(`select * from public.site_content`))
    expect(r.rows).toHaveLength(0)
  })

  it('an administrator can insert, update and delete; the database stamps updated_by', async () => {
    const ins = await as('authenticated', ADMIN, () =>
      db.query<{ id: string; updated_by: string }>(`insert into public.site_content (kind, data, position) values ('hobby', '{"title":"Chess"}', 1) returning id, updated_by`),
    )
    expect(ins.rows[0].updated_by).toBe(ADMIN)
    const id = ins.rows[0].id
    await as('authenticated', ADMIN, () => db.query(`update public.site_content set data = '{"title":"Chess!"}' where id = $1`, [id]))
    const got = await as('authenticated', ADMIN, () => db.query<{ data: { title: string } }>(`select data from public.site_content where id = $1`, [id]))
    expect(got.rows[0].data.title).toBe('Chess!')
    await as('authenticated', ADMIN, () => db.query(`delete from public.site_content where id = $1`, [id]))
    const gone = await as('authenticated', ADMIN, () => db.query(`select 1 from public.site_content where id = $1`, [id]))
    expect(gone.rows).toHaveLength(0)
  })
})

describe('site_content integrity', () => {
  it('rejects unknown kinds, non-object data, and oversized data', async () => {
    await expect(db.query(`insert into public.site_content (kind, data) values ('nope', '{}')`)).rejects.toThrow()
    await expect(db.query(`insert into public.site_content (kind, data) values ('hobby', '[]')`)).rejects.toThrow()
    await expect(db.query(`insert into public.site_content (kind, data) values ('hobby', $1::jsonb)`, [JSON.stringify({ blob: 'x'.repeat(21000) })])).rejects.toThrow()
  })

  it('allows only one settings row', async () => {
    await db.query(`insert into public.site_content (kind, data) values ('settings', '{"email":"a@example.test"}')`)
    await expect(db.query(`insert into public.site_content (kind, data) values ('settings', '{}')`)).rejects.toThrow()
  })
})

describe('public read function', () => {
  it('returns published rows only, ordered by kind then position, and exposes no admin metadata', async () => {
    await db.query(`delete from public.site_content`)
    await db.query(`insert into public.site_content (kind, data, position, published) values
      ('project', '{"name":"B"}', 2, true), ('project', '{"name":"A"}', 1, true), ('project', '{"name":"Draft"}', 3, false)`)
    const r = await as('anon', null, () => db.query<{ data: { name: string } }>(`select * from public.get_site_content()`))
    expect(r.rows.map((x) => x.data.name)).toEqual(['A', 'B'])
    expect(Object.keys(r.rows[0]).sort()).toEqual(['data', 'id', 'kind', 'position'])
  })
})
