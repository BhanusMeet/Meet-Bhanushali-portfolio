export type ExperienceEntry = {
  id: string
  organization: string
  /** Placeholder until the owner supplies a real title. */
  role?: string
  type?: 'Freelance' | 'Full-time' | 'Part-time' | 'Contract' | 'Internship'
  /** ISO year-month, e.g. '2025-02'. */
  start: string
  /** ISO year-month, or undefined when current. */
  end?: string
  current?: boolean
  description?: string
  achievements?: string[]
  technologies?: string[]
  links?: { label: string; href: string }[]
}

export type SkillCategory = {
  id: string
  title: string
  blurb: string
  icon: 'code' | 'cart' | 'server' | 'sparkles' | 'shield'
  skills: { name: string; note?: string }[]
}

type ProjectCategory =
  | 'Web Development'
  | 'eCommerce'
  | 'Security & Technical Experiments'
  | 'AI & Automation'

export type Project = {
  id: string
  name: string
  description: string
  category: ProjectCategory
  stack: string[]
  /** Optional cover image path (served from /public). */
  cover?: string
  liveUrl?: string
  repoUrl?: string
  caseStudy?: { challenge?: string; solution?: string; results?: string }
  /** Marks sample data. Placeholder entries are hidden unless explicitly enabled. */
  placeholder?: boolean
}

export type Hobby = {
  id: string
  title: string
  line: string
  /** Short terminal-style aside shown under the line. */
  tag: string
  icon: 'cooking' | 'chess' | 'garba' | 'gaming' | 'badminton' | 'martial'
}

export type Certificate = {
  id: string
  title: string
  issuer: string
  detail: string
  date: string
}

export type PublicTestimonial = {
  id: string
  client_name: string
  company_name: string | null
  project_name: string | null
  role: string | null
  rating: number
  review_text: string
  submitted_at: string
}

export type InvitationStatus = 'pending' | 'used' | 'expired' | 'revoked'

export type AdminInvitation = {
  id: string
  client_name: string
  client_email: string | null
  project_name: string | null
  created_at: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type AdminReview = {
  id: string
  invitation_id: string
  client_name: string
  company_name: string | null
  project_name: string | null
  role: string | null
  rating: number
  review_text: string
  public_display_consent: boolean
  status: ReviewStatus
  submitted_at: string
  reviewed_at: string | null
}
