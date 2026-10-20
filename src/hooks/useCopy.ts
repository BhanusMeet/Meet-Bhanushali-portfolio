import { useCallback, useEffect, useRef, useState } from 'react'
import { copyToClipboard } from '@/lib/utils'

/** Copy-to-clipboard with transient "copied" / "failed" feedback. */
export function useCopy(resetMs = 2000) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string) => {
      const ok = await copyToClipboard(text)
      setState(ok ? 'copied' : 'failed')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setState('idle'), resetMs)
      return ok
    },
    [resetMs],
  )

  return { state, copy }
}
