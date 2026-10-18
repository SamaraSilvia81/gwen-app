-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.7.0: projetos fixados
-- Rode depois do 005. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

alter table gwen.projects
  add column if not exists pinned boolean not null default false;
