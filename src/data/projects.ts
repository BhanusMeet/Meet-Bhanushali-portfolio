import type { Project } from '@/types'

/**
 * REAL PROJECTS, add yours here. Leave empty to show the polished empty state.
 * Buttons only render when the matching URL exists.
 *
 * Template:
 * {
 *   id: 'my-project',
 *   name: 'Project name',
 *   description: 'One or two honest sentences.',
 *   category: 'Web Development',
 *   stack: ['React', 'TypeScript'],
 *   liveUrl: 'https://…',
 *   repoUrl: 'https://github.com/…',
 *   caseStudy: { challenge: '…', solution: '…', results: '…' },
 * }
 */
export const projects: Project[] = []

/**
 * PLACEHOLDER / SAMPLE DATA, never shown in production. Only visible in
 * `npm run dev` with `?sample=1`, to preview card and modal designs.
 * These entries describe no real work.
 */
export const sampleProjects: Project[] = [
  {
    id: 'sample-web',
    name: 'Sample Project: Web',
    description: 'Placeholder entry used to preview the project card layout. Replace with a real project.',
    category: 'Web Development',
    stack: ['React', 'TypeScript'],
    caseStudy: { challenge: 'Placeholder challenge.', solution: 'Placeholder solution.', results: 'Placeholder results.' },
    placeholder: true,
  },
  {
    id: 'sample-shop',
    name: 'Sample Project: Store',
    description: 'Placeholder entry for an eCommerce build.',
    category: 'eCommerce',
    stack: ['Shopify', 'Liquid'],
    placeholder: true,
  },
  {
    id: 'sample-sec',
    name: 'Sample Project: Lab',
    description: 'Placeholder entry for a security or technical experiment.',
    category: 'Security & Technical Experiments',
    stack: ['Python'],
    placeholder: true,
  },
]

export const projectCategories = [
  'Web Development',
  'eCommerce',
  'Security & Technical Experiments',
  'AI & Automation',
] as const
