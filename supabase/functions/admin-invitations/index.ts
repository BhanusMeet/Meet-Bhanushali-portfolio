// POST { action: 'create', clientName, clientEmail?, projectName?, expiresInDays }
//        -> { token, expiresAt }   (raw token returned ONCE; only its SHA-256 hash is stored)
// POST { action: 'revoke', id } -> { ok: true }
//
// Admin-only. Authorisation is enforced HERE, server-side:
//   1. the caller's JWT is verified by Supabase Auth,
//   2. the user must exist in public.admin_users (checked via is_admin() as that user).
// Hiding the admin UI is cosmetic; this check is the real gate.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cleanText, generateToken, json, preflight, rateLimit, readJson, serviceClient, sha256Hex } from '../_shared/http.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json(req, { error: 'unauthorized' }, 401)

  // Act as the caller to verify identity and admin membership.
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json(req, { error: 'unauthorized' }, 401)

  const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
  if (adminErr || isAdmin !== true) return json(req, { error: 'forbidden' }, 403)

  const db = serviceClient()
  const limited = await rateLimit(db, 'admin-inv', userData.user.id, 60, 3600)
  if (limited !== 'ok') return json(req, { error: limited === 'limited' ? 'rate_limited' : 'unavailable' }, limited === 'limited' ? 429 : 503)

  const body = await readJson(req, 4_096)
  if (!body) return json(req, { error: 'bad_request' }, 400)

  if (body.action === 'create') {
    const clientName = cleanText(body.clientName, 80)
    const clientEmail = cleanText(body.clientEmail, 254)
    const projectName = cleanText(body.projectName, 100)
    const days = Number(body.expiresInDays)
    if (!clientName || (clientEmail && !EMAIL_RE.test(clientEmail)) || !Number.isInteger(days) || days < 1 || days > 30) {
      return json(req, { error: 'bad_request' }, 400)
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString()
    const { error } = await db.from('review_invitations').insert({
      token_hash: await sha256Hex(token),
      client_name: clientName,
      client_email: clientEmail || null,
      project_name: projectName || null,
      created_by: userData.user.id,
      expires_at: expiresAt,
    })
    if (error) {
      console.error('create_invitation_error', error.code)
      return json(req, { error: 'server_error' }, 500)
    }
    return json(req, { token, expiresAt })
  }

  if (body.action === 'revoke') {
    const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null
    if (!id) return json(req, { error: 'bad_request' }, 400)
    const { error } = await db
      .from('review_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('used_at', null)
      .is('revoked_at', null)
    if (error) {
      console.error('revoke_invitation_error', error.code)
      return json(req, { error: 'server_error' }, 500)
    }
    return json(req, { ok: true })
  }

  return json(req, { error: 'bad_request' }, 400)
})
