// Shared helpers for Edge Functions (Deno runtime).
// SECURITY NOTES
//  - SUPABASE_SERVICE_ROLE_KEY is read from the function's environment only. It never reaches the browser.
//  - Nothing here logs request bodies, tokens or review text, only event names and error codes.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const csv = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

/**
 * Origins allowed to call these functions from a browser.
 * Set ALLOWED_ORIGINS (comma-separated) or PUBLIC_SITE_URL as Edge Function secrets to add your
 * production domain. Without them, only local development and this project's own Vercel URLs
 * (production and previews) are allowed. CORS is a browser-side convenience, not the security
 * boundary: every endpoint is still protected by its token / JWT and rate limits.
 */
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const VERCEL_ORIGIN = /^https:\/\/meet-bhanushali-portfolio(-[a-z0-9-]+)?\.vercel\.app$/

function originAllowed(origin: string): boolean {
  const configured = [...csv(Deno.env.get('ALLOWED_ORIGINS')), ...csv(Deno.env.get('PUBLIC_SITE_URL'))].map((o) => o.replace(/\/$/, ''))
  return configured.includes(origin) || DEV_ORIGINS.includes(origin) || VERCEL_ORIGIN.test(origin)
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
  // Reflect only explicitly allowed origins. Anything else gets no CORS headers (browser blocks it).
  if (origin && originAllowed(origin)) h['Access-Control-Allow-Origin'] = origin
  return h
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders(req) }) : null
}

/** Reads a JSON body with a hard size cap. Returns null on any problem. */
export async function readJson(req: Request, maxBytes = 16_384): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text()
    if (text.length > maxBytes) return null
    const v = JSON.parse(text)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export const serviceClient = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/

/** 32 bytes from the platform CSPRNG, base64url-encoded (43 chars, 256 bits of entropy). */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

/**
 * Database-backed fixed-window rate limit. The bucket key is a salted hash, so raw IPs are never stored.
 * Returns 'ok' | 'limited' | 'unavailable' (fail closed if the limiter itself errors).
 */
export async function rateLimit(
  db: SupabaseClient,
  action: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<'ok' | 'limited' | 'unavailable'> {
  // Prefer an explicit RATE_LIMIT_SALT secret; otherwise derive from the (secret) service key.
  const salt = Deno.env.get('RATE_LIMIT_SALT') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const bucket = `${action}:${await sha256Hex(`${salt}:${identity}`)}`
  const { data, error } = await db.rpc('check_rate_limit', { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds })
  if (error) {
    console.error('rate_limit_error', action, error.code)
    return 'unavailable'
  }
  return data === true ? 'ok' : 'limited'
}

/** Strip control chars (except \n, \t incl. NUL), normalise newlines, trim. Mirrors public.clean_text in SQL. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  // deno-lint-ignore no-control-regex
  return v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}
