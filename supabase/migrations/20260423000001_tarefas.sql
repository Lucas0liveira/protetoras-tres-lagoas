-- ─── Task board ───────────────────────────────────────────────────────────────

-- Configurable status options
CREATE TABLE tarefa_statuses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#94A3B8',
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tarefa_statuses (name, color, sort_order) VALUES
  ('Não iniciado', '#94A3B8', 0),
  ('Em andamento',  '#F97316', 1),
  ('Parado',        '#EF4444', 2),
  ('Cancelado',     '#6B7280', 3),
  ('Concluído',     '#22C55E', 4);

-- Tasks
-- created_by / updated_by reference profiles (profiles.id = auth.users.id)
CREATE TABLE tarefas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  responsible_id UUID REFERENCES colaboradoras(id) ON DELETE SET NULL,
  status_id      UUID REFERENCES tarefa_statuses(id) ON DELETE SET NULL,
  deadline       DATE,
  priority       TEXT CHECK (priority IN ('alta', 'media', 'baixa')),
  is_done        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

-- Field-change activity log (system-generated)
CREATE TABLE tarefa_atividades (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id  UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  field      TEXT NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-written updates / comments
CREATE TABLE tarefa_updates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id  UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE tarefa_statuses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_updates    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_tarefa_statuses"
  ON tarefa_statuses FOR ALL USING (is_member()) WITH CHECK (is_member());

CREATE POLICY "members_tarefas"
  ON tarefas FOR ALL USING (is_member()) WITH CHECK (is_member());

CREATE POLICY "members_tarefa_atividades"
  ON tarefa_atividades FOR ALL USING (is_member()) WITH CHECK (is_member());

CREATE POLICY "members_tarefa_updates"
  ON tarefa_updates FOR ALL USING (is_member()) WITH CHECK (is_member());

-- ─── Triggers ─────────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_tarefas
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER set_updated_at_tarefa_updates
  BEFORE UPDATE ON tarefa_updates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
