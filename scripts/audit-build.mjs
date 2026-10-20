/**
 * Post-build audit for the production bundle (run after `npm run build`).
 *  1. Every asset referenced by dist/index.html exists.
 *  2. Every relative asset URL referenced from built CSS/JS exists in dist/.
 *  3. No secret-looking strings ended up in the browser bundle.
 * Exits non-zero on any problem. Never prints matched secret values.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dist = resolve('dist')
const problems = []

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first.')
  process.exit(1)
}

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const files = walk(dist)

// 1. index.html references
const html = readFileSync(join(dist, 'index.html'), 'utf8')
for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
  if (!existsSync(join(dist, m[1]))) problems.push(`index.html references missing file ${m[1]}`)
}

// 2. url(...) in CSS and /assets/... strings in JS
for (const f of files.filter((f) => /\.(css|js)$/.test(f))) {
  const text = readFileSync(f, 'utf8')
  for (const m of text.matchAll(/["'(]\/(assets\/[\w.\-]+\.[a-z0-9]+)/g)) {
    if (!existsSync(join(dist, m[1]))) problems.push(`${f.slice(dist.length + 1)} references missing /${m[1]}`)
  }
}

// 3. secrets. Patterns are for real credentials, not for library code that merely mentions them.
const secretPatterns = [
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/, 'JWT-shaped token'],
  [/sb_secret_[A-Za-z0-9_-]{16,}/, 'Supabase secret key'],
  [/postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/, 'database URL with password'],
  [/SUPABASE_SERVICE_ROLE_KEY/, 'service-role variable name'],
  [/RATE_LIMIT_SALT/, 'server-only variable name'],
]
for (const f of files.filter((f) => /\.(js|css|html|map|json|txt|xml)$/.test(f))) {
  const text = readFileSync(f, 'utf8')
  for (const [re, label] of secretPatterns) if (re.test(text)) problems.push(`${f.slice(dist.length + 1)} contains a ${label}`)
}

if (problems.length) {
  console.error(`Build audit FAILED (${problems.length}):\n - ${problems.join('\n - ')}`)
  process.exit(1)
}
console.log(`Build audit passed: ${files.length} files, asset references resolve, no secrets found.`)
