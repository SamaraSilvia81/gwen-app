-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.9.2: contagem anônima de instalações
-- Rode depois do 008. Pode rodar mais de uma vez.
--
-- Cada instalação manda um código aleatório, a versão, o sistema e o idioma.
-- Nada que identifique a pessoa. A chave anon NÃO lê nem escreve a tabela:
-- só chama as duas funções abaixo. Quem lê é você, pelo painel do Supabase.
-- ═══════════════════════════════════════════════

create table if not exists gwen.installs (
  id uuid primary key,
  origin text not null default 'app' check (origin in ('app', 'app-dev', 'web-dev')),
  version text,
  os text,
  locale text,
  onboarded boolean not null default false,
  active_days integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists installs_last_seen on gwen.installs (last_seen desc);

alter table gwen.installs enable row level security;
-- sem policy de propósito: anon e authenticated não acessam a tabela direto
revoke all on gwen.installs from anon, authenticated;

-- ─── registra ou atualiza a instalação ───
create or replace function gwen.heartbeat(
  p_id uuid,
  p_origin text,
  p_version text,
  p_os text,
  p_locale text,
  p_onboarded boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_origin not in ('app', 'app-dev', 'web-dev') then
    raise exception 'origin inválida';
  end if;

  insert into gwen.installs (id, origin, version, os, locale, onboarded)
  values (p_id, p_origin, left(p_version, 20), left(p_os, 30), left(p_locale, 15), coalesce(p_onboarded, false))
  on conflict (id) do update set
    origin = excluded.origin,
    version = excluded.version,
    os = excluded.os,
    locale = excluded.locale,
    onboarded = gwen.installs.onboarded or excluded.onboarded,
    -- conta um dia a mais só na primeira vez que aparece no dia
    active_days = gwen.installs.active_days
      + case when (gwen.installs.last_seen at time zone 'America/Sao_Paulo')::date < today then 1 else 0 end,
    last_seen = now();
end;
$$;

-- ─── desligar em Ajustes apaga o registro ───
create or replace function gwen.forget_install(p_id uuid) returns void
language sql
security definer
set search_path = ''
as $$
  delete from gwen.installs where id = p_id;
$$;

revoke all on function gwen.heartbeat(uuid, text, text, text, text, boolean) from public;
revoke all on function gwen.forget_install(uuid) from public;
grant execute on function gwen.heartbeat(uuid, text, text, text, text, boolean) to anon, authenticated;
grant execute on function gwen.forget_install(uuid) to anon, authenticated;

-- ═══════════════════════════════════════════════
-- Consultas úteis (rode no SQL Editor, não fazem parte da migration)
-- ═══════════════════════════════════════════════
-- Instalações reais (sem testes):
--   select * from gwen.installs where origin = 'app' order by last_seen desc;
--
-- Ativas nos últimos 7 e 30 dias:
--   select
--     count(*) filter (where last_seen > now() - interval '7 days')  as ativas_7d,
--     count(*) filter (where last_seen > now() - interval '30 days') as ativas_30d,
--     count(*) as total
--   from gwen.installs where origin = 'app';
--
-- Por versão:
--   select version, count(*) from gwen.installs where origin = 'app' group by 1 order by 1 desc;
--
-- Limpar os testes do navegador:
--   delete from gwen.installs where origin = 'web-dev';
