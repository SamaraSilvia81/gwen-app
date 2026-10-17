-- G.W.E.N. local: foto do perfil
-- Guarda a imagem já reduzida (192 x 192, data URL), então cabe no próprio registro do perfil.
-- Migrações só acrescentam (ADR-009).

ALTER TABLE profiles ADD COLUMN avatar TEXT;
