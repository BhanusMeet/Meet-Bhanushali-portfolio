import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** True only when both public values are present. The UI degrades gracefully otherwise. */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Only the public URL and the anon/publishable key are ever used in the browser.
// Privileged work happens in Edge Functions with the service-role key (server-side only).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const functionsUrl = isSupabaseConfigured ? `${url!.replace(/\/$/, '')}/functions/v1` : null
export const publicAnonKey = anonKey
