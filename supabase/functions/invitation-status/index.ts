// POST { token } -> { valid: true, clientName, projectName } | { valid: false, reason }
// Public endpoint (no JWT) used by /review/:token to decide whether to show the form.
// Rate limited per client IP. Reveals nothing about private data (no email, no ids).
import { clientIp, json, preflight, rateLimit, readJson, serviceClient, sha256Hex, TOKEN_RE } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const db = serviceClient()

  const rl = await rateLimit(db, 'inv-status', clientIp(req), 30, 600)
  if (rl === 'limited') return json(req, { error: 'rate_limited' }, 429)
  if (rl === 'unavailable') return json(req, { error: 'unavailable' }, 503)

  const body = await readJson(req, 2_048)
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!TOKEN_RE.test(token)) return json(req, { valid: false, reason: 'invalid' })

  const { data, error } = await db.rpc('get_invitation_status', { p_token_hash: await sha256Hex(token) })
  if (error) {
    console.error('invitation_status_error', error.code)
    return json(req, { error: 'unavailable' }, 503)
  }
  return json(req, data)
})
