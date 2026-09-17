-- Migration for program_guide_assignments table
-- Required by programGuides router

CREATE TABLE IF NOT EXISTS program_guide_assignments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    guide_type VARCHAR(50) NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL,
    target_date TIMESTAMP,
    assigned_by INTEGER,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for client lookups
CREATE INDEX IF NOT EXISTS idx_pga_client ON program_guide_assignments(client_id);

-- Unique index for upsert operations
CREATE INDEX IF NOT EXISTS idx_pga_unique_step ON program_guide_assignments(client_id, guide_type, step_id);
