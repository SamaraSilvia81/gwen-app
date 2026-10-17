-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.5.0: frente da sessão
-- Rode depois do 004. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

alter table gwen.sessions
  add column if not exists front text;
