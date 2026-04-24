-- Allow a status to be flagged as "completion" status.
-- Tasks with such a status are treated as done and moved to the done section.

ALTER TABLE tarefa_statuses
  ADD COLUMN marks_done BOOLEAN NOT NULL DEFAULT FALSE;

-- "Concluído" is the default completion status
UPDATE tarefa_statuses SET marks_done = TRUE WHERE name = 'Concluído';
