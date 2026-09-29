import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export type Profile = { id: string; display_name: string; joined_at: string; onboarding_completed: boolean; onboarding_step: number }
export type Challenge = { name: string; start_date: string; duration_days: number; initial_lives: number; checkin_every_days: number; checkin_window_hours: number }
type Ctx = {
  session: Session | null; loading: boolean; recovery: boolean
  profile: Profile | null; challenge: Challenge | null; member: boolean
  refresh: () => Promise<void>
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(C)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [member, setMember] = useState(false)

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setChallenge(null); setMember(false); return }
    const [p, m] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('challenge_members').select('user_id').eq('user_id', s.user.id).maybeSingle(),
    ])
    setProfile((p.data as Profile) ?? null)
    setMember(Boolean(m.data))
    if (m.data) {
      const c = await supabase.from('challenge').select('*').maybeSingle()
      setChallenge((c.data as Challenge) ?? null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      setTimeout(() => { void load(s) }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const refresh = useCallback(() => load(session), [load, session])
  return <C.Provider value={{ session, loading, recovery, profile, challenge, member, refresh }}>{children}</C.Provider>
}
