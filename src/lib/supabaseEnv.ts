/** Public Supabase settings. Kept free of any SDK import so the public page can check them cheaply. */
export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** True only when both public values are present. The UI degrades gracefully otherwise. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
