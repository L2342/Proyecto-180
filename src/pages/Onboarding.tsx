import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../lib/supabase'
import { GOALS, HABITS, todayLocal } from '../lib/challenge'
import { Tucan } from '../components/Tucan'

type F = Record<string, string>
const MEAS = [['waist_cm', 'Cintura'], ['chest_cm', 'Pecho'], ['hip_cm', 'Cadera'], ['arm_cm', 'Brazo'], ['thigh_cm', 'Muslo']] as const
const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
const inRange = (s: string, a: number, b: number) => { const n = num(s); return n !== null && Number.isFinite(n) && n >= a && n <= b }

function validate(step: number, f: F): Record<string, string> {
  const e: Record<string, string> = {}
  if (step === 1) {
    if (f.name.trim().length < 2) e.name = 'Escribe al menos 2 caracteres.'
    if (!inRange(f.age, 10, 100)) e.age = 'Indica una edad entre 10 y 100 años.'
    if (!inRange(f.height, 100, 250)) e.height = 'Indica tu estatura en cm (100 a 250).'
    if (!inRange(f.weight, 25, 300)) e.weight = 'Indica tu peso en kg (25 a 300).'
  }
  if (step === 2 && !f.goal_main) e.goal_main = 'Elige un objetivo principal.'
  if (step === 3) MEAS.forEach(([k]) => { if (f[k] && !inRange(f[k], 10, 250)) e[k] = 'Valor no válido (en cm).' })
  if (step === 4 && f.weekly && !inRange(f.weekly, 0, 7)) e.weekly = 'Indica un número entre 0 y 7.'
  return e
}

export default function Onboarding({ go }: { go: (to: string) => void }) {
  const { profile, session, refresh } = useAuth()
  const wasDone = Boolean(profile?.onboarding_completed)
  const [step, setStep] = useState(wasDone ? 1 : profile?.onboarding_step ?? 1)
  const [f, setF] = useState<F>({ name: profile?.display_name ?? '' })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  const [welcome, setWelcome] = useState(false)
  const uid = session!.user.id
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const tog = (k: string) => setF({ ...f, [k]: f[k] === '1' ? '' : '1' })

  useEffect(() => {
    (async () => {
      const [p, m] = await Promise.all([
        supabase.from('private_profiles').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('body_measurements').select('*').eq('user_id', uid).order('measured_on', { ascending: false }).limit(1).maybeSingle(),
      ])
      const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
      const d = p.data ?? {}
      setF((cur) => ({
        ...cur, age: s(d.age), height: s(d.height_cm), weight: s(d.weight_kg), sex: s(d.sex),
        goal_main: s(d.goal_main), goal_text: s(d.goal_text), goals_secondary: s(d.goals_secondary), goal_outcome: s(d.goal_outcome),
        weekly: s(d.weekly_training_goal), notes: s(d.tracking_notes),
        share_goal: d.share_main_goal ? '1' : '', share_today: d.share_today_habits ? '1' : '',
        ...Object.fromEntries(MEAS.map(([k]) => [k, s(m.data?.[k])])),
      }))
    })()
  }, [uid])

  async function save(next: number, finish = false) {
    const priv = supabase.from('private_profiles')
    const ops: PromiseLike<{ error: unknown }>[] = []
    if (step === 1) {
      ops.push(supabase.from('profiles').update({ display_name: f.name.trim() }).eq('id', uid))
      ops.push(priv.update({ age: num(f.age), height_cm: num(f.height), weight_kg: num(f.weight), sex: f.sex || null, updated_at: new Date().toISOString() }).eq('user_id', uid))
    }
    if (step === 2) ops.push(priv.update({ goal_main: f.goal_main, goal_text: f.goal_text || null, goals_secondary: f.goals_secondary || null, goal_outcome: f.goal_outcome || null }).eq('user_id', uid))
    if (step === 3 && MEAS.some(([k]) => f[k])) {
      ops.push(supabase.from('body_measurements').upsert({ user_id: uid, measured_on: todayLocal(), ...Object.fromEntries(MEAS.map(([k]) => [k, num(f[k] ?? '')])) }, { onConflict: 'user_id,measured_on' }))
    }
    if (step === 4) ops.push(priv.update({ weekly_training_goal: num(f.weekly ?? ''), tracking_notes: f.notes || null }).eq('user_id', uid))
    if (step === 5) ops.push(priv.update({ share_main_goal: f.share_goal === '1', share_today_habits: f.share_today === '1' }).eq('user_id', uid))
    const res = await Promise.all(ops)
    if (res.some((r) => r.error)) throw new Error('save')
    const { error } = await supabase.from('profiles').update(finish ? { onboarding_completed: true, onboarding_step: 5 } : { onboarding_step: Math.max(next, profile?.onboarding_step ?? 1) }).eq('id', uid)
    if (error) throw error
  }

  async function next() {
    const e = validate(step, f); setErrs(e); setFail('')
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const finish = step === 5
      await save(step + 1, finish)
      await refresh()
      if (finish) { if (wasDone) go('/perfil'); else setWelcome(true) } else setStep(step + 1)
    } catch { setFail('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.') }
    finally { setBusy(false) }
  }

  if (welcome) return (
    <section className="center stack"><Tucan state="celebrando" size={140} />
      <h1>Ya estás dentro.</h1><p className="lead">Día 1 de 180. A construir.</p>
      <button className="btn" onClick={() => go('/')}>Ir a mi inicio</button></section>)

  const err = (k: string) => errs[k] && <small className="err">{errs[k]}</small>
  return (
    <>
      <header><p className="muted">Prepara tu Proyecto 180 · Paso {step} de 5</p>
        <div className="bar"><i style={{ width: `${(step / 5) * 100}%` }} /></div></header>
      <section className="card stack">
        {step === 1 && <>
          <h2>Datos personales</h2>
          <label>Nombre visible<input value={f.name ?? ''} onChange={set('name')} maxLength={40} />{err('name')}</label>
          <label>Edad<input inputMode="numeric" value={f.age ?? ''} onChange={set('age')} />{err('age')}</label>
          <label>Estatura (cm)<input inputMode="decimal" value={f.height ?? ''} onChange={set('height')} />{err('height')}</label>
          <label>Peso inicial (kg)<input inputMode="decimal" value={f.weight ?? ''} onChange={set('weight')} />{err('weight')}</label>
          <label>Sexo (opcional)<select value={f.sex ?? ''} onChange={set('sex')}><option value="">Prefiero no indicarlo</option><option value="femenino">Femenino</option><option value="masculino">Masculino</option><option value="otro">Otro</option></select>
            <small className="muted">No se usa en ningún cálculo por ahora.</small></label>
          <p className="note">La foto de perfil llegará en una próxima versión.</p></>}
        {step === 2 && <>
          <h2>Objetivos personales</h2>
          <fieldset><legend>Objetivo principal</legend>
            {Object.entries(GOALS).map(([k, v]) => <label key={k} className="opt"><input type="radio" name="g" checked={f.goal_main === k} onChange={() => setF({ ...f, goal_main: k })} />{v}</label>)}{err('goal_main')}</fieldset>
          <label>Tu objetivo, en tus palabras<textarea rows={3} maxLength={500} value={f.goal_text ?? ''} onChange={set('goal_text')} /></label>
          <label>Objetivos secundarios (opcional)<textarea rows={2} maxLength={500} value={f.goals_secondary ?? ''} onChange={set('goals_secondary')} /></label>
          <label>¿Qué te gustaría haber conseguido al terminar?<textarea rows={3} maxLength={500} value={f.goal_outcome ?? ''} onChange={set('goal_outcome')} /></label></>}
        {step === 3 && <>
          <h2>Medidas iniciales</h2>
          <p className="muted">Son una referencia personal. Registra solo las que quieras; todas son opcionales.</p>
          {MEAS.map(([k, l]) => <label key={k}>{l} (cm)<input inputMode="decimal" value={f[k] ?? ''} onChange={set(k)} />{err(k)}</label>)}</>}
        {step === 4 && <>
          <h2>Preferencias del reto</h2>
          <p className="muted">Los cuatro hábitos base son comunes a todo el grupo y no cambian:</p>
          <p>{HABITS.map((h) => h.label).join(' · ')}</p>
          <label>Meta semanal de entrenamiento (días, opcional)<input inputMode="numeric" value={f.weekly ?? ''} onChange={set('weekly')} />{err('weekly')}</label>
          <label>Preferencias de seguimiento (opcional)<textarea rows={3} maxLength={500} value={f.notes ?? ''} onChange={set('notes')} /></label></>}
        {step === 5 && <>
          <h2>Privacidad y confirmación</h2>
          <div className="summary">
            <p><b>{f.name}</b>{f.goal_main ? ` · ${GOALS[f.goal_main]}` : ''}</p>
            <p className="muted">{f.age} años · {f.height} cm · {f.weight} kg{MEAS.some(([k]) => f[k]) ? ' · con medidas de referencia' : ''}{f.weekly ? ` · ${f.weekly} entrenamientos/semana` : ''}</p></div>
          <p><b>Privado (solo tú):</b> edad, estatura, peso, medidas, objetivos detallados e historial de medidas.</p>
          <p><b>Visible para el grupo:</b> nombre visible, XP, racha y progreso del reto.</p>
          <p className="muted">Peso, medidas y fotos nunca se comparten. Si quieres, puedes compartir además:</p>
          <label className="opt"><input type="checkbox" checked={f.share_goal === '1'} onChange={() => tog('share_goal')} />Mi objetivo principal</label>
          <label className="opt"><input type="checkbox" checked={f.share_today === '1'} onChange={() => tog('share_today')} />Mis hábitos completados hoy (n/4)</label></>}
        {fail && <p className="err" role="alert">{fail}</p>}
      </section>
      <div className="row">
        <button className="btn ghost" disabled={busy} onClick={() => (step === 1 ? go(wasDone ? '/perfil' : '/') : setStep(step - 1))}>{step === 1 ? 'Salir' : 'Volver'}</button>
        <button className="btn" disabled={busy} onClick={next}>{busy ? 'Guardando…' : step === 5 ? 'Guardar y terminar' : 'Continuar'}</button>
      </div>
      {step === 1 && !wasDone && <p className="note">Tu avance se guarda en cada paso: puedes cerrar y retomarlo desde Inicio o Mi perfil.</p>}
    </>
  )
}
