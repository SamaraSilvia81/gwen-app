-- ═══════════════════════════════════════════════
-- G.W.E.N. V1: schema inicial
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run
-- ═══════════════════════════════════════════════

-- ─── PERFIL ───
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme text not null default 'noir' check (theme in ('noir', 'devs_sam', 'custom')),
  style text not null default 'moderno' check (style in ('moderno', 'terminal')),
  custom_colors jsonb,
  git_bash_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cria o perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── CATEGORIAS ───
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── PROJETOS ───
-- folders: [{ "label": "...", "path": "C:\\...", "action": "vscode|explorer|gitbash", "on_launch": true }]
-- links:   [{ "label": "...", "url": "https://...", "on_launch": true }]
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
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
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_seen_at timestamptz not null default now(),
  paused_seconds int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- ─── PAUSAS ───
create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind text not null check (kind in ('cafe', 'refeicao', 'leitura', 'respiro', 'outro')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- uma sessão ativa e uma pausa ativa por pessoa
create unique index if not exists sessions_one_active on public.sessions (user_id) where ended_at is null;
create unique index if not exists breaks_one_active on public.breaks (user_id) where ended_at is null;

create index if not exists sessions_user_started on public.sessions (user_id, started_at desc);
create index if not exists projects_user on public.projects (user_id);
create index if not exists breaks_user_started on public.breaks (user_id, started_at desc);

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── RLS: cada pessoa só vê e mexe nos próprios dados ───
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.sessions enable row level security;
alter table public.breaks enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "categories_own" on public.categories;
create policy "categories_own" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "projects_own" on public.projects;
create policy "projects_own" on public.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sessions_own" on public.sessions;
create policy "sessions_own" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "breaks_own" on public.breaks;
create policy "breaks_own" on public.breaks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
