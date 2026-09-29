import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../lib/supabase'
import { HABITS, fmtDate } from '../lib/challenge'
import { useBoard } from '../lib/data'

export default function Profile({ go }: { go: (to: string) => void }) {
  const { profile, session } = useAuth()
  const { rows } = useBoard()
  const [hist, setHist] = useState<{ d: string; n: number }[]>([])
  useEffect(() => {
    supabase.from('habit_logs').select('log_date,completed').eq('completed', true).order('log_date', { ascending: false }).limit(400)
      .then(({ data }) => {
        const m = new Map<string, number>()
        ;(data ?? []).forEach((r) => m.set(r.log_date, (m.get(r.log_date) ?? 0) + 1))
        setHist([...m].map(([d, n]) => ({ d, n })))
      })
  }, [])
  if (!profile || !session) return null
  const me = rows?.find((r) => r.is_me)
  const full = hist.filter((h) => h.n === HABITS.length).length
  return (
    <>
      <h1>Mi perfil</h1>
      <section className="card stack">
        <div><small className="muted">Nombre visible</small><p><b>{profile.display_name}</b></p></div>
        <div><small className="muted">Correo</small><p>{session.user.email}</p></div>
        <div><small className="muted">Ingreso al reto</small><p>{fmtDate(profile.joined_at)}</p></div>
      </section>
      {!profile.onboarding_completed && (
        <section className="card alert"><p>Tu perfil está incompleto. Puedes retomarlo donde lo dejaste.</p>
          <button className="btn" onClick={() => go('/prepara')}>Completar mi perfil</button></section>)}
      <section className="stats">
        <div className="card stat"><b>{me?.xp ?? 0}</b><span>XP</span></div>
        <div className="card stat"><b>{me?.streak ?? 0}</b><span>Racha</span></div>
        <div className="card stat"><b>{full}</b><span>Días 4/4</span></div>
      </section>
      <section>
        <h2>Historial de check-ins</h2>
        {hist.length === 0 ? <p className="muted">Aún no hay registros. Marca tu primer hábito en Inicio.</p> : (
          <ul className="hist">{hist.slice(0, 30).map((h) => <li key={h.d} className="card"><span>{fmtDate(h.d)}</span><b>{h.n}/4</b></li>)}</ul>)}
      </section>
      <button className="btn ghost" onClick={() => go('/prepara')}>Editar objetivos, medidas y privacidad</button>
      <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </>
  )
}
