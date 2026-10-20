// POST { token, clientName, companyName?, projectName?, role?, rating, reviewText, consent }
//   -> { ok: true } | { ok: false, reason: 'invalid'|'expired'|'used'|'revoked'|'validation' }
//
// Public endpoint (no JWT). Authorisation is the invitation token itself, verified in the database
// by public.submit_review(), which validates + inserts the pending review + consumes the invitation
// in a single transaction. This function NEVER accepts status, timestamps, ids or admin flags.
import { cleanText, clientIp, json, preflight, rateLimit, readJson, serviceClient, sha256Hex, TOKEN_RE } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  const db = serviceClient()

  // Per-IP throttle on all attempts…
  const ipRl = await rateLimit(db, 'submit-ip', clientIp(req), 10, 3600)
  if (ipRl === 'limited') return json(req, { error: 'rate_limited' }, 429)
  if (ipRl === 'unavailable') return json(req, { error: 'unavailable' }, 503)

  const body = await readJson(req, 12_000)
  if (!body) return json(req, { ok: false, reason: 'validation' }, 400)

  const token = typeof body.token === 'string' ? body.token : ''
  if (!TOKEN_RE.test(token)) return json(req, { ok: false, reason: 'invalid' }, 400)
  const tokenHash = await sha256Hex(token)

  // …and a per-invitation throttle so one leaked link can't be hammered from many IPs.
  const tokRl = await rateLimit(db, 'submit-token', tokenHash, 20, 3600)
  if (tokRl === 'limited') return json(req, { error: 'rate_limited' }, 429)
  if (tokRl === 'unavailable') return json(req, { error: 'unavailable' }, 503)

  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof body.consent !== 'boolean') {
    return json(req, { ok: false, reason: 'validation' }, 400)
  }

  const { data, error } = await db.rpc('submit_review', {
    p_token_hash: tokenHash,
    p_client_name: cleanText(body.clientName, 200),
    p_company_name: cleanText(body.companyName, 300),
    p_project_name: cleanText(body.projectName, 300),
    p_role: cleanText(body.role, 300),
    p_rating: rating,
    p_review_text: cleanText(body.reviewText, 5000), // over-length input is rejected by the DB, not silently truncated into validity
    p_consent: body.consent,
  })
  if (error) {
    console.error('submit_review_error', error.code) // never log the payload or token
    return json(req, { ok: false, reason: 'error' }, 500)
  }

  const result = data as { ok: boolean; reason?: string }
  return json(req, result, result.ok ? 200 : result.reason === 'validation' ? 400 : 409)
})
