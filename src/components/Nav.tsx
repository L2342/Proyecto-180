import { Icon } from './Icon'
const TABS = [{ to: '/', label: 'Inicio', icon: 'home' }, { to: '/grupo', label: 'Grupo', icon: 'users' }, { to: '/perfil', label: 'Mi perfil', icon: 'user' }]
export function Nav({ path, go }: { path: string; go: (to: string) => void }) {
  return (
    <nav className="nav" aria-label="Principal">
      {TABS.map((t) => (
        <a key={t.to} href={t.to} className={path === t.to ? 'on' : ''} aria-current={path === t.to ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); go(t.to) }}>
          <Icon name={t.icon} /><span>{t.label}</span>
        </a>
      ))}
    </nav>
  )
}
