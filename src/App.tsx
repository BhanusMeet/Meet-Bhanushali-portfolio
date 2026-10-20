import { lazy, Suspense } from 'react'
import { Route, Routes, Link } from 'react-router-dom'
import Home from '@/pages/Home'
import { Spinner } from '@/components/ui/primitives'

// Admin and review flows are code-split so the public portfolio stays light.
const ReviewPage = lazy(() => import('@/pages/ReviewPage'))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'))
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews'))
const AdminInvitations = lazy(() => import('@/pages/admin/AdminInvitations'))
const AdminContent = lazy(() => import('@/pages/admin/AdminContent'))

function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-5 text-center">
      <div>
        <p className="label-mono text-accent">404</p>
        <h1 className="mt-3 text-4xl font-semibold">Nothing here.</h1>
        <Link to="/" className="mt-6 inline-block text-fg-muted underline underline-offset-4 hover:text-fg">Back to the portfolio</Link>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-svh place-items-center"><Spinner /></div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review/:token" element={<ReviewPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="invitations" element={<AdminInvitations />} />
          <Route path="content" element={<AdminContent />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
