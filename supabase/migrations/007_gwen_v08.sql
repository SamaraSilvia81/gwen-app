-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.8.0: sessões em paralelo e lançador de apps
-- Rode depois do 006. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

-- várias sessões abertas ao mesmo tempo (antes era uma por conta)
drop index if exists gwen.sessions_one_active;

-- apps cadastrados, categorias e alertas
alter table gwen.profiles
  add column if not exists launcher jsonb;

-- apps que abrem no Começar agora de cada projeto
alter table gwen.projects
  add column if not exists apps jsonb;

-- O tempo por app (mapeamento) fica só no computador, por privacidade:
-- não há tabela dele na nuvem.
