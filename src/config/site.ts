/**
 * Central, editable site configuration.
 * Contact URLs come from environment variables so no personal details are
 * hard-coded. Unset values are hidden in production and shown as dev hints.
 */
const env = import.meta.env

export const site = {
  name: 'Meet Bhanushali',
  tagline: 'Websites, eCommerce and intelligent digital systems, built with a security-first mindset.',
} as const

export type ContactChannel = {
  id: 'email' | 'instagram' | 'linkedin' | 'fiverr'
  label: string
  /** Resolved href, or undefined when not configured. */
  href?: string
  display?: string
  envKey: string
}

// Public contact details. Environment variables override these defaults.
const DEFAULTS = {
  email: 'bhanusmeet@gmail.com',
  instagram: 'https://www.instagram.com/buildwithmeett/',
  linkedin: 'https://www.linkedin.com/in/meet-bhanushali1326',
  fiverr: 'https://www.fiverr.com/meet75188',
}

const emailRaw = ((env.VITE_CONTACT_EMAIL as string | undefined)?.trim()) || DEFAULTS.email
// Minimal sanity check so a typo can never produce a broken mailto: link.
export const contactEmail = emailRaw && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(emailRaw) ? emailRaw : undefined

const cleanUrl = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : ''
  // Only ever render https URLs, never javascript: or data: schemes.
  return /^https:\/\//i.test(s) ? s : undefined
}

export const contactChannels: ContactChannel[] = [
  { id: 'email', label: 'Email', href: contactEmail ? `mailto:${contactEmail}` : undefined, display: contactEmail, envKey: 'VITE_CONTACT_EMAIL' },
  { id: 'instagram', label: 'Instagram', href: cleanUrl(env.VITE_INSTAGRAM_URL || DEFAULTS.instagram), envKey: 'VITE_INSTAGRAM_URL' },
  { id: 'linkedin', label: 'LinkedIn', href: cleanUrl(env.VITE_LINKEDIN_URL || DEFAULTS.linkedin), envKey: 'VITE_LINKEDIN_URL' },
  { id: 'fiverr', label: 'Fiverr', href: cleanUrl(env.VITE_FIVERR_URL || DEFAULTS.fiverr), envKey: 'VITE_FIVERR_URL' },
]

export const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
] as const

/** Show placeholder projects (dev preview only: add ?sample=1 to the URL). */
export const showSampleProjects =
  import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sample')
