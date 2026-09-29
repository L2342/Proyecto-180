export const TZ = 'America/Bogota'
export const DURATION = 180
export const INITIAL_LIVES = 3
export const HABITS = [
  { key: 'entrenamiento', label: 'Entrenamiento', icon: 'dumbbell' },
  { key: 'alimentacion', label: 'Alimentación', icon: 'apple' },
  { key: 'hidratacion', label: 'Hidratación', icon: 'drop' },
  { key: 'sueno', label: 'Sueño', icon: 'moon' },
] as const
export type HabitKey = (typeof HABITS)[number]['key']
// Fecha local del reto (YYYY-MM-DD) sin depender de UTC ni del huso del dispositivo.
export const todayLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })
const ms = (d: string) => Date.parse(d + 'T00:00:00Z')
export const dayNumber = (start: string, today = todayLocal()) => Math.floor((ms(today) - ms(start)) / 864e5) + 1
export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
export const GOALS: Record<string, string> = {
  musculo: 'Ganar músculo', grasa: 'Perder grasa', condicion: 'Mejorar condición física',
  habitos: 'Mejorar hábitos', bienestar: 'Bienestar general',
}
