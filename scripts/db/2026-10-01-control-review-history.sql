-- Idempotent migration: control review cycles + client control status history.
-- Safe to re-run.
ALTER TABLE client_controls
  ADD COLUMN IF NOT EXISTS next_review_date timestamp,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp;

CREATE TABLE IF NOT EXISTS client_control_history (
  id serial PRIMARY KEY,
  client_control_id integer NOT NULL REFERENCES client_controls(id) ON DELETE CASCADE,
  from_status varchar(50),
  to_status varchar(50) NOT NULL,
  changed_by_user_id integer,
  changed_by_name varchar(255),
  note text,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cch_client_control ON client_control_history(client_control_id);

-- Backfill one history row per already-implemented control so trend data
-- is not empty on existing workspaces (skips controls that already have history).
INSERT INTO client_control_history (client_control_id, from_status, to_status, changed_by_name, note, created_at)
SELECT cc.id, NULL, cc.status, 'System', 'Backfilled: control was already implemented', COALESCE(cc.implementation_date, cc.updated_at, now())
FROM client_controls cc
WHERE cc.status = 'implemented'
  AND NOT EXISTS (SELECT 1 FROM client_control_history h WHERE h.client_control_id = cc.id);

-- Give implemented controls an initial recertification date if they have none.
UPDATE client_controls
SET next_review_date = COALESCE(implementation_date, updated_at, now()) + interval '365 days'
WHERE status = 'implemented' AND next_review_date IS NULL;
