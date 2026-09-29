import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
export type Row = { user_id: string; display_name: string; xp: number; streak: number; done_total: number; days_elapsed: number; main_goal: string | null; today_done: number | null; is_me: boolean }
export function useBoard() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('group_board')
    if (error) setError('No se pudo cargar el grupo.'); else { setRows((data ?? []) as Row[]); setError('') }
  }, [])
  useEffect(() => { void reload() }, [reload])
  return { rows, error, reload }
}
export const pct = (r: Row) => Math.round((r.done_total / (r.days_elapsed * 4)) * 100)
