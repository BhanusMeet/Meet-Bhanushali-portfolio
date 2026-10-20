import type { AdminInvitation, InvitationStatus } from '@/types'

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2025-02' -> 'Feb 2025' */
export function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[(m ?? 1) - 1]} ${y}`
}

/** Number of months since year 0, for timeline positioning. */
export const monthIndex = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-'

export function invitationStatus(inv: Pick<AdminInvitation, 'used_at' | 'revoked_at' | 'expires_at'>): InvitationStatus {
  if (inv.revoked_at) return 'revoked'
  if (inv.used_at) return 'used'
  if (new Date(inv.expires_at).getTime() <= Date.now()) return 'expired'
  return 'pending'
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for non-secure contexts / older browsers.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
