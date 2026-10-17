-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.3.0: modo saúde (lembretes de água, alongamento e olhos)
-- Rode depois do 002. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

-- configuração do modo saúde por pessoa
-- { "enabled": true, "onlyInSession": true,
--   "reminders": { "agua": { "on": true, "every": 45 }, "alongamento": {...}, "olhos": {...} } }
alter table gwen.profiles
  add column if not exists wellness jsonb;

-- pausa de alongamento guiada
alter table gwen.breaks drop constraint if exists breaks_kind_check;
alter table gwen.breaks
  add constraint breaks_kind_check check (kind in ('cafe', 'refeicao', 'leitura', 'respiro', 'alongamento', 'outro'));

-- o que a pessoa fez com cada lembrete (base para entender os próprios hábitos)
create table if not exists gwen.wellness_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('agua', 'alongamento', 'olhos')),
  action text not null check (action in ('feito', 'adiado', 'dispensado')),
  session_id uuid references gwen.sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists wellness_events_user_created on gwen.wellness_events (user_id, created_at desc);

grant all on gwen.wellness_events to anon, authenticated, service_role;

alter table gwen.wellness_events enable row level security;

drop policy if exists "wellness_events_own" on gwen.wellness_events;
create policy "wellness_events_own" on gwen.wellness_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
