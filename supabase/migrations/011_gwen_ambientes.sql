-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.9.2: ambientes de uso (ADR-015)
-- Rode depois do 010, uma vez só (o update marca perfis antigos como TI).
--
-- Lista de ids (["ti", "academico"]). Nulo vale Geral.
-- Quem já tinha perfil continua como TI.
-- ═══════════════════════════════════════════════

alter table gwen.profiles
  add column if not exists environments jsonb;

update gwen.profiles set environments = '["ti"]'::jsonb where environments is null;
