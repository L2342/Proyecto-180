# Proyecto 180 · Web MVP

React + Vite + TypeScript · Supabase (Auth + Postgres + RLS) · Vercel. No toca el proyecto móvil anterior.

## 1. Supabase (una sola vez)
1. Crea un proyecto en supabase.com.
2. SQL Editor → pega y ejecuta `supabase/migrations/0001_init.sql`.
3. Authentication → Providers: deja **Email** activo. Para arrancar rápido puedes desactivar "Confirm email"; si lo dejas activo, cada persona debe confirmar su correo antes de entrar.
4. Authentication → URL Configuration: pon como *Site URL* tu URL de Vercel y agrega `https://TU-URL/**` y `http://localhost:5173/**` en *Redirect URLs* (necesario para confirmar correo y recuperar contraseña).
5. Project Settings → API: copia la URL y la clave **anon**. Nunca uses `service_role` en el frontend.

## 2. Código de invitación
Se guarda en la tabla `challenge_secret`, sin acceso desde el cliente. Para cambiarlo (SQL Editor):
```sql
update public.challenge_secret set invite_code = 'POPULARES-2026';
```
Límite de participantes (13 por defecto): `update public.challenge set max_participants = 13;`
Quien se registra con un código inválido queda con cuenta pero sin acceso a datos; la app le pide el código.

## 3. Local
```bash
cp .env.example .env   # completa URL y anon key
npm install
npm run dev            # http://localhost:5173
npm run build          # tsc + build de producción
```

## 4. Vercel
1. Sube esta carpeta a un repositorio de GitHub e impórtalo en vercel.com (framework Vite; `vercel.json` ya define build y rewrites SPA).
2. Environment Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. La URL `https://<proyecto>.vercel.app` es el enlace para los participantes, junto con el código de invitación.

## 5. Tucán e iconos
Copia los cuatro PNG a `public/tucan/` como `neutral.png`, `pendiente.png`, `completado.png`, `celebrando.png` (o ajusta `src/config.ts`). Mientras no existan se muestra un placeholder. Iconos propios: `ICON_OVERRIDES` en `src/config.ts`.

## Reglas provisionales (en SQL, editables)
- XP = 10 por hábito completado. Racha = días consecutivos con 4/4. Vidas = 3 iniciales, sin penalizaciones.
- La fecha de registro la fija el servidor (hoy en America/Bogota): no hay días futuros ni pasados.
- Comparten con el grupo solo: nombre, XP, racha y % de hábitos; opcionalmente objetivo principal y hábitos de hoy si el usuario lo activa.
