/**
 * Test harness: an in-process Postgres (PGlite) with stand-ins for Supabase's roles and `auth`
 * schema, with every migration in supabase/migrations applied in order.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

export const ADMIN = '00000000-0000-0000-0000-0000000000a1'
export const STRANGER = '00000000-0000-0000-0000-0000000000b2'

export type Role = 'anon' | 'authenticated' | 'service_role'

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    insert into auth.users values ('${ADMIN}', 'admin@example.test'), ('${STRANGER}', 'stranger@example.test');
  `)
  const dir = new URL('../../supabase/migrations/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(f, dir), 'utf8'))
  }
  await db.exec(`insert into public.admin_users (user_id) values ('${ADMIN}')`)
  return db
}

/** Run `fn` as a Supabase-style role (and optional JWT subject), always resetting afterwards. */
export async function runAs<T>(db: PGlite, role: Role, sub: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${sub ?? ''}', false); set role ${role};`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role;')
  }
}
