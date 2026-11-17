-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.9.2: nome e foto junto da instalação
-- Rode depois do 009. Pode rodar mais de uma vez.
--
-- A instalação passa a mandar também o nome e a foto (192x192, poucos KB)
-- escolhidos na abertura. Continua sem projetos, tempos, pastas ou e-mail.
-- Desligar em Ajustes > Dados apaga a linha inteira (forget_install).
-- ═══════════════════════════════════════════════

alter table gwen.installs add column if not exists display_name text;
alter table gwen.installs add column if not exists avatar text;

-- a assinatura mudou: remove a antiga para não ficarem duas versões
drop function if exists gwen.heartbeat(uuid, text, text, text, text, boolean);

create or replace function gwen.heartbeat(
  p_id uuid,
  p_origin text,
  p_version text,
  p_os text,
  p_locale text,
  p_onboarded boolean,
  p_name text default null,
  p_avatar text default null
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
  -- a foto do app tem poucos KB; acima disso não é a foto do app
  if p_avatar is not null and length(p_avatar) > 200000 then
    p_avatar := null;
  end if;

  insert into gwen.installs (id, origin, version, os, locale, onboarded, display_name, avatar)
  values (p_id, p_origin, left(p_version, 20), left(p_os, 30), left(p_locale, 15), coalesce(p_onboarded, false),
          left(p_name, 80), p_avatar)
  on conflict (id) do update set
    origin = excluded.origin,
    version = excluded.version,
    os = excluded.os,
    locale = excluded.locale,
    onboarded = gwen.installs.onboarded or excluded.onboarded,
    display_name = excluded.display_name,
    avatar = excluded.avatar,
    active_days = gwen.installs.active_days
      + case when (gwen.installs.last_seen at time zone 'America/Sao_Paulo')::date < today then 1 else 0 end,
    last_seen = now();
end;
$$;

revoke all on function gwen.heartbeat(uuid, text, text, text, text, boolean, text, text) from public;
grant execute on function gwen.heartbeat(uuid, text, text, text, text, boolean, text, text) to anon, authenticated;

-- Quem usa (sem a foto, que é grande para a grade):
--   select display_name, version, os, active_days, last_seen
--   from gwen.installs where origin = 'app' order by last_seen desc;
