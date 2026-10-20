import type { Certificate } from '@/types'

/** Taken directly from the certificate files supplied by the owner (completion certificates, not professional certifications). */
export const certificates: Certificate[] = [
  {
    id: 'bia-cyber',
    title: 'Cyber Security',
    issuer: 'Boston Institute of Analytics',
    detail: 'Core module · 100 hrs · Classroom, Borivali (Mumbai)',
    date: 'Nov 2024',
  },
  {
    id: 'bia-ethical',
    title: 'Ethical Hacking',
    issuer: 'Boston Institute of Analytics',
    detail: 'Core module · 100 hrs · Classroom, Borivali (Mumbai)',
    date: 'Nov 2024',
  },
  {
    id: 'udemy-ads',
    title: 'Ultimate 2025 Google Ads Training: Profit with Pay Per Click',
    issuer: 'Udemy',
    detail: '35.5 hrs · Certificate of completion',
    date: 'Dec 2025',
  },
  {
    id: 'udemy-figma',
    title: 'Figma UI UX Design Essentials',
    issuer: 'Udemy',
    detail: '9.5 hrs · Certificate of completion',
    date: 'Feb 2026',
  },
]
