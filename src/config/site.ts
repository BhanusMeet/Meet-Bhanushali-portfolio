/**
 * Static site configuration. Contact links are editable from /admin/content; the values here are
 * only the starter defaults shown until (or without) the database.
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

export type ContactSettings = { email?: string; instagram?: string; linkedin?: string; fiverr?: string }

/** Minimal sanity check so a typo can never produce a broken mailto: link. */
export const cleanEmail = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s) && s.length <= 254 ? s : undefined
}

/** Only ever render https URLs, never javascript: or data: schemes. */
export const cleanUrl = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^https:\/\/[^\s]+$/i.test(s) && s.length <= 500 ? s : undefined
}

/** Starter values (used until the editable settings load). Environment variables override them. */
export const defaultContactSettings: ContactSettings = {
  email: (env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || 'bhanusmeet@gmail.com',
  instagram: (env.VITE_INSTAGRAM_URL as string | undefined) || 'https://www.instagram.com/buildwithmeett/',
  linkedin: (env.VITE_LINKEDIN_URL as string | undefined) || 'https://www.linkedin.com/in/meet-bhanushali1326',
  fiverr: (env.VITE_FIVERR_URL as string | undefined) || 'https://www.fiverr.com/meet75188',
}

export function buildContactChannels(s: ContactSettings): ContactChannel[] {
  const email = cleanEmail(s.email)
  return [
    { id: 'email', label: 'Email', href: email ? `mailto:${email}` : undefined, display: email, envKey: 'Contact links > Email' },
    { id: 'instagram', label: 'Instagram', href: cleanUrl(s.instagram), envKey: 'Contact links > Instagram' },
    { id: 'linkedin', label: 'LinkedIn', href: cleanUrl(s.linkedin), envKey: 'Contact links > LinkedIn' },
    { id: 'fiverr', label: 'Fiverr', href: cleanUrl(s.fiverr), envKey: 'Contact links > Fiverr' },
  ]
}

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
