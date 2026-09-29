import { useCallback, useEffect, useState } from 'react'
export function useRoute() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const f = () => setPath(location.pathname)
    addEventListener('popstate', f)
    return () => removeEventListener('popstate', f)
  }, [])
  const go = useCallback((to: string) => { history.pushState({}, '', to); setPath(to); scrollTo(0, 0) }, [])
  return { path, go }
}
