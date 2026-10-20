import { describe, expect, it } from 'vitest'
import { isPlausibleToken, sanitizeText, validateReview, LIMITS, type ReviewInput } from '../src/lib/validation'

const ok: ReviewInput = { clientName: 'Jane', companyName: '', projectName: '', role: '', rating: 5, reviewText: 'x'.repeat(LIMITS.reviewMin), consent: true }

describe('client-side review validation (UX only; server re-validates)', () => {
  it('accepts a valid review', () => expect(validateReview(ok).ok).toBe(true))
  it('requires name, rating 1-5 and a long-enough review', () => {
    expect(validateReview({ ...ok, clientName: ' ' }).errors.clientName).toBeTruthy()
    expect(validateReview({ ...ok, rating: 0 }).errors.rating).toBeTruthy()
    expect(validateReview({ ...ok, rating: 6 }).errors.rating).toBeTruthy()
    expect(validateReview({ ...ok, rating: 4.5 }).errors.rating).toBeTruthy()
    expect(validateReview({ ...ok, reviewText: 'short' }).errors.reviewText).toBeTruthy()
    expect(validateReview({ ...ok, reviewText: 'x'.repeat(LIMITS.reviewMax + 1) }).errors.reviewText).toBeTruthy()
  })
  it('strips control characters and trims', () => {
    expect(sanitizeText('  hi\u0000\u0007 there\r\n ')).toBe('hi there')
    expect(validateReview({ ...ok, clientName: ' Jane\u0007 ' }).clean.clientName).toBe('Jane')
  })
  it('treats consent as strictly boolean', () => {
    expect(validateReview({ ...ok, consent: 'yes' as unknown as boolean }).clean.consent).toBe(false)
  })
  it('recognises plausible tokens only', () => {
    expect(isPlausibleToken('A'.repeat(43))).toBe(true)
    expect(isPlausibleToken('short')).toBe(false)
    expect(isPlausibleToken('../../etc/passwd' + 'a'.repeat(30))).toBe(false)
  })
})
