-- G.W.E.N. local: tarefas por projeto (0.9)
-- Migrações só acrescentam (ADR-009).

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',      -- todo | doing | review | done
  priority INTEGER NOT NULL DEFAULT 0,      -- 0 nenhuma, 1 baixa, 2 média, 3 alta, 4 urgente
  labels TEXT,                              -- JSON: ["front", "bug"]
  due_date TEXT,                            -- AAAA-MM-DD
  position REAL NOT NULL DEFAULT 0,         -- ordem dentro da coluna
  github TEXT,                              -- JSON: { repo, number, url, state }
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks (project_id);
