import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isCurrentUserAdmin } from '@/lib/api'

export type AdminState = 'unconfigured' | 'loading' | 'anonymous' | 'denied' | 'admin'

/**
 * UI-level admin state. This only decides what to RENDER; every admin data operation is
 * independently authorised by the database (RLS + is_admin()) and Edge Functions.
 */
export function useAdminAuth() {
  const [state, setState] = useState<AdminState>(supabase ? 'loading' : 'unconfigured')
  const [session, setSession] = useState<Session | null>(null)
  // The user whose admin status we have already verified. Token refreshes and focus events
  // re-emit auth events for the SAME user; re-checking would flash a spinner and unmount the page.
  const verifiedUser = useRef<string | null>(null)

  const evaluate = useCallback(async (s: Session | null) => {
    setSession(s)
    if (!s) {
      verifiedUser.current = null
      return setState('anonymous')
    }
    if (verifiedUser.current === s.user.id) return
    setState('loading')
    const ok = await isCurrentUserAdmin()
    verifiedUser.current = ok ? s.user.id : null
    setState(ok ? 'admin' : 'denied')
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => evaluate(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return
      // Defer to avoid awaiting Supabase calls inside the auth callback (documented deadlock).
      setTimeout(() => evaluate(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [evaluate])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { state, session, signOut }
}
