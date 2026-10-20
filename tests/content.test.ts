import { describe, expect, it } from 'vitest'
import { buildContent, defaultContent, toExperience, toHobby, toProject, validateValues, type ContentRow } from '../src/lib/content'

const row = (kind: ContentRow['kind'], data: Record<string, unknown>, position = 0): ContentRow => ({ id: `${kind}-${position}`, kind, data, position })

describe('content parsing is defensive', () => {
  it('drops unsafe links (javascript:, data:, http:) from work entries and keeps https ones', () => {
    const e = toExperience(
      row('experience', {
        organization: 'Acme',
        start: '2026-01',
        links: [
          { label: 'bad', href: 'javascript:alert(1)' },
          { label: 'bad2', href: 'data:text/html,<script>1</script>' },
          { label: 'plain http', href: 'http://example.com' },
          { label: 'good', href: 'https://example.com/' },
        ],
      }),
    )
    expect(e?.links).toEqual([{ label: 'good', href: 'https://example.com/' }])
  })

  it('rejects work entries without an organisation or a valid start month', () => {
    expect(toExperience(row('experience', { organization: 'X', start: 'soon' }))).toBeNull()
    expect(toExperience(row('experience', { organization: '', start: '2026-01' }))).toBeNull()
  })

  it('a current job has no end month; a missing end defaults to the start month', () => {
    expect(toExperience(row('experience', { organization: 'A', start: '2026-01', current: true, end: '2026-02' }))?.end).toBeUndefined()
    expect(toExperience(row('experience', { organization: 'A', start: '2026-03' }))?.end).toBe('2026-03')
  })

  it('projects only keep https URLs and fall back to a known category', () => {
    const p = toProject(row('project', { name: 'P', category: 'Hacking', cover: 'javascript:x', liveUrl: 'https://a.example', repoUrl: 'ftp://nope' }))
    expect(p?.category).toBe('Web Development')
    expect(p?.cover).toBeUndefined()
    expect(p?.liveUrl).toBe('https://a.example')
    expect(p?.repoUrl).toBeUndefined()
  })

  it('an unknown hobby icon falls back to a safe default; oversized text is truncated', () => {
    const h = toHobby(row('hobby', { title: 'x'.repeat(500), icon: '<script>' }))
    expect(h?.icon).toBe('trophy')
    expect(h?.title.length).toBeLessThanOrEqual(60)
  })
})

describe('building the site from database rows', () => {
  it('uses the bundled starter content when there are no rows', () => {
    expect(buildContent(null)).toBe(defaultContent)
    expect(buildContent([])).toBe(defaultContent)
  })

  it('treats the database as authoritative once it has content (no resurrected defaults)', () => {
    const c = buildContent([row('hobby', { title: 'Chess', icon: 'chess' })])
    expect(c.fromDatabase).toBe(true)
    expect(c.hobbies).toHaveLength(1)
    expect(c.projects).toHaveLength(0)
    expect(c.experience).toHaveLength(0)
  })

  it('orders items by position', () => {
    const c = buildContent([row('hobby', { title: 'B' }, 2), row('hobby', { title: 'A' }, 1)])
    expect(c.hobbies.map((h) => h.title)).toEqual(['A', 'B'])
  })

  it('builds contact links from settings and hides invalid or empty ones', () => {
    const c = buildContent([row('settings', { email: 'me@example.com', instagram: 'javascript:alert(1)', linkedin: 'https://linkedin.com/in/x', fiverr: '' })])
    const by = Object.fromEntries(c.contact.map((x) => [x.id, x.href]))
    expect(by.email).toBe('mailto:me@example.com')
    expect(by.instagram).toBeUndefined()
    expect(by.linkedin).toBe('https://linkedin.com/in/x')
    expect(by.fiverr).toBeUndefined()
  })
})

describe('admin form validation', () => {
  it('requires the essentials and enforces https links', () => {
    const e = validateValues('experience', { organization: '', start: '', current: false, end: '', links: [{ label: 'x', href: 'http://insecure.example' }] })
    expect(e.organization).toBeTruthy()
    expect(e.start).toBeTruthy()
    expect(e.links).toBeTruthy()
  })

  it('rejects an end month before the start month, but not for a current job', () => {
    expect(validateValues('experience', { organization: 'A', start: '2026-05', end: '2026-01', current: false, links: [] }).end).toBeTruthy()
    expect(validateValues('experience', { organization: 'A', start: '2026-05', end: '', current: true, links: [] }).end).toBeUndefined()
  })

  it('accepts a complete valid project', () => {
    expect(validateValues('project', { name: 'Shop', category: 'eCommerce', stack: ['Shopify'], liveUrl: 'https://shop.example', repoUrl: '', cover: '' })).toEqual({})
  })

  it('validates contact settings', () => {
    const e = validateValues('settings', { email: 'not-an-email', instagram: 'instagram.com/me' })
    expect(e.email).toBeTruthy()
    expect(e.instagram).toBeTruthy()
  })
})
