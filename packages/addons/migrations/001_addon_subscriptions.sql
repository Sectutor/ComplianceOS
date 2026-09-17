-- Create addon_subscriptions table
-- Tracks which addons each client has subscribed to
CREATE TABLE IF NOT EXISTS addon_subscriptions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    addon_slug VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'trial',
    trial_ends_at TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    settings JSONB NOT NULL DEFAULT '{}',
    stripe_subscription_id VARCHAR(128),
    stripe_price_id VARCHAR(128),
    last_sync_at TIMESTAMP,
    next_scheduled_run TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast lookup: find a client's subscription to a specific addon
CREATE INDEX IF NOT EXISTS idx_addon_sub_client_addon
    ON addon_subscriptions (client_id, addon_slug);

-- Index for finding all active subscriptions (cron scheduling)
CREATE INDEX IF NOT EXISTS idx_addon_sub_status
    ON addon_subscriptions (status);

-- Index for finding subscriptions due for a run
CREATE INDEX IF NOT EXISTS idx_addon_sub_next_run
    ON addon_subscriptions (next_scheduled_run);

-- Index for unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_addon_sub_unique
    ON addon_subscriptions (client_id, addon_slug, status)
    WHERE status IN ('trial', 'active');

-- Create addon_run_logs table
-- Tracks individual runs/executions of each addon
CREATE TABLE IF NOT EXISTS addon_run_logs (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES addon_subscriptions(id) ON DELETE SET NULL,
    addon_slug VARCHAR(64) NOT NULL,
    client_id INTEGER NOT NULL,
    trigger VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    findings_count INTEGER DEFAULT 0,
    risks_created INTEGER DEFAULT 0,
    evidence_pushed INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    error_message TEXT,
    summary JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for finding recent runs for a subscription
CREATE INDEX IF NOT EXISTS idx_addon_runs_subscription
    ON addon_run_logs (subscription_id);

-- Index for finding runs for a client (dashboard view)
CREATE INDEX IF NOT EXISTS idx_addon_runs_client
    ON addon_run_logs (client_id);

-- Index for finding runs by addon type
CREATE INDEX IF NOT EXISTS idx_addon_runs_addon
    ON addon_run_logs (addon_slug);

-- Index for time-based queries (recent runs)
CREATE INDEX IF NOT EXISTS idx_addon_runs_started
    ON addon_run_logs (started_at DESC);
