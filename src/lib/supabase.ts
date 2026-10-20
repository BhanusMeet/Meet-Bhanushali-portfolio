import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabaseEnv'

export { isSupabaseConfigured }

// Only the public URL and the anon/publishable key are ever used in the browser.
// Privileged work happens in Edge Functions with the service-role key (server-side only).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const functionsUrl = isSupabaseConfigured ? `${supabaseUrl!.replace(/\/$/, '')}/functions/v1` : null
export const publicAnonKey = supabaseAnonKey
