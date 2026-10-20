import type { SkillCategory } from '@/types'

export const skillCategories: SkillCategory[] = [
  {
    id: 'development',
    title: 'Development',
    blurb: 'Languages used to build and ship for the web and beyond.',
    icon: 'code',
    skills: [{ name: 'HTML' }, { name: 'CSS' }, { name: 'JavaScript' }, { name: 'PHP' }, { name: 'Python' }, { name: 'Java' }],
  },
  {
    id: 'ecommerce',
    title: 'eCommerce & CMS',
    blurb: 'Storefronts and content platforms that turn visitors into customers.',
    icon: 'cart',
    skills: [{ name: 'Shopify Development' }, { name: 'WordPress' }, { name: 'WooCommerce' }, { name: 'Wix' }],
  },
  {
    id: 'infrastructure',
    title: 'Hosting & Infrastructure',
    blurb: 'Getting sites online, reachable and maintained.',
    icon: 'server',
    skills: [{ name: 'Hostinger' }, { name: 'Website Deployment' }, { name: 'Hosting and Domain Management' }],
  },
  {
    id: 'ai',
    title: 'AI & Automation',
    blurb: 'Using AI tooling to move faster without cutting corners.',
    icon: 'sparkles',
    skills: [{ name: 'AI Content Creation' }, { name: 'AI-Assisted Workflows' }],
  },
  {
    id: 'security',
    title: 'Security',
    blurb: 'A security-first approach to how things are built.',
    icon: 'shield',
    // Specific tools, frameworks and advanced capabilities stay out until confirmed by the owner.
    skills: [{ name: 'Cybersecurity' }, { name: 'Security Fundamentals' }, { name: 'Security-Conscious Web Development' }],
  },
]
