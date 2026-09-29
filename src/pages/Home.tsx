import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../lib/supabase'
import { HABITS, INITIAL_LIVES, dayNumber, todayLocal, type HabitKey } from '../lib/challenge'
import { useBoard } from '../lib/data'
import { Icon } from '../components/Icon'
import { Tucan } from '../components/Tucan'
import type { TucanState } from '../config'

export default function Home({ go }: { go: (to: string) => void }) {
  const { profile, challenge, session } = useAuth()
  const { rows, reload } = useBoard()
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [hide, setHide] = useState(false)
  const [err, setErr] = useState('')
  const [cheer, setCheer] = useState(false)
  const today = todayLocal()

  useEffect(() => {
    if (!session) return
    supabase.from('habit_logs').select('habit_key,completed').eq('log_date', today).eq('user_id', session.user.id)
      .then(({ data }) => setDone(Object.fromEntries((data ?? []).map((r) => [r.habit_key, r.completed as boolean]))))
  }, [session, today])

  if (!challenge || !profile) return <p className="muted">Cargando…</p>
  const day = dayNumber(challenge.start_date, today)
  const total = challenge.duration_days
  const started = day >= 1 && day <= total
  const count = HABITS.filter((h) => done[h.key]).length
  const me = rows?.find((r) => r.is_me)
  const state: TucanState = cheer ? 'celebrando' : count === 4 ? 'completado' : count > 0 ? 'pendiente' : 'neutral'

  async function toggle(k: HabitKey) {
    const next = !done[k]; setErr('')
    setDone({ ...done, [k]: next })
    const { error } = await supabase.rpc('set_habit', { p_habit: k, p_done: next })
    if (error) { setDone({ ...done }); return setErr('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.') }
    if (next && HABITS.filter((h) => h.key === k || done[h.key]).length === 4) { setCheer(true); setTimeout(() => setCheer(false), 4000) }
    void reload()
  }

  return (
    <>
      <header className="head">
        <div><p className="muted">Hola, {profile.display_name}</p><h1>Proyecto 180</h1></div>
        <Tucan state={state} size={104} />
      </header>

      {!profile.onboarding_completed && !hide && (
        <section className="card alert" role="status">
          <p><strong>¡Tu reto comienza aquí!</strong> Completa tu perfil para personalizar tus objetivos y hacer seguimiento de tu progreso.</p>
          <div className="row"><button className="btn" onClick={() => go('/prepara')}>Completar mi perfil</button>
            <button className="link" onClick={() => setHide(true)}>Después</button></div>
        </section>
      )}

      <section className="card">
        <div className="between"><h2>{started ? `Día ${day} de ${total}` : day < 1 ? 'El reto aún no empieza' : 'Reto terminado'}</h2>
          <span className="muted">{Math.min(100, Math.max(0, Math.round((day / total) * 100)))}%</span></div>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, Math.min(day, total))}>
          <i style={{ width: `${Math.min(100, Math.max(0, (day / total) * 100))}%` }} /></div>
      </section>

      <section className="stats">
        <div className="card stat"><Icon name="bolt" /><b>{me?.xp ?? 0}</b><span>XP</span></div>
        <div className="card stat"><Icon name="heart" /><b>{challenge.initial_lives ?? INITIAL_LIVES}</b><span>Vidas</span></div>
        <div className="card stat"><Icon name="flame" /><b>{me?.streak ?? 0}</b><span>Racha</span></div>
      </section>
      <p className="note">XP y racha se calculan con tus hábitos registrados. Las vidas son el valor inicial: las penalizaciones aún no están activas.</p>

      <section>
        <div className="between"><h2>Hábitos de hoy</h2><span className="pill">{count}/4</span></div>
        <ul className="habits">
          {HABITS.map((h) => (
            <li key={h.key}>
              <button className={`habit ${done[h.key] ? 'done' : ''}`} aria-pressed={!!done[h.key]} disabled={!started} onClick={() => toggle(h.key)}>
                <span className="hi"><Icon name={h.icon} /></span>
                <span className="hl">{h.label}<small>{done[h.key] ? 'Completado' : 'Pendiente'}</small></span>
                <span className="chk"><Icon name="check" size={18} /></span>
              </button>
            </li>
          ))}
        </ul>
        {err && <p className="err" role="alert">{err}</p>}
        <p className="note">Solo puedes registrar y corregir el día de hoy.</p>
      </section>
    </>
  )
}
