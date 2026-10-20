/**
 * Review payload validation. This mirrors the server-side rules in
 * `supabase/functions/submit-review` and the `submit_review` SQL function.
 * Client validation is a UX convenience only, the server never trusts it.
 */
export const LIMITS = {
  name: 80,
  company: 100,
  project: 100,
  role: 100,
  reviewMin: 20,
  reviewMax: 2000,
} as const

export type ReviewInput = {
  clientName: string
  companyName: string
  projectName: string
  role: string
  rating: number
  reviewText: string
  consent: boolean
}

export type FieldErrors = Partial<Record<keyof ReviewInput, string>>

/** Strips control characters (except newline/tab), normalises line endings, trims. */
export function sanitizeText(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
}

export function validateReview(input: ReviewInput): { ok: boolean; errors: FieldErrors; clean: ReviewInput } {
  const clean: ReviewInput = {
    clientName: sanitizeText(input.clientName),
    companyName: sanitizeText(input.companyName),
    projectName: sanitizeText(input.projectName),
    role: sanitizeText(input.role),
    rating: Number(input.rating),
    reviewText: sanitizeText(input.reviewText),
    consent: input.consent === true,
  }
  const errors: FieldErrors = {}

  if (!clean.clientName) errors.clientName = 'Please enter your name.'
  else if (clean.clientName.length > LIMITS.name) errors.clientName = `Keep your name under ${LIMITS.name} characters.`

  if (clean.companyName.length > LIMITS.company) errors.companyName = `Keep this under ${LIMITS.company} characters.`
  if (clean.projectName.length > LIMITS.project) errors.projectName = `Keep this under ${LIMITS.project} characters.`
  if (clean.role.length > LIMITS.role) errors.role = `Keep this under ${LIMITS.role} characters.`

  if (!Number.isInteger(clean.rating) || clean.rating < 1 || clean.rating > 5) errors.rating = 'Choose a rating from 1 to 5.'

  if (clean.reviewText.length < LIMITS.reviewMin) errors.reviewText = `Please write at least ${LIMITS.reviewMin} characters.`
  else if (clean.reviewText.length > LIMITS.reviewMax) errors.reviewText = `Please keep your review under ${LIMITS.reviewMax} characters.`

  return { ok: Object.keys(errors).length === 0, errors, clean }
}

/** Invitation tokens are 32 random bytes, base64url-encoded (43 chars). */
export const isPlausibleToken = (t: string) => /^[A-Za-z0-9_-]{32,64}$/.test(t)
