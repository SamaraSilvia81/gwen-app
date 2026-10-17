-- G.W.E.N. local: frente da sessão (0.5)
-- Um projeto pode ter frentes (ex.: Landing e Plataforma). A sessão guarda qual
-- frente foi aberta, para somar o tempo do projeto e o de cada frente.
-- As frentes em si ficam nas pastas e links (JSON), sem coluna nova em projects.
-- Migrações só acrescentam (ADR-009).

ALTER TABLE sessions ADD COLUMN front TEXT;
