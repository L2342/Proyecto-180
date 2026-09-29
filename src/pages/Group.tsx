import { useBoard, pct } from '../lib/data'
import { GOALS } from '../lib/challenge'
import { Icon } from '../components/Icon'
import { Tucan } from '../components/Tucan'

export default function Group() {
  const { rows, error } = useBoard()
  if (error) return <p className="err">{error}</p>
  if (!rows) return <p className="muted">Cargando…</p>
  const others = rows.filter((r) => !r.is_me)
  const all = rows.reduce((a, r) => a + r.done_total, 0)
  const cap = rows.reduce((a, r) => a + r.days_elapsed * 4, 0)
  return (
    <>
      <h1>Grupo</h1>
      <section className="card">
        <div className="between"><h2>Progreso general</h2><span className="muted">{rows.length} participantes</span></div>
        <div className="bar"><i style={{ width: `${cap ? Math.round((all / cap) * 100) : 0}%` }} /></div>
        <p className="note">La tabla es informativa: no define por sí sola al ganador del reto.</p>
      </section>
      {others.length === 0 && (
        <section className="card empty"><Tucan state="neutral" size={88} />
          <p><b>Aún eres la primera persona del grupo.</b></p><p className="muted">Comparte el enlace y el código de invitación para que se unan los demás.</p></section>
      )}
      <ol className="board">
        {rows.map((r, i) => (
          <li key={r.user_id} className={`card ${r.is_me ? 'me' : ''}`}>
            <span className="rank">{i + 1}</span>
            <div className="who"><b>{r.display_name}{r.is_me ? ' (tú)' : ''}</b>
              <small className="muted">{pct(r)}% de hábitos{r.main_goal ? ` · ${GOALS[r.main_goal]}` : ''}{r.today_done !== null ? ` · hoy ${r.today_done}/4` : ''}</small></div>
            <span className="m"><Icon name="flame" size={16} />{r.streak}</span>
            <span className="m xp"><Icon name="bolt" size={16} />{r.xp}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
