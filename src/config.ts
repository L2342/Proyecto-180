// Rutas configurables para las ilustraciones del tucán y los iconos.
// Copia los PNG/SVG a public/tucan y public/icons y ajusta aquí los nombres si cambian.
export type TucanState = 'neutral' | 'pendiente' | 'completado' | 'celebrando'
export const TUCAN_SRC: Record<TucanState, string> = {
  neutral: '/tucan/neutral.png',
  pendiente: '/tucan/pendiente.png',
  completado: '/tucan/completado.png',
  celebrando: '/tucan/celebrando.png',
}
// Si defines una ruta aquí, se usa en lugar del icono de trazo incluido. Ej.: xp: '/icons/xp.svg'
export const ICON_OVERRIDES: Record<string, string | undefined> = {}
export const START_HINT = '2026-09-28'
