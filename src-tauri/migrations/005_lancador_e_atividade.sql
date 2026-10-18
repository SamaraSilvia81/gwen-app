-- G.W.E.N. local: lançador de apps, apps por projeto e mapeamento de apps (0.8)
-- Migrações só acrescentam (ADR-009).

-- apps cadastrados, categorias escolhidas e alertas (JSON)
ALTER TABLE profiles ADD COLUMN launcher TEXT;

-- apps que abrem no Começar agora de cada projeto (lista de ids, JSON)
ALTER TABLE projects ADD COLUMN apps TEXT;

-- tempo por app por dia. Fica só neste computador, mesmo no modo conta.
-- Guarda o executável e a categoria, nunca o título da janela.
CREATE TABLE IF NOT EXISTS app_usage (
  id TEXT PRIMARY KEY,          -- "AAAA-MM-DD::exe"
  day TEXT NOT NULL,
  exe TEXT NOT NULL,
  path TEXT,
  category TEXT,
  seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_usage_day ON app_usage (day);
