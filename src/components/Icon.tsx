import { ICON_OVERRIDES } from '../config'
const P: Record<string, string> = {
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  heart: 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z',
  flame: 'M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  check: 'M5 12.5 10 17.5 19 7',
  dumbbell: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  apple: 'M12 8c-3-2-7 0-7 5 0 4 3 8 5 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-5-4-7-7-5zM12 8c0-2 1-4 3-5',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  home: 'M4 11 12 4l8 7v9H4z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const o = ICON_OVERRIDES[name]
  if (o) return <img src={o} width={size} height={size} alt="" />
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.check} />
    </svg>
  )
}
