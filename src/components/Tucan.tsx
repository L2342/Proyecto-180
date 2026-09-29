import { useState } from 'react'
import { TUCAN_SRC, type TucanState } from '../config'
export function Tucan({ state, size = 120 }: { state: TucanState; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null)
  const src = TUCAN_SRC[state]
  if (failed === src) return <div className="tucan-ph" style={{ width: size, height: size }} role="img" aria-label={`Tucán ${state}`}>Tucán<br />{state}</div>
  return <img className="tucan" src={src} width={size} height={size} alt={`Tucán ${state}`} onError={() => setFailed(src)} />
}
