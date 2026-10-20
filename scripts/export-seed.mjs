/**
 * Prints SQL that loads the bundled starter content (src/data/*.ts, src/config/site.ts defaults)
 * into public.site_content. Used once to seed a new Supabase project; safe to re-run only on an
 * empty table. Usage: node scripts/export-seed.mjs > seed.sql
 */
const lit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
const rows = []
const add = (kind, data, position) => rows.push(`('${kind}', ${lit(data)}, ${position})`)

const { experience } = await import('../src/data/experience.ts')
const { skillCategories } = await import('../src/data/skills.ts')
const { hobbies } = await import('../src/data/hobbies.ts')
const { certificates } = await import('../src/data/certificates.ts')
const { projects } = await import('../src/data/projects.ts')

experience.forEach((e, i) =>
  add('experience', { organization: e.organization, role: e.role ?? '', type: e.type ?? '', start: e.start, end: e.end ?? '', current: !!e.current, description: e.description ?? '', technologies: e.technologies ?? [], links: e.links ?? [], achievements: e.achievements ?? [] }, i),
)
skillCategories.forEach((c, i) => add('skill_group', { title: c.title, blurb: c.blurb, skills: c.skills.map((s) => s.name) }, i))
hobbies.forEach((h, i) => add('hobby', { title: h.title, line: h.line, tag: h.tag, icon: h.icon }, i))
certificates.forEach((c, i) => add('certificate', { title: c.title, issuer: c.issuer, detail: c.detail, date: c.date }, i))
projects.forEach((p, i) => add('project', { name: p.name, description: p.description, category: p.category, stack: p.stack, cover: p.cover ?? '', liveUrl: p.liveUrl ?? '', repoUrl: p.repoUrl ?? '', challenge: p.caseStudy?.challenge ?? '', solution: p.caseStudy?.solution ?? '', results: p.caseStudy?.results ?? '' }, i))
add('settings', { email: 'bhanusmeet@gmail.com', instagram: 'https://www.instagram.com/buildwithmeett/', linkedin: 'https://www.linkedin.com/in/meet-bhanushali1326', fiverr: 'https://www.fiverr.com/meet75188' }, 0)

console.log(`insert into public.site_content (kind, data, position) values\n${rows.join(',\n')};`)
