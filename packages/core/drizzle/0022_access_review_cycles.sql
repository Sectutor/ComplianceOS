-- Migration to create Access Review Cycles & Tasks tables (P2 #7 - access review automation)
-- Run this migration to add auto-provisioned access review + certification support.
-- Cycle = a scheduled access review round; Tasks = one certification unit per client user x role.

-- Create Access Review Cycles table
CREATE TABLE IF NOT EXISTS access_review_cycles (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for Access Review Cycles
CREATE INDEX IF NOT EXISTS idx_access_review_cycles_client ON access_review_cycles(client_id);
CREATE INDEX IF NOT EXISTS idx_access_review_cycles_due_date ON access_review_cycles(due_date);

-- Create Access Review Tasks table
CREATE TABLE IF NOT EXISTS access_review_tasks (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER NOT NULL REFERENCES access_review_cycles(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    due_date TIMESTAMP,
    note TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for Access Review Tasks
CREATE INDEX IF NOT EXISTS idx_access_review_tasks_cycle ON access_review_tasks(cycle_id);
CREATE INDEX IF NOT EXISTS idx_access_review_tasks_client_status ON access_review_tasks(client_id, status);

COMMENT ON TABLE access_review_cycles IS 'Scheduled access review rounds (auto-provisioned reviews + certification)';
COMMENT ON TABLE access_review_tasks IS 'One certification unit per client user x access role for a review cycle';
