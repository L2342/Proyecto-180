-- Proyecto 180 · esquema mínimo + RLS. Ejecutar completo en Supabase → SQL Editor.

-- 1) Configuración del reto (lectura solo para miembros) -----------------------
create table public.challenge (
  id int primary key default 1 check (id = 1),
  name text not null default 'Proyecto 180',
  start_date date not null default '2026-09-28',
  duration_days int not null default 180,
  initial_lives int not null default 3,
  checkin_every_days int not null default 15,
  checkin_window_hours int not null default 92,
  max_participants int not null default 13,
  timezone text not null default 'America/Bogota'
);
insert into public.challenge default values;

-- Código de invitación: tabla sin políticas ni permisos para el cliente.
create table public.challenge_secret (
  id int primary key default 1 check (id = 1),
  invite_code text not null
);
insert into public.challenge_secret (invite_code) values ('CAMBIAME-180');
alter table public.challenge_secret enable row level security;
revoke all on public.challenge_secret from anon, authenticated;

-- 2) Tablas de usuario ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  joined_at timestamptz not null default now(),
  onboarding_completed boolean not null default false,
  onboarding_step int not null default 1 check (onboarding_step between 1 and 5)
);

create table public.challenge_members (
  user_id uuid primary key references auth.users on delete cascade,
  joined_at timestamptz not null default now()
);

create table public.private_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  age int check (age between 10 and 100),
  height_cm numeric check (height_cm between 100 and 250),
  weight_kg numeric check (weight_kg between 25 and 300),
  sex text check (sex in ('femenino', 'masculino', 'otro')),
  goal_main text check (goal_main in ('musculo', 'grasa', 'condicion', 'habitos', 'bienestar')),
  goal_text text check (char_length(goal_text) <= 500),
  goals_secondary text check (char_length(goals_secondary) <= 500),
  goal_outcome text check (char_length(goal_outcome) <= 500),
  weekly_training_goal int check (weekly_training_goal between 0 and 7),
  tracking_notes text check (char_length(tracking_notes) <= 500),
  share_main_goal boolean not null default false,
  share_today_habits boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.body_measurements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  measured_on date not null default current_date,
  waist_cm numeric check (waist_cm between 20 and 250),
  chest_cm numeric check (chest_cm between 20 and 250),
  hip_cm numeric check (hip_cm between 20 and 250),
  arm_cm numeric check (arm_cm between 10 and 100),
  thigh_cm numeric check (thigh_cm between 20 and 150),
  unique (user_id, measured_on)
);

create table public.habit_logs (
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  habit_key text not null check (habit_key in ('entrenamiento', 'alimentacion', 'hidratacion', 'sueno')),
  completed boolean not null default true,
  primary key (user_id, log_date, habit_key)
);

-- 3) Funciones auxiliares ------------------------------------------------------
create function public.challenge_today() returns date
language sql stable as $$ select (now() at time zone 'America/Bogota')::date $$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.challenge_members where user_id = auth.uid())
$$;

-- Unión al reto: valida código y cupo. No es invocable desde el cliente.
create function public.try_join(p_uid uuid, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v_ok boolean; v_max int; v_count int;
begin
  select lower(trim(coalesce(p_code, ''))) = lower(invite_code) into v_ok from public.challenge_secret;
  if not coalesce(v_ok, false) then return 'invalid'; end if;
  perform 1 from public.challenge for update;            -- evita carreras al llenar cupos
  if exists (select 1 from public.challenge_members where user_id = p_uid) then return 'ok'; end if;
  select max_participants into v_max from public.challenge;
  select count(*) into v_count from public.challenge_members;
  if v_count >= v_max then return 'full'; end if;
  insert into public.challenge_members (user_id) values (p_uid);
  return 'ok';
end $$;
revoke all on function public.try_join(uuid, text) from public, anon, authenticated;

create function public.join_challenge(p_code text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return public.try_join(auth.uid(), p_code);
end $$;

-- Alta de usuario: crea perfil y, si el código de la metadata es válido, lo une al reto.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 40);
begin
  if char_length(v_name) < 2 then v_name := 'Participante'; end if;
  insert into public.profiles (id, display_name) values (new.id, v_name);
  insert into public.private_profiles (user_id) values (new.id);
  perform public.try_join(new.id, new.raw_user_meta_data ->> 'invite_code');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Marcar hábito: la fecha la decide el servidor (hoy en Bogotá). No hay días futuros ni pasados.
create function public.set_habit(p_habit text, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c public.challenge%rowtype; t date := public.challenge_today();
begin
  if auth.uid() is null or not public.is_member() then raise exception 'not_member'; end if;
  if p_habit not in ('entrenamiento', 'alimentacion', 'hidratacion', 'sueno') then raise exception 'invalid_habit'; end if;
  select * into c from public.challenge;
  if t < c.start_date or t > c.start_date + c.duration_days - 1 then raise exception 'outside_challenge'; end if;
  insert into public.habit_logs (user_id, log_date, habit_key, completed)
  values (auth.uid(), t, p_habit, p_done)
  on conflict (user_id, log_date, habit_key) do update set completed = excluded.completed;
end $$;

-- 4) Estadísticas públicas (derivadas, nunca editables) ------------------------
-- Regla provisional: 1 hábito completado = 10 XP. Racha = días consecutivos con 4/4 hábitos.
create view public.v_full_days as
  select user_id, log_date from public.habit_logs where completed
  group by user_id, log_date having count(*) = 4;

create view public.v_streaks as
  with d as (
    select user_id, log_date,
           log_date - (row_number() over (partition by user_id order by log_date))::int as grp
    from public.v_full_days
  ), g as (
    select user_id, count(*)::int as len, max(log_date) as last_day from d group by user_id, grp
  )
  select user_id, coalesce(max(len) filter (where last_day >= public.challenge_today() - 1), 0) as streak
  from g group by user_id;
revoke all on public.v_full_days, public.v_streaks from anon, authenticated;

create function public.group_board()
returns table (user_id uuid, display_name text, xp int, streak int, done_total int,
               days_elapsed int, main_goal text, today_done int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name,
         coalesce(h.n, 0) * 10, coalesce(s.streak, 0), coalesce(h.n, 0),
         greatest(1, least(c.duration_days, public.challenge_today() - c.start_date + 1)),
         case when pp.share_main_goal then pp.goal_main end,
         case when pp.share_today_habits then coalesce(t.n, 0) end,
         p.id = auth.uid()
  from public.challenge_members m
  join public.profiles p on p.id = m.user_id
  join public.private_profiles pp on pp.user_id = m.user_id
  cross join public.challenge c
  left join (select hl.user_id, count(*)::int n from public.habit_logs hl where hl.completed group by 1) h on h.user_id = m.user_id
  left join public.v_streaks s on s.user_id = m.user_id
  left join (select hl.user_id, count(*)::int n from public.habit_logs hl
             where hl.completed and hl.log_date = public.challenge_today() group by 1) t on t.user_id = m.user_id
  where public.is_member()
  order by 3 desc, 2
$$;

grant execute on function public.join_challenge(text), public.set_habit(text, boolean),
  public.group_board(), public.is_member(), public.challenge_today() to authenticated;
revoke execute on function public.join_challenge(text), public.set_habit(text, boolean),
  public.group_board(), public.is_member() from anon;

-- 5) RLS --------------------------------------------------------------------------
alter table public.challenge enable row level security;
alter table public.profiles enable row level security;
alter table public.challenge_members enable row level security;
alter table public.private_profiles enable row level security;
alter table public.body_measurements enable row level security;
alter table public.habit_logs enable row level security;

create policy challenge_read on public.challenge for select to authenticated using (public.is_member());
create policy profiles_own_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy members_own_read on public.challenge_members for select to authenticated using (user_id = (select auth.uid()));
create policy private_own_read on public.private_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy private_own_update on public.private_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy meas_own_all on public.body_measurements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy logs_own_read on public.habit_logs for select to authenticated using (user_id = (select auth.uid()));

-- Permisos de tabla: XP, vidas, racha y registros nunca se escriben desde el cliente.
revoke all on public.profiles, public.challenge_members, public.private_profiles,
  public.body_measurements, public.habit_logs, public.challenge from anon, authenticated;
grant select on public.challenge, public.challenge_members, public.habit_logs, public.profiles to authenticated;
grant update (display_name, onboarding_completed, onboarding_step) on public.profiles to authenticated;
grant select, update on public.private_profiles to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
