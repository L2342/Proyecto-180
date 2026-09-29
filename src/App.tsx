import { useAuth } from './auth'
import { isConfigured } from './lib/supabase'
import { useRoute } from './lib/router'
import { Nav } from './components/Nav'
import { AuthPage, JoinGate, ResetPassword } from './pages/Auth'
import Home from './pages/Home'
import Group from './pages/Group'
import Profile from './pages/Profile'
import Onboarding from './pages/Onboarding'

export default function App() {
  const { session, loading, member, recovery } = useAuth()
  const { path, go } = useRoute()
  if (!isConfigured) return (
    <main className="wrap center"><h1>Falta configurar Supabase</h1>
      <p className="muted">Crea un archivo <code>.env</code> a partir de <code>.env.example</code> con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, y reinicia el servidor.</p></main>)
  if (loading) return <main className="wrap center"><p className="muted">Cargando…</p></main>
  if (recovery || path === '/restablecer') return session ? <ResetPassword go={go} /> : <AuthPage />
  if (!session) return <AuthPage />
  if (!member) return <JoinGate />
  const page = path === '/grupo' ? <Group /> : path === '/perfil' ? <Profile go={go} /> : path === '/prepara' ? <Onboarding go={go} /> : <Home go={go} />
  return <><main className="wrap">{page}</main>{path !== '/prepara' && <Nav path={path} go={go} />}</>
}
