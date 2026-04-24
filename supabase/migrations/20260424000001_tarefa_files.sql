-- File attachments per task, stored in Cloudinary.
-- resource_type: 'image' for images (uploaded via /image/upload),
--                'raw'   for other files (uploaded via /raw/upload).

CREATE TABLE tarefa_files (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id      UUID        NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  uploader_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  file_name      TEXT        NOT NULL,
  storage_url    TEXT        NOT NULL,
  resource_type  TEXT        NOT NULL DEFAULT 'raw',
  bytes          INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tarefa_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can manage tarefa_files"
  ON tarefa_files FOR ALL
  USING (is_member()) WITH CHECK (is_member());
