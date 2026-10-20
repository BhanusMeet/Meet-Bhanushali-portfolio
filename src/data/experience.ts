import type { ExperienceEntry } from '@/types'

/**
 * Details below come from the owner. Anything not set (role, achievements) renders
 * as "to be added". Nothing is invented: add results only when they are real.
 */
export const experience: ExperienceEntry[] = [
  {
    id: 'vintage-recipes',
    organization: 'Vintage Recipes',
    start: '2025-02',
    end: '2026-04',
    description: 'End-to-end eCommerce development on Shopify, Amazon seller account management, and AI-generated content.',
    technologies: ['Shopify', 'Amazon Seller', 'AI content'],
    links: [{ label: 'vintagerecipes.in', href: 'https://vintagerecipes.in/' }],
  },
  {
    id: 'motilal-masalawala',
    organization: 'Motilal Masalawala',
    start: '2025-11',
    end: '2026-03',
    description: 'End-to-end eCommerce development on Shopify, plus Google Ads.',
    technologies: ['Shopify', 'Google Ads'],
    links: [{ label: 'motilalmasala.com', href: 'https://motilalmasala.com/' }],
  },
  {
    id: 'nidhi-enterprises',
    organization: 'Nidhi Enterprises',
    type: 'Freelance',
    start: '2026-05',
    end: '2026-05',
    description: 'AI automation and end-to-end eCommerce development on Shopify, with AI-generated content.',
    technologies: ['Shopify', 'AI automation', 'AI content'],
    links: [
      { label: 'thepeppystore.in', href: 'https://thepeppystore.in/' },
      { label: 'crazygifts.in', href: 'https://crazygifts.in/' },
    ],
  },
  {
    id: 'esn',
    organization: 'ESN',
    role: 'Full Stack Web Developer',
    start: '2026-08',
    current: true,
    links: [
      { label: 'ssnelite.com', href: 'https://ssnelite.com/' },
      { label: 'ssngold.com', href: 'https://ssngold.com/' },
      { label: 'realonenutrition.com', href: 'https://realonenutrition.com/' },
    ],
  },
]
