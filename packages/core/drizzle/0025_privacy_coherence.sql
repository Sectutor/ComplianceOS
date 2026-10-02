-- Privacy module coherence pass (2026-10):
-- 1. privacy_assessments.type stores prefixed record titles ("DPIA: <title>", "TIA: <title>")
--    that overflow varchar(50) for long names (e.g. 56-char TIA preset names) → Postgres
--    insert errors. Widen to text.
-- 2. dsar_requests.purge_checklist persists the cross-asset discovery & purge checklist
--    (previously component-local useState only, lost on navigation).
-- 3. data_breaches.metadata holds structured incident fields (title, severity, categories,
--    estimated subjects, containment) that have no dedicated columns; keeps the register's
--    rich UI data alongside the relational status/dates/notifiable columns.

ALTER TABLE privacy_assessments ALTER COLUMN type TYPE text;

ALTER TABLE dsar_requests ADD COLUMN IF NOT EXISTS purge_checklist jsonb;

ALTER TABLE data_breaches ADD COLUMN IF NOT EXISTS metadata jsonb;
