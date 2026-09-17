-- Migration 0023: Company Memory Cortex / VFS tables
-- Creates company_memory_nodes + company_memory_relations backing the native VFS +
-- vector unified memory engine ("Compliance Cortex"). Matches packages/core/src/schema.ts.
-- NOTE: intentionally NOT executed automatically; run manually against the target DB.

-- Create Company Memory Nodes table (VFS tree: folders, documents, facts, web intel, asset profiles)
CREATE TABLE IF NOT EXISTS company_memory_nodes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    path VARCHAR(500) NOT NULL,
    parent_path VARCHAR(500) NOT NULL DEFAULT '/',
    node_type VARCHAR(50) NOT NULL DEFAULT 'document',
    title VARCHAR(255) NOT NULL,
    summary_l0 TEXT,
    content_l2 TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for Company Memory Nodes
CREATE UNIQUE INDEX IF NOT EXISTS idx_cmn_client_path ON company_memory_nodes(client_id, path);
CREATE INDEX IF NOT EXISTS idx_cmn_client_parent ON company_memory_nodes(client_id, parent_path);
CREATE INDEX IF NOT EXISTS idx_cmn_type ON company_memory_nodes(node_type);

-- Create Company Memory Relations table (typed graph edges between memory nodes)
CREATE TABLE IF NOT EXISTS company_memory_relations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    source_node_id INTEGER NOT NULL,
    target_node_id INTEGER NOT NULL,
    relation_type VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for Company Memory Relations
CREATE INDEX IF NOT EXISTS idx_cmr_source ON company_memory_relations(source_node_id);
CREATE INDEX IF NOT EXISTS idx_cmr_target ON company_memory_relations(target_node_id);
CREATE INDEX IF NOT EXISTS idx_cmr_client ON company_memory_relations(client_id);

COMMENT ON TABLE company_memory_nodes IS 'Company Memory Cortex VFS nodes (folders/documents/facts/web intel/asset profiles)';
COMMENT ON TABLE company_memory_relations IS 'Typed relations between company memory nodes (depends_on, stores_data, mitigates, etc.)';
