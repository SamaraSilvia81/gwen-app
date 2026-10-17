-- ═══════════════════════════════════════════════
-- G.W.E.N. V1: schema inicial
--
-- Tudo fica no schema "gwen", separado do "public". Assim a G.W.E.N. pode
-- morar num projeto Supabase que você já usa para outro app, sem conflito
-- de nomes de tabela. O login (auth.users) é compartilhado entre os apps
-- do mesmo projeto.
--
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Depois: Project Settings > Data API > Exposed schemas > adicione "gwen".
-- ═══════════════════════════════════════════════

create schema if not exists gwen;

-- a API (PostgREST) precisa enxergar o schema
grant usage on schema gwen to anon, authenticated, service_role;
alter default privileges in schema gwen grant all on tables to anon, authenticated, service_role;
alter default privileges in schema gwen grant all on routines to anon, authenticated, service_role;
alter default privileges in schema gwen grant all on sequences to anon, authenticated, service_role;

-- ─── PERFIL ───
-- criado pelo próprio app no primeiro login (sem trigger no auth.users,
-- para não interferir nos outros apps do mesmo projeto)
create table if not exists gwen.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme text not null default 'noir' check (theme in ('noir', 'custom')),
  style text not null default 'moderno' check (style in ('moderno', 'terminal')),
  custom_colors jsonb,
  git_bash_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── CATEGORIAS ───
create table if not exists gwen.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── PROJETOS ───
-- folders: [{ "label": "...", "path": "C:\\...", "action": "vscode|explorer|gitbash", "on_launch": true }]
-- links:   [{ "label": "...", "url": "https://...", "on_launch": true }]
create table if not exists gwen.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references gwen.categories (id) on delete set null,
  name text not null,
  description text,
  status text not null default 'ideia' check (status in ('ideia', 'andamento', 'pausado', 'concluido')),
  folders jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── SESSÕES DE TRABALHO ───
-- ended_at nulo = sessão ativa. last_seen_at é atualizado pelo app a cada minuto
-- e serve para detectar sessão esquecida aberta.
create table if not exists gwen.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references gwen.projects (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_seen_at timestamptz not null default now(),
  paused_seconds int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- ─── PAUSAS ───
create table if not exists gwen.breaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid references gwen.sessions (id) on delete set null,
  kind text not null check (kind in ('cafe', 'refeicao', 'leitura', 'respiro', 'outro')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- uma sessão ativa e uma pausa ativa por pessoa
create unique index if not exists sessions_one_active on gwen.sessions (user_id) where ended_at is null;
create unique index if not exists breaks_one_active on gwen.breaks (user_id) where ended_at is null;

create index if not exists sessions_user_started on gwen.sessions (user_id, started_at desc);
create index if not exists projects_user on gwen.projects (user_id);
create index if not exists breaks_user_started on gwen.breaks (user_id, started_at desc);

-- permissões nas tabelas já criadas (o default privileges vale só para as próximas)
grant all on all tables in schema gwen to anon, authenticated, service_role;

-- updated_at automático
create or replace function gwen.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on gwen.projects;
create trigger projects_touch before update on gwen.projects
  for each row execute function gwen.touch_updated_at();

drop trigger if exists profiles_touch on gwen.profiles;
create trigger profiles_touch before update on gwen.profiles
  for each row execute function gwen.touch_updated_at();

-- ─── RLS: cada pessoa só vê e mexe nos próprios dados ───
alter table gwen.profiles enable row level security;
alter table gwen.categories enable row level security;
alter table gwen.projects enable row level security;
alter table gwen.sessions enable row level security;
alter table gwen.breaks enable row level security;

drop policy if exists "profiles_own" on gwen.profiles;
create policy "profiles_own" on gwen.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "categories_own" on gwen.categories;
create policy "categories_own" on gwen.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "projects_own" on gwen.projects;
create policy "projects_own" on gwen.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sessions_own" on gwen.sessions;
create policy "sessions_own" on gwen.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "breaks_own" on gwen.breaks;
create policy "breaks_own" on gwen.breaks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
