-- Create client_settings table for storing client-specific overrides
-- This allows 100+ organizations to have unique branding and feature configurations
-- while maintaining a single upgradable premium version codebase

CREATE TABLE IF NOT EXISTS client_settings (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL UNIQUE,
    branding_overrides JSONB,
    feature_flags JSONB,
    custom_settings JSONB,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure client_id references a valid client (if clients table exists)
    -- CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create index for fast lookups by client_id
CREATE INDEX IF NOT EXISTS idx_client_settings_client_id ON client_settings(client_id);

-- Create index for version tracking (useful for migrations)
CREATE INDEX IF NOT EXISTS idx_client_settings_version ON client_settings(version);

-- Comment on table and columns for documentation
COMMENT ON TABLE client_settings IS 'Stores client-specific overrides for branding, features, and settings. Enables 100+ orgs to customize while sharing single premium version codebase.';
COMMENT ON COLUMN client_settings.client_id IS 'Foreign key to clients table (when available). Unique identifier for the organization.';
COMMENT ON COLUMN client_settings.branding_overrides IS 'JSONB containing only branding fields that differ from premium defaults (colors, logos, fonts, etc.)';
COMMENT ON COLUMN client_settings.feature_flags IS 'JSONB containing feature toggles that differ from premium defaults (true/false per feature)';
COMMENT ON COLUMN client_settings.custom_settings IS 'JSONB for future extensibility (custom text, UI preferences, etc.)';
COMMENT ON COLUMN client_settings.version IS 'Schema version of the override structure for migration tracking';
COMMENT ON COLUMN client_settings.created_at IS 'Timestamp when the client settings record was created';
COMMENT ON COLUMN client_settings.updated_at IS 'Timestamp when the client settings record was last updated';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_client_settings_updated_at ON client_settings;
CREATE TRIGGER update_client_settings_updated_at
    BEFORE UPDATE ON client_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();