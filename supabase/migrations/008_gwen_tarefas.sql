-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.9.0: tarefas por projeto
-- Rode depois do 007. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

create table if not exists gwen.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references gwen.projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  priority smallint not null default 0 check (priority between 0 and 4),
  labels jsonb,
  due_date date,
  position double precision not null default 0,
  github jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_project on gwen.tasks (user_id, project_id);

alter table gwen.tasks enable row level security;

drop policy if exists "tasks_own" on gwen.tasks;
create policy "tasks_own" on gwen.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
