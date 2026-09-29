import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth'
import { Tucan } from '../components/Tucan'

type Mode = 'login' | 'signup' | 'forgot'
export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [f, setF] = useState({ email: '', password: '', name: '', code: '' })
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (mode === 'signup') {
      if (f.name.trim().length < 2) return setMsg({ t: 'err', s: 'El nombre visible debe tener al menos 2 caracteres.' })
      if (f.password.length < 8) return setMsg({ t: 'err', s: 'La contraseña debe tener al menos 8 caracteres.' })
      if (!f.code.trim()) return setMsg({ t: 'err', s: 'Escribe el código de invitación del reto.' })
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
        if (error) setMsg({ t: 'err', s: 'Correo o contraseña incorrectos.' })
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim(), password: f.password,
          options: { data: { display_name: f.name.trim(), invite_code: f.code.trim() }, emailRedirectTo: location.origin },
        })
        if (error) setMsg({ t: 'err', s: error.message })
        else if (!data.session) setMsg({ t: 'ok', s: 'Cuenta creada. Confirma tu correo desde el mensaje que te enviamos y luego inicia sesión.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: location.origin + '/restablecer' })
        setMsg(error ? { t: 'err', s: error.message } : { t: 'ok', s: 'Si el correo existe, te enviamos un enlace para restablecer la contraseña.' })
      }
    } finally { setBusy(false) }
  }
  const title = mode === 'login' ? 'Entra a tu reto' : mode === 'signup' ? 'Únete al Proyecto 180' : 'Recupera tu acceso'
  return (
    <main className="wrap auth">
      <Tucan state="neutral" size={96} />
      <h1>Proyecto 180</h1>
      <p className="muted">{title}</p>
      <form className="card stack" onSubmit={submit} noValidate>
        {mode === 'signup' && <label>Nombre visible<input value={f.name} onChange={set('name')} autoComplete="nickname" maxLength={40} /></label>}
        <label>Correo<input type="email" value={f.email} onChange={set('email')} autoComplete="email" inputMode="email" required /></label>
        {mode !== 'forgot' && <label>Contraseña<input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>}
        {mode === 'signup' && <label>Código de invitación<input value={f.code} onChange={set('code')} autoCapitalize="characters" autoComplete="off" /></label>}
        {msg && <p className={msg.t === 'err' ? 'err' : 'okmsg'} role="alert">{msg.s}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}</button>
      </form>
      <div className="links">
        {mode !== 'login' && <button className="link" onClick={() => { setMode('login'); setMsg(null) }}>Ya tengo cuenta</button>}
        {mode !== 'signup' && <button className="link" onClick={() => { setMode('signup'); setMsg(null) }}>Crear cuenta</button>}
        {mode === 'login' && <button className="link" onClick={() => { setMode('forgot'); setMsg(null) }}>Olvidé mi contraseña</button>}
      </div>
    </main>
  )
}

export function JoinGate() {
  const { refresh } = useAuth()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function join(e: FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const { data, error } = await supabase.rpc('join_challenge', { p_code: code })
    setBusy(false)
    if (error) return setErr('No se pudo validar el código. Inténtalo de nuevo.')
    if (data === 'ok') await refresh()
    else setErr(data === 'full' ? 'El grupo ya alcanzó su límite de participantes.' : 'Código de invitación no válido.')
  }
  return (
    <main className="wrap auth">
      <Tucan state="pendiente" size={96} />
      <h1>Falta un paso</h1>
      <p className="muted">Tu cuenta existe, pero aún no perteneces al reto. Escribe el código de invitación.</p>
      <form className="card stack" onSubmit={join}>
        <label>Código de invitación<input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" disabled={busy || !code.trim()}>Unirme al reto</button>
      </form>
      <button className="link" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </main>
  )
}

export function ResetPassword({ go }: { go: (to: string) => void }) {
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('')
  async function save(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return setMsg('La contraseña debe tener al menos 8 caracteres.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) setMsg(error.message); else go('/')
  }
  return (
    <main className="wrap auth"><h1>Nueva contraseña</h1>
      <form className="card stack" onSubmit={save}>
        <label>Contraseña nueva<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        {msg && <p className="err" role="alert">{msg}</p>}
        <button className="btn">Guardar contraseña</button>
      </form>
    </main>
  )
}
