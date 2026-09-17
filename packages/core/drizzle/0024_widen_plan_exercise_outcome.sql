-- GAP-17 (GAP-LOG.md): plan_exercises.outcome was varchar(50), which cannot hold
-- meaningful exercise results ("passed-with-findings" barely fits and detail had to
-- spill into notes). Widen the column to text so outcomes carry full result prose.
-- Applied manually to live demo data where needed; safe/idempotent-ish (type widen only).

ALTER TABLE plan_exercises ALTER COLUMN outcome TYPE text;
