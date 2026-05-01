-- ─────────────────────────────────────────────────────────────────────────────
-- L Board — Módulo de Projetos
-- Execute no SQL Editor do Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Projects ─────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text,
  objectives   text,
  scope        text,
  deliverables text,
  risks        text,
  status       text        NOT NULL DEFAULT 'planning'
                           CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  priority     text        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date   date,
  end_date     date,
  owner_id     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Project Members ──────────────────────────────────────────────────────────

CREATE TABLE project_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ─── Project Tasks (Atividades) ───────────────────────────────────────────────

CREATE TABLE project_tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  assigned_to uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  due_date    date,
  position    integer     NOT NULL DEFAULT 0,
  completed   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Project Subtasks (Sub-Atividades) ────────────────────────────────────────

CREATE TABLE project_subtasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  assigned_to uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  due_date    date,
  completed   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON projects         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON project_members  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON project_tasks    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON project_subtasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
