import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { isCurrentUserAdmin } from '@/lib/api'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/Button'
import { Unconfigured } from '@/components/admin/AdminLayout'

export default function AdminLogin() {
  usePageMeta('Sign in · Meet Bhanushali', { noindex: true })
  const { state } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!supabase) return <main className="container-x py-24"><Unconfigured /></main>
  if (state === 'admin') return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    // There is deliberately no sign-up flow: accounts are created in the Supabase dashboard and
    // must additionally be listed in public.admin_users before they can do anything.
    const { error: err } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setBusy(false)
      setError('Sign-in failed. Check your credentials and try again.')
      return
    }
    if (!(await isCurrentUserAdmin())) {
      await supabase!.auth.signOut()
      setBusy(false)
      setError('Sign-in failed. Check your credentials and try again.')
    }
  }

  return (
    <main id="main" className="relative grid min-h-svh place-items-center px-5 py-16">
      <div aria-hidden className="grid-bg absolute inset-0 -z-10" />
      <div className="surface w-full max-w-md p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-xl border border-ink-500 text-accent"><Lock className="size-5" aria-hidden /></span>
        <h1 className="mt-5 text-3xl font-semibold">Admin sign in</h1>
        <p className="mt-2 text-sm text-fg-muted">Restricted area. Authorised administrators only.</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label-mono mb-2 block">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="password" className="label-mono mb-2 block">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          </div>
          <p role="alert" aria-live="assertive" className="min-h-5 text-sm text-danger">{error}</p>
          <Button type="submit" disabled={busy || !email || !password} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <Link to="/" className="mt-6 inline-block text-sm text-fg-muted hover:text-fg">← Back to site</Link>
      </div>
    </main>
  )
}
