import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { buildContent, defaultContent, type ContentRow, type SiteContent } from '@/lib/content'
import { isSupabaseConfigured } from '@/lib/supabaseEnv'

const CACHE_KEY = 'portfolio-content-v1'
const Ctx = createContext<SiteContent>(defaultContent)

const readCache = (): ContentRow[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as ContentRow[]) : null
  } catch {
    return null
  }
}

/**
 * Supplies the editable site content. First paint uses the last copy this browser saw (or the
 * bundled starter data), then the latest published content is fetched and swapped in. The
 * Supabase client is imported lazily, so the first page load does not pay for it.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() => buildContent(readCache()))

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let live = true
    import('@/lib/api')
      .then((api) => api.fetchSiteContent())
      .then((rows) => {
        if (!live) return
        setContent(buildContent(rows))
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(rows))
        } catch {
          /* private mode or full storage: the cache is only an optimisation */
        }
      })
      .catch(() => {
        /* keep whatever is already on screen: the site must never break because the backend is down */
      })
    return () => {
      live = false
    }
  }, [])

  return <Ctx.Provider value={content}>{children}</Ctx.Provider>
}

export const useContent = () => useContext(Ctx)
