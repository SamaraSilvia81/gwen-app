-- G.W.E.N. local: projetos fixados (0.7)
-- Fixar deixa o projeto no topo do painel lateral, na seção Fixados.
-- Migrações só acrescentam (ADR-009).

ALTER TABLE projects ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
