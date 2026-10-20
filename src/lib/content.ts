import { buildContactChannels, cleanUrl, defaultContactSettings, type ContactChannel, type ContactSettings } from '@/config/site'
import { certificates as defaultCertificates } from '@/data/certificates'
import { experience as defaultExperience } from '@/data/experience'
import { hobbies as defaultHobbies } from '@/data/hobbies'
import { projects as defaultProjects } from '@/data/projects'
import { skillCategories as defaultSkills } from '@/data/skills'
import { HOBBY_ICONS, type Certificate, type ExperienceEntry, type Hobby, type HobbyIcon, type Project, type ProjectCategory, type SkillCategory } from '@/types'

/* ───────────────────────── Types ───────────────────────── */

export type ContentKind = 'experience' | 'project' | 'skill_group' | 'hobby' | 'certificate' | 'settings'

export type ContentRow = {
  id: string
  kind: ContentKind
  data: Record<string, unknown>
  position: number
  published?: boolean
}

/** Everything the public site renders, either from the database or from the bundled starter data. */
export type SiteContent = {
  experience: ExperienceEntry[]
  skills: SkillCategory[]
  projects: Project[]
  hobbies: Hobby[]
  certificates: Certificate[]
  contact: ContactChannel[]
  /** True when this came from the database rather than the bundled defaults. */
  fromDatabase: boolean
}

export const PROJECT_CATEGORIES: ProjectCategory[] = ['Web Development', 'eCommerce', 'Security & Technical Experiments', 'AI & Automation']
const EXPERIENCE_TYPES = ['Freelance', 'Full-time', 'Part-time', 'Contract', 'Internship'] as const

/* ───────────────────────── Safe parsing ───────────────────────── */
// Rows are written by administrators, but everything is re-validated on the way out so a bad or
// hostile value (for example a javascript: link) can never reach the page.

const str = (v: unknown, max = 400): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v: unknown, max = 40, each = 120): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, each)).filter(Boolean).slice(0, max) : []
const month = (v: unknown): string | undefined => (typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : undefined)
const links = (v: unknown): { label: string; href: string }[] =>
  Array.isArray(v)
    ? v
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>
          const href = cleanUrl(o.href)
          return href ? { label: str(o.label, 80) || href.replace(/^https:\/\//, '').replace(/\/$/, ''), href } : null
        })
        .filter((x): x is { label: string; href: string } => !!x)
        .slice(0, 10)
    : []

export function toExperience(r: ContentRow): ExperienceEntry | null {
  const d = r.data
  const start = month(d.start)
  const organization = str(d.organization, 120)
  if (!organization || !start) return null
  const current = d.current === true
  const type = EXPERIENCE_TYPES.find((t) => t === d.type)
  return {
    id: r.id,
    organization,
    role: str(d.role, 120) || undefined,
    type,
    start,
    end: current ? undefined : month(d.end) ?? start,
    current,
    description: str(d.description, 1500) || undefined,
    technologies: list(d.technologies, 20, 40),
    achievements: list(d.achievements, 12, 200),
    links: links(d.links),
  }
}

export function toProject(r: ContentRow): Project | null {
  const d = r.data
  const name = str(d.name, 120)
  if (!name) return null
  const category = PROJECT_CATEGORIES.find((c) => c === d.category) ?? 'Web Development'
  const challenge = str(d.challenge, 1500)
  const solution = str(d.solution, 1500)
  const results = str(d.results, 1500)
  return {
    id: r.id,
    name,
    description: str(d.description, 600),
    category,
    stack: list(d.stack, 20, 40),
    cover: cleanUrl(d.cover),
    liveUrl: cleanUrl(d.liveUrl),
    repoUrl: cleanUrl(d.repoUrl),
    caseStudy: challenge || solution || results ? { challenge: challenge || undefined, solution: solution || undefined, results: results || undefined } : undefined,
  }
}

export function toSkillGroup(r: ContentRow): SkillCategory | null {
  const title = str(r.data.title, 80)
  if (!title) return null
  return { id: r.id, title, blurb: str(r.data.blurb, 200), icon: 'code', skills: list(r.data.skills, 30, 60).map((name) => ({ name })) }
}

export function toHobby(r: ContentRow): Hobby | null {
  const title = str(r.data.title, 60)
  if (!title) return null
  const icon: HobbyIcon = (HOBBY_ICONS as readonly string[]).includes(r.data.icon as string) ? (r.data.icon as HobbyIcon) : 'trophy'
  return { id: r.id, title, line: str(r.data.line, 300), tag: str(r.data.tag, 80), icon }
}

export function toCertificate(r: ContentRow): Certificate | null {
  const title = str(r.data.title, 160)
  if (!title) return null
  return { id: r.id, title, issuer: str(r.data.issuer, 120), detail: str(r.data.detail, 200), date: str(r.data.date, 40) }
}

/* ───────────────────────── Assembling the site ───────────────────────── */

const pick = <T>(rows: ContentRow[], kind: ContentKind, map: (r: ContentRow) => T | null): T[] =>
  rows
    .filter((r) => r.kind === kind)
    .sort((a, b) => a.position - b.position)
    .map(map)
    .filter((x): x is T => x !== null)

export const defaultContent: SiteContent = {
  experience: defaultExperience,
  skills: defaultSkills,
  projects: defaultProjects,
  hobbies: defaultHobbies,
  certificates: defaultCertificates,
  contact: buildContactChannels(defaultContactSettings),
  fromDatabase: false,
}

/**
 * With no rows at all (empty or unreachable database) the bundled starter content is used.
 * Once the database has content it is authoritative: deleting every project in the admin
 * really shows no projects, instead of silently bringing back the starter data.
 */
export function buildContent(rows: ContentRow[] | null): SiteContent {
  if (!rows || rows.length === 0) return defaultContent
  const settingsRow = rows.find((r) => r.kind === 'settings')
  const s = (settingsRow?.data ?? {}) as ContactSettings
  return {
    experience: pick(rows, 'experience', toExperience),
    skills: pick(rows, 'skill_group', toSkillGroup),
    projects: pick(rows, 'project', toProject),
    hobbies: pick(rows, 'hobby', toHobby),
    certificates: pick(rows, 'certificate', toCertificate),
    contact: buildContactChannels(settingsRow ? s : defaultContactSettings),
    fromDatabase: true,
  }
}

/* ───────────────────────── Admin editor definitions ───────────────────────── */

export type FieldType = 'text' | 'textarea' | 'select' | 'month' | 'checkbox' | 'url' | 'email' | 'tags' | 'lines' | 'links'

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  help?: string
  placeholder?: string
  options?: readonly string[]
  max?: number
  /** Only shown when this checkbox field is false (for example, "End month" when "Currently here" is on). */
  hideWhen?: string
}

export type KindDef = {
  kind: ContentKind
  tab: string
  singular: string
  help: string
  fields: FieldDef[]
  /** What to show as the row title / subtitle in the list. */
  title: (d: Record<string, unknown>) => string
  subtitle?: (d: Record<string, unknown>) => string
}

const s = (v: unknown) => (typeof v === 'string' ? v : '')

export const KINDS: KindDef[] = [
  {
    kind: 'experience',
    tab: 'Work & clients',
    singular: 'work entry',
    help: 'Every entry appears in the Work timeline automatically, ordered by start date. Add each new client or job here.',
    title: (d) => s(d.organization) || 'Untitled',
    subtitle: (d) => [s(d.role), s(d.start) && `${s(d.start)} to ${d.current ? 'now' : s(d.end) || s(d.start)}`].filter(Boolean).join(' · '),
    fields: [
      { key: 'organization', label: 'Client or company', type: 'text', required: true, max: 120 },
      { key: 'role', label: 'Your role', type: 'text', max: 120, placeholder: 'e.g. Full Stack Web Developer' },
      { key: 'type', label: 'Type', type: 'select', options: ['', ...EXPERIENCE_TYPES] },
      { key: 'start', label: 'Start month', type: 'month', required: true },
      { key: 'current', label: 'I currently work here', type: 'checkbox' },
      { key: 'end', label: 'End month', type: 'month', hideWhen: 'current', help: 'Leave the same as the start month for a one-month engagement.' },
      { key: 'description', label: 'What you did', type: 'textarea', max: 1500 },
      { key: 'technologies', label: 'Tools and technologies', type: 'tags', help: 'Separate with commas, e.g. Shopify, Google Ads' },
      { key: 'achievements', label: 'Highlights (real results only)', type: 'lines', help: 'One per line. Leave empty if you have nothing measurable to claim.' },
      { key: 'links', label: 'Websites you built or managed', type: 'links' },
    ],
  },
  {
    kind: 'project',
    tab: 'Projects',
    singular: 'project',
    help: 'Projects appear in the Projects section. The buttons (live site, source, case study) only show when you fill them in.',
    title: (d) => s(d.name) || 'Untitled',
    subtitle: (d) => s(d.category),
    fields: [
      { key: 'name', label: 'Project name', type: 'text', required: true, max: 120 },
      { key: 'category', label: 'Category', type: 'select', options: PROJECT_CATEGORIES, required: true },
      { key: 'description', label: 'Short description', type: 'textarea', max: 600 },
      { key: 'stack', label: 'Tech stack', type: 'tags', help: 'Separate with commas' },
      { key: 'liveUrl', label: 'Live website link', type: 'url' },
      { key: 'repoUrl', label: 'Source code link', type: 'url' },
      { key: 'cover', label: 'Cover image link', type: 'url', help: 'A direct https link to an image.' },
      { key: 'challenge', label: 'Case study: the challenge', type: 'textarea', max: 1500 },
      { key: 'solution', label: 'Case study: the solution', type: 'textarea', max: 1500 },
      { key: 'results', label: 'Case study: the results (real numbers only)', type: 'textarea', max: 1500 },
    ],
  },
  {
    kind: 'skill_group',
    tab: 'Skills',
    singular: 'skill group',
    help: 'Groups of skills shown in the Skills section.',
    title: (d) => s(d.title) || 'Untitled',
    subtitle: (d) => (Array.isArray(d.skills) ? `${d.skills.length} skills` : ''),
    fields: [
      { key: 'title', label: 'Group name', type: 'text', required: true, max: 80 },
      { key: 'blurb', label: 'One-line description', type: 'text', max: 200 },
      { key: 'skills', label: 'Skills', type: 'tags', required: true, help: 'Separate with commas' },
    ],
  },
  {
    kind: 'hobby',
    tab: 'Hobbies',
    singular: 'hobby',
    help: 'Cards in the "Off the keyboard" section. With more than six, the section switches to a normal grid.',
    title: (d) => s(d.title) || 'Untitled',
    subtitle: (d) => s(d.tag),
    fields: [
      { key: 'title', label: 'Hobby', type: 'text', required: true, max: 60 },
      { key: 'line', label: 'Funny one-liner', type: 'textarea', max: 300 },
      { key: 'tag', label: 'Small code-style tag', type: 'text', max: 80, placeholder: 'e.g. depends_on: mood' },
      { key: 'icon', label: 'Icon', type: 'select', options: HOBBY_ICONS },
    ],
  },
  {
    kind: 'certificate',
    tab: 'Certificates',
    singular: 'certificate',
    help: 'Training and certificates of completion shown under Skills. Only add ones you actually completed.',
    title: (d) => s(d.title) || 'Untitled',
    subtitle: (d) => [s(d.issuer), s(d.date)].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Course or certificate', type: 'text', required: true, max: 160 },
      { key: 'issuer', label: 'Issued by', type: 'text', max: 120 },
      { key: 'date', label: 'Date', type: 'text', max: 40, placeholder: 'e.g. Feb 2026' },
      { key: 'detail', label: 'Details', type: 'text', max: 200, placeholder: 'e.g. 9.5 hrs · Certificate of completion' },
    ],
  },
  {
    kind: 'settings',
    tab: 'Contact links',
    singular: 'contact links',
    help: 'Used by the Contact section and the footer. A link you leave empty is simply hidden.',
    title: () => 'Contact links',
    fields: [
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'instagram', label: 'Instagram link', type: 'url' },
      { key: 'linkedin', label: 'LinkedIn link', type: 'url' },
      { key: 'fiverr', label: 'Fiverr link', type: 'url' },
    ],
  },
]

export const kindDef = (k: ContentKind) => KINDS.find((d) => d.kind === k)!

/** Validates editor values against the field definitions. Returns per-field error messages. */
export function validateValues(kind: ContentKind, values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of kindDef(kind).fields) {
    if (f.hideWhen && values[f.hideWhen] === true) continue
    const v = values[f.key]
    const text = typeof v === 'string' ? v.trim() : ''
    const empty = f.type === 'tags' || f.type === 'lines' ? !Array.isArray(v) || v.length === 0 : f.type === 'links' ? !Array.isArray(v) || v.length === 0 : f.type === 'checkbox' ? false : !text
    if (f.required && empty) errors[f.key] = 'This field is required.'
    else if (!empty) {
      if (f.max && text.length > f.max) errors[f.key] = `Keep this under ${f.max} characters.`
      if (f.type === 'url' && !cleanUrl(text)) errors[f.key] = 'Enter a full link starting with https://'
      if (f.type === 'email' && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text)) errors[f.key] = 'Enter a valid email address.'
      if (f.type === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) errors[f.key] = 'Choose a month.'
      if (f.type === 'links' && Array.isArray(v) && v.some((l) => !cleanUrl((l as { href?: string }).href))) errors[f.key] = 'Every link must start with https://'
    }
  }
  if (kind === 'experience' && values.current !== true && typeof values.start === 'string' && typeof values.end === 'string' && values.end && values.end < values.start) {
    errors.end = 'The end month cannot be before the start month.'
  }
  return errors
}
