-- Tracks when each user last visited the Tarefas board.
-- One row per user (upserted on mount), used to show "Lucas viewed 2h ago".

CREATE TABLE tarefa_board_views (
  user_id    UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tarefa_board_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can manage board views"
  ON tarefa_board_views FOR ALL
  USING (is_member()) WITH CHECK (is_member());
