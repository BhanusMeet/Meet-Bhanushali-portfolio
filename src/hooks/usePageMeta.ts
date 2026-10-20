import { useEffect } from 'react'

/** Sets the document title and (optionally) a noindex robots tag for private routes. Restores both on unmount. */
export function usePageMeta(title: string, opts: { noindex?: boolean } = {}) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title
    let meta: HTMLMetaElement | null = null
    if (opts.noindex) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      meta.content = 'noindex, nofollow, noarchive'
      document.head.appendChild(meta)
    }
    return () => {
      document.title = prevTitle
      meta?.remove()
    }
  }, [title, opts.noindex])
}
