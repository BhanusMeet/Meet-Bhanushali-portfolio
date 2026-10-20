import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogOut, ShieldAlert } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Spinner } from '@/components/ui/primitives'
import { Wordmark } from '@/components/layout/Wordmark'
import { cn } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

export function Unconfigured() {
  return (
    <div className="surface mx-auto max-w-xl p-8">
      <ShieldAlert aria-hidden className="size-7 text-warn" />
      <h1 className="mt-4 text-2xl font-semibold">Backend not configured</h1>
      <p className="mt-2 text-fg-muted">
        Set <code className="font-mono text-fg">VITE_SUPABASE_URL</code> and <code className="font-mono text-fg">VITE_SUPABASE_ANON_KEY</code> in <code className="font-mono text-fg">.env</code>, then restart the dev
        server. See the README for the Supabase setup steps.
      </p>
    </div>
  )
}

/** Route guard + shell for /admin/*. The data layer enforces authorization independently. */
export function AdminLayout() {
  usePageMeta('Admin · Meet Bhanushali', { noindex: true })
  const { state, session, signOut } = useAdminAuth()
  const loc = useLocation()

  if (state === 'unconfigured')
    return (
      <main className="container-x py-24">
        <Unconfigured />
      </main>
    )
  if (state === 'loading')
    return (
      <main className="container-x grid min-h-[60svh] place-items-center">
        <Spinner label="Checking access" />
      </main>
    )
  if (state === 'anonymous') return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />
  if (state === 'denied')
    return (
      <main className="container-x grid min-h-[70svh] place-items-center py-24">
        <div className="surface max-w-md p-8 text-center">
          <ShieldAlert aria-hidden className="mx-auto size-8 text-danger" />
          <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 text-fg-muted">This account is not authorised for the admin area.</p>
          <button onClick={signOut} className="mt-6 rounded-full border border-ink-500 px-5 py-2.5 text-sm hover:border-accent/60">
            Sign out
          </button>
        </div>
      </main>
    )

  const tab = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-full px-4 py-2 text-sm transition-colors', isActive ? 'bg-ink-700 text-fg' : 'text-fg-muted hover:text-fg')

  return (
    <div className="min-h-svh">
      <header className="border-b border-ink-600 bg-ink-900/70 backdrop-blur">
        <div className="container-x flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
          <Link to="/" aria-label="Back to the public site"><Wordmark /></Link>
          <nav aria-label="Admin" className="order-last flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto">
            <NavLink to="/admin" end className={tab}>Overview</NavLink>
            <NavLink to="/admin/content" className={tab}>Content</NavLink>
            <NavLink to="/admin/reviews" className={tab}>Reviews</NavLink>
            <NavLink to="/admin/invitations" className={tab}>Invitations</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-fg-dim lg:inline">{session?.user.email}</span>
            <button onClick={signOut} aria-label="Sign out" className="inline-flex size-9 items-center justify-center rounded-full border border-ink-500 hover:border-accent/60">
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="container-x py-10">
        <Outlet />
      </main>
    </div>
  )
}
