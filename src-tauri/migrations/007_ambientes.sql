-- G.W.E.N. local: ambientes de uso (0.9.2, ADR-015)
-- Lista de ids em JSON (["ti", "academico"]). Nulo vale Geral.
-- Quem já usava a G.W.E.N. continua como TI, para nada mudar na atualização.
-- Migrações só acrescentam (ADR-009).

ALTER TABLE profiles ADD COLUMN environments TEXT;
UPDATE profiles SET environments = '["ti"]' WHERE environments IS NULL;
