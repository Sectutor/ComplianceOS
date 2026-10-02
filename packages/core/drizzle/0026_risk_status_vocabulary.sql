-- Risk status vocabulary unification (2026-10):
-- risk_assessments.status only allowed draft/approved/reviewed, but the
-- compliance snapshot (routers.ts) and risk_scenarios filters expect
-- 'treated'/'accepted' — so mitigated counts were always 0 and the
-- compliance risk score always read 100% open. Extend the enum so the
-- full lifecycle (draft -> approved -> reviewed -> treated/accepted) is
-- expressible, then align the tRPC inputs and UI selects.

ALTER TYPE risk_assessment_status ADD VALUE IF NOT EXISTS 'treated';
ALTER TYPE risk_assessment_status ADD VALUE IF NOT EXISTS 'accepted';
