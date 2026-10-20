import { functionsUrl, publicAnonKey, supabase } from './supabase'
import type { AdminInvitation, AdminReview, PublicTestimonial, ReviewStatus } from '@/types'
import type { ReviewInput } from './validation'
import type { ContentKind, ContentRow } from './content'

/* ───────────────────────── Public ───────────────────────── */

/**
 * Public testimonials come from a SECURITY DEFINER SQL function that re-checks
 * `status = 'approved' AND public_display_consent` inside the database.
 * The browser never queries the testimonials table directly.
 */
export async function fetchPublicTestimonials(): Promise<PublicTestimonial[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_public_testimonials')
  if (error) throw new Error('Could not load testimonials')
  return (data ?? []) as PublicTestimonial[]
}

export type InvitationCheck =
  | { state: 'valid'; clientName: string; projectName: string | null }
  | { state: 'invalid' | 'expired' | 'used' | 'revoked' | 'rate_limited' | 'error' }

async function callPublicFunction(name: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  if (!functionsUrl || !publicAnonKey) throw new Error('not_configured')
  const res = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify(body),
    // Never send the invitation token as a referrer to other origins.
    referrerPolicy: 'no-referrer',
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

export async function checkInvitation(token: string): Promise<InvitationCheck> {
  try {
    const { status, json } = await callPublicFunction('invitation-status', { token })
    if (status === 429) return { state: 'rate_limited' }
    if (json.valid === true) {
      return { state: 'valid', clientName: String(json.clientName ?? ''), projectName: (json.projectName as string | null) ?? null }
    }
    const reason = json.reason
    if (reason === 'expired' || reason === 'used' || reason === 'revoked') return { state: reason }
    return { state: 'invalid' }
  } catch {
    return { state: 'error' }
  }
}

export type SubmitResult = { ok: true } | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'revoked' | 'rate_limited' | 'validation' | 'error' }

export async function submitReview(token: string, input: ReviewInput): Promise<SubmitResult> {
  try {
    const { status, json } = await callPublicFunction('submit-review', {
      token,
      clientName: input.clientName,
      companyName: input.companyName,
      projectName: input.projectName,
      role: input.role,
      rating: input.rating,
      reviewText: input.reviewText,
      consent: input.consent,
    })
    if (status === 429) return { ok: false, reason: 'rate_limited' }
    if (json.ok === true) return { ok: true }
    const reason = json.reason
    if (reason === 'expired' || reason === 'used' || reason === 'revoked' || reason === 'validation') return { ok: false, reason }
    return { ok: false, reason: status >= 500 ? 'error' : 'invalid' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/* ───────────────────────── Admin ───────────────────────── */
// Every call below is authorised in the database (RLS + is_admin()) or in an Edge Function
// that verifies the caller's JWT against the admin allowlist. Hiding routes is cosmetic only.

const need = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await need().rpc('is_admin')
  return !error && data === true
}

const INVITATION_COLUMNS = 'id, client_name, client_email, project_name, created_at, expires_at, used_at, revoked_at'

export async function listInvitations(): Promise<AdminInvitation[]> {
  const { data, error } = await need().from('review_invitations').select(INVITATION_COLUMNS).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminInvitation[]
}

export async function listReviews(): Promise<AdminReview[]> {
  const { data, error } = await need()
    .from('testimonials')
    .select('id, invitation_id, client_name, company_name, project_name, role, rating, review_text, public_display_consent, status, submitted_at, reviewed_at')
    .order('submitted_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminReview[]
}

export async function moderateReview(id: string, status: ReviewStatus): Promise<void> {
  const { error } = await need().rpc('moderate_review', { p_id: id, p_status: status })
  if (error) throw new Error(error.message)
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await need().from('testimonials').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export type CreateInvitationInput = { clientName: string; clientEmail?: string; projectName?: string; expiresInDays: number }

/** Returns the raw token ONCE. Only its SHA-256 hash is stored server-side. */
export async function createInvitation(input: CreateInvitationInput): Promise<{ token: string; expiresAt: string }> {
  const { data, error } = await need().functions.invoke('admin-invitations', { body: { action: 'create', ...input } })
  if (error || !data?.token) throw new Error('Could not create the invitation')
  return { token: data.token as string, expiresAt: data.expiresAt as string }
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error, data } = await need().functions.invoke('admin-invitations', { body: { action: 'revoke', id } })
  if (error || !data?.ok) throw new Error('Could not revoke the invitation')
}

/* ───────────────────────── Site content ───────────────────────── */

/** Public: published rows only (a SECURITY DEFINER function; the table itself is admin-only). */
export async function fetchSiteContent(): Promise<ContentRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_site_content')
  if (error) throw new Error('Could not load site content')
  return (data ?? []) as ContentRow[]
}

const CONTENT_COLUMNS = 'id, kind, data, position, published'

export async function adminListContent(): Promise<ContentRow[]> {
  const { data, error } = await need().from('site_content').select(CONTENT_COLUMNS).order('kind').order('position')
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentRow[]
}

export async function adminSaveContent(row: { id?: string; kind: ContentKind; data: Record<string, unknown>; position: number; published: boolean }): Promise<void> {
  const db = need().from('site_content')
  const { error } = row.id
    ? await db.update({ data: row.data, position: row.position, published: row.published }).eq('id', row.id)
    : await db.insert({ kind: row.kind, data: row.data, position: row.position, published: row.published })
  if (error) throw new Error(error.message)
}

export async function adminDeleteContent(id: string): Promise<void> {
  const { error } = await need().from('site_content').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminSetPositions(updates: { id: string; position: number }[]): Promise<void> {
  const results = await Promise.all(updates.map((u) => need().from('site_content').update({ position: u.position }).eq('id', u.id)))
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}
