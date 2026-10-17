-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.4.0: foto do perfil
-- Rode depois do 003. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

alter table gwen.profiles
  add column if not exists avatar text;
