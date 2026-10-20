/**
 * Database-level tests for the private review system.
 *
 * Runs the REAL migration against an in-process Postgres (PGlite) with stand-ins for Supabase's
 * roles and `auth` schema. This verifies SQL logic, constraints, privileges and RLS.
 * It does NOT exercise Supabase Auth, PostgREST, or Edge Functions (see README "Verification").
 */
import { createHash, randomBytes } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { ADMIN, STRANGER, createTestDb, runAs } from './helpers/db'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const newToken = () => randomBytes(32).toString('base64url')

let db: PGlite

const as = <T>(role: 'anon' | 'authenticated' | 'service_role', sub: string | null, fn: () => Promise<T>) => runAs(db, role, sub, fn)

const denied = async (p: Promise<unknown>) => {
  await expect(p).rejects.toThrow(/permission denied|row-level security|forbidden/i)
}

async function makeInvitation(opts: { token?: string; ageDays?: number; ttlDays?: number; revoked?: boolean; project?: string | null } = {}) {
  const token = opts.token ?? newToken()
  const { ageDays = 0, ttlDays = 7 } = opts
  await db.query(
    `insert into public.review_invitations (token_hash, client_name, project_name, created_at, expires_at, revoked_at)
     values ($1, 'Test Client', $2, now() - ($3 || ' days')::interval, now() - ($3 || ' days')::interval + ($4 || ' days')::interval, ${opts.revoked ? 'now()' : 'null'})`,
    [sha256(token), opts.project ?? null, String(ageDays), String(ttlDays)],
  )
  return token
}

const submit = (token: string, over: Partial<{ name: string; text: string; rating: number; consent: boolean }> = {}) =>
  as('service_role', null, async () => {
    const r = await db.query<{ submit_review: { ok: boolean; reason?: string } }>(
      `select public.submit_review($1, $2, 'Acme', null, 'CTO', $3, $4, $5)`,
      [sha256(token), over.name ?? 'Jane Doe', over.rating ?? 5, over.text ?? 'Genuinely great to work with, delivered on time.', over.consent ?? true],
    )
    return r.rows[0].submit_review
  })

beforeAll(async () => {
  db = await createTestDb()
})

describe('anonymous access is denied', () => {
  it('cannot read invitations, testimonials, admin list or rate limits', async () => {
    for (const t of ['review_invitations', 'testimonials', 'admin_users', 'rate_limits']) {
      await denied(as('anon', null, () => db.query(`select * from public.${t}`)))
    }
  })
  it('cannot insert or update testimonials directly', async () => {
    await denied(as('anon', null, () => db.query(`insert into public.testimonials (invitation_id, client_name, rating, review_text) values (gen_random_uuid(), 'x', 5, 'xxxxxxxxxxxxxxxxxxxxxxxx')`)))
    await denied(as('anon', null, () => db.query(`update public.testimonials set status = 'approved'`)))
  })
  it('cannot call privileged functions', async () => {
    await denied(as('anon', null, () => db.query(`select public.submit_review('a','b',null,null,null,5,'xxxxxxxxxxxxxxxxxxxxxxxx',true)`)))
    await denied(as('anon', null, () => db.query(`select public.get_invitation_status('a')`)))
    await denied(as('anon', null, () => db.query(`select public.check_rate_limit('a', 1, 60)`)))
    await denied(as('anon', null, () => db.query(`select public.moderate_review(gen_random_uuid(), 'approved')`)))
    await denied(as('anon', null, () => db.query(`select public.is_admin()`)))
  })
  it('can call get_public_testimonials (and gets nothing yet)', async () => {
    const r = await as('anon', null, () => db.query(`select * from public.get_public_testimonials()`))
    expect(r.rows).toHaveLength(0)
  })
})

describe('invitation validation', () => {
  it('rejects an unknown token', async () => {
    expect(await submit(newToken())).toEqual({ ok: false, reason: 'invalid' })
  })
  it('rejects an expired token', async () => {
    const t = await makeInvitation({ ageDays: 10, ttlDays: 7 })
    expect(await submit(t)).toEqual({ ok: false, reason: 'expired' })
  })
  it('rejects a revoked token', async () => {
    const t = await makeInvitation({ revoked: true })
    expect(await submit(t)).toEqual({ ok: false, reason: 'revoked' })
  })
  it('status endpoint reports each state without leaking details for invalid tokens', async () => {
    const good = await makeInvitation({ project: 'Shop Revamp' })
    const status = (tok: string) =>
      as('service_role', null, async () => (await db.query<{ get_invitation_status: Record<string, unknown> }>(`select public.get_invitation_status($1)`, [sha256(tok)])).rows[0].get_invitation_status)
    expect(await status(good)).toEqual({ valid: true, clientName: 'Test Client', projectName: 'Shop Revamp' })
    expect(await status(newToken())).toEqual({ valid: false, reason: 'invalid' })
  })
  it('database refuses malformed hashes and absurd lifetimes', async () => {
    await expect(db.query(`insert into public.review_invitations (token_hash, client_name, expires_at) values ('not-a-hash', 'x', now() + interval '1 day')`)).rejects.toThrow()
    await expect(db.query(`insert into public.review_invitations (token_hash, client_name, expires_at) values ('${sha256('z')}', 'x', now() + interval '400 days')`)).rejects.toThrow()
  })
})

describe('atomic single-use submission', () => {
  it('creates a PENDING review, consumes the invitation, and blocks reuse', async () => {
    const t = await makeInvitation({ project: 'Invite Project' })
    expect(await submit(t)).toEqual({ ok: true })

    const rev = await db.query<{ status: string; reviewed_at: string | null; project_name: string; public_display_consent: boolean }>(
      `select t.status, t.reviewed_at, t.project_name, t.public_display_consent from public.testimonials t join public.review_invitations i on i.id = t.invitation_id where i.token_hash = $1`,
      [sha256(t)],
    )
    expect(rev.rows).toHaveLength(1)
    expect(rev.rows[0].status).toBe('pending')
    expect(rev.rows[0].reviewed_at).toBeNull()
    expect(rev.rows[0].project_name).toBe('Invite Project') // falls back to the invitation's project

    const inv = await db.query<{ used_at: string | null }>(`select used_at from public.review_invitations where token_hash = $1`, [sha256(t)])
    expect(inv.rows[0].used_at).not.toBeNull()

    expect(await submit(t)).toEqual({ ok: false, reason: 'used' })
    const count = await db.query<{ n: number }>(`select count(*)::int n from public.testimonials t join public.review_invitations i on i.id = t.invitation_id where i.token_hash = $1`, [sha256(t)])
    expect(count.rows[0].n).toBe(1)
  })

  it('invalid payloads are rejected and DO NOT burn the invitation', async () => {
    const t = await makeInvitation()
    expect(await submit(t, { text: 'too short' })).toEqual({ ok: false, reason: 'validation' })
    expect(await submit(t, { rating: 9 })).toEqual({ ok: false, reason: 'validation' })
    expect(await submit(t, { name: '   ' })).toEqual({ ok: false, reason: 'validation' })
    expect(await submit(t, { text: 'x'.repeat(2001) })).toEqual({ ok: false, reason: 'validation' })
    expect(await submit(t)).toEqual({ ok: true }) // still usable
  })

  it('strips control characters server-side', async () => {
    const t = await makeInvitation()
    await submit(t, { text: 'Great work\u0007 overall, would recommend\u001b to anyone.' })
    const r = await db.query<{ review_text: string }>(`select review_text from public.testimonials t join public.review_invitations i on i.id = t.invitation_id where i.token_hash = $1`, [sha256(t)])
    expect(r.rows[0].review_text).toBe('Great work overall, would recommend to anyone.')
  })

  it('UNIQUE(invitation_id) is an independent backstop against duplicates', async () => {
    const t = await makeInvitation()
    await submit(t)
    const inv = await db.query<{ id: string }>(`select id from public.review_invitations where token_hash = $1`, [sha256(t)])
    await expect(
      db.query(`insert into public.testimonials (invitation_id, client_name, rating, review_text) values ($1, 'dup', 5, 'duplicate duplicate duplicate')`, [inv.rows[0].id]),
    ).rejects.toThrow(/unique|duplicate/i)
  })

  it('table CHECK constraints hold even for trusted writers', async () => {
    const t = await makeInvitation()
    const inv = await db.query<{ id: string }>(`select id from public.review_invitations where token_hash = $1`, [sha256(t)])
    await expect(
      db.query(`insert into public.testimonials (invitation_id, client_name, rating, review_text) values ($1, 'x', 6, 'rating out of range here')`, [inv.rows[0].id]),
    ).rejects.toThrow()
    await expect(
      db.query(`insert into public.testimonials (invitation_id, client_name, rating, review_text, status) values ($1, 'x', 5, 'approved without reviewer timestamp', 'approved')`, [inv.rows[0].id]),
    ).rejects.toThrow()
  })
})

describe('moderation + public visibility', () => {
  let ids: { approvedConsent: string; approvedNoConsent: string; pendingConsent: string; rejectedConsent: string }

  beforeAll(async () => {
    const mk = async (consent: boolean, name: string) => {
      const t = await makeInvitation()
      await submit(t, { consent, name })
      const r = await db.query<{ id: string }>(`select t.id from public.testimonials t join public.review_invitations i on i.id = t.invitation_id where i.token_hash = $1`, [sha256(t)])
      return r.rows[0].id
    }
    ids = {
      approvedConsent: await mk(true, 'Visible Victor'),
      approvedNoConsent: await mk(false, 'Private Pat'),
      pendingConsent: await mk(true, 'Pending Penny'),
      rejectedConsent: await mk(true, 'Rejected Rita'),
    }
  })

  it('non-admin authenticated users cannot moderate, read, or delete', async () => {
    await denied(as('authenticated', STRANGER, () => db.query(`select public.moderate_review($1, 'approved')`, [ids.approvedConsent])))
    const rows = await as('authenticated', STRANGER, () => db.query(`select * from public.testimonials`))
    expect(rows.rows).toHaveLength(0) // RLS hides everything
    const del = await as('authenticated', STRANGER, () => db.query(`delete from public.testimonials`))
    expect(del.affectedRows ?? 0).toBe(0)
    const inv = await as('authenticated', STRANGER, () => db.query(`select id from public.review_invitations`))
    expect(inv.rows).toHaveLength(0)
  })

  it('no authenticated user can update/insert directly, or read token hashes', async () => {
    await denied(as('authenticated', ADMIN, () => db.query(`update public.testimonials set status = 'approved'`)))
    await denied(as('authenticated', ADMIN, () => db.query(`insert into public.review_invitations (token_hash, client_name, expires_at) values ('${sha256('q')}', 'x', now() + interval '1 day')`)))
    await denied(as('authenticated', ADMIN, () => db.query(`select token_hash from public.review_invitations`)))
    await denied(as('authenticated', ADMIN, () => db.query(`select * from public.review_invitations`))) // * includes token_hash
  })

  it('anon sees nothing until approval, and never without consent', async () => {
    const pub = () => as('anon', null, async () => (await db.query<{ client_name: string }>(`select client_name from public.get_public_testimonials()`)).rows.map((r) => r.client_name))
    expect(await pub()).toEqual([])

    await as('authenticated', ADMIN, async () => {
      await db.query(`select public.moderate_review($1, 'approved')`, [ids.approvedConsent])
      await db.query(`select public.moderate_review($1, 'approved')`, [ids.approvedNoConsent])
      await db.query(`select public.moderate_review($1, 'rejected')`, [ids.rejectedConsent])
    })

    expect(await pub()).toEqual(['Visible Victor']) // pending, rejected and no-consent all hidden
  })

  it('public output exposes only safe columns', async () => {
    const r = await as('anon', null, () => db.query(`select * from public.get_public_testimonials()`))
    expect(Object.keys(r.rows[0] as object).sort()).toEqual(['client_name', 'company_name', 'id', 'project_name', 'rating', 'review_text', 'role', 'submitted_at'])
  })

  it('admin sees all rows, moderation stamps the reviewer, and un-approving hides the review again', async () => {
    const all = await as('authenticated', ADMIN, () => db.query<{ status: string }>(`select status from public.testimonials`))
    expect(all.rows.length).toBeGreaterThanOrEqual(4)

    const rev = await db.query<{ reviewed_by: string }>(`select reviewed_by from public.testimonials where id = $1`, [ids.approvedConsent])
    expect(rev.rows[0].reviewed_by).toBe(ADMIN)

    await as('authenticated', ADMIN, () => db.query(`select public.moderate_review($1, 'pending')`, [ids.approvedConsent]))
    const pub = await as('anon', null, () => db.query(`select 1 from public.get_public_testimonials()`))
    expect(pub.rows).toHaveLength(0)
  })

  it('admin can delete a review; the invitation stays consumed', async () => {
    await as('authenticated', ADMIN, () => db.query(`delete from public.testimonials where id = $1`, [ids.pendingConsent]))
    const left = await db.query(`select 1 from public.testimonials where id = $1`, [ids.pendingConsent])
    expect(left.rows).toHaveLength(0)
    const used = await db.query<{ n: number }>(`select count(*)::int n from public.review_invitations where used_at is not null`)
    expect(used.rows[0].n).toBeGreaterThan(0)
  })
})

describe('rate limiter', () => {
  it('allows up to the limit then blocks within the window', async () => {
    const hit = () => as('service_role', null, async () => (await db.query<{ check_rate_limit: boolean }>(`select public.check_rate_limit('test-bucket', 3, 3600)`)).rows[0].check_rate_limit)
    expect([await hit(), await hit(), await hit(), await hit(), await hit()]).toEqual([true, true, true, false, false])
  })
})
