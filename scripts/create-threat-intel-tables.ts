import { Client } from 'pg';
import 'dotenv/config';

async function createTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    await client.connect();

    const statements = [
        `CREATE TABLE IF NOT EXISTS nvd_cve_cache (
      id SERIAL PRIMARY KEY,
      cve_id VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      cvss_score VARCHAR(10),
      cvss_vector VARCHAR(255),
      cwe_ids JSON DEFAULT '[]',
      published_date TIMESTAMP,
      last_modified_date TIMESTAMP,
      affected_products JSON DEFAULT '[]',
      "references" JSON DEFAULT '[]',
      raw_data JSON,
      fetched_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP
    )`,
        `CREATE INDEX IF NOT EXISTS idx_nvd_cve_id ON nvd_cve_cache(cve_id)`,

        `CREATE TABLE IF NOT EXISTS cisa_kev_cache (
      id SERIAL PRIMARY KEY,
      cve_id VARCHAR(50) NOT NULL UNIQUE,
      vendor_project VARCHAR(255),
      product VARCHAR(255),
      vulnerability_name VARCHAR(500),
      short_description TEXT,
      required_action TEXT,
      due_date TIMESTAMP,
      known_ransomware_campaign_use BOOLEAN DEFAULT FALSE,
      date_added TIMESTAMP,
      fetched_at TIMESTAMP DEFAULT NOW()
    )`,
        `CREATE INDEX IF NOT EXISTS idx_kev_cve_id ON cisa_kev_cache(cve_id)`,

        `CREATE TABLE IF NOT EXISTS asset_cve_matches (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      asset_id INTEGER NOT NULL,
      cve_id VARCHAR(50) NOT NULL,
      match_score INTEGER DEFAULT 0,
      match_reason TEXT,
      is_kev BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'suggested',
      discovered_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewed_by INTEGER
    )`,
        `CREATE INDEX IF NOT EXISTS idx_asset_cve_asset ON asset_cve_matches(asset_id)`,
        `CREATE INDEX IF NOT EXISTS idx_asset_cve_client ON asset_cve_matches(client_id)`,
        `CREATE INDEX IF NOT EXISTS idx_asset_cve_cve ON asset_cve_matches(cve_id)`,

        `CREATE TABLE IF NOT EXISTS vendor_cve_matches (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL,
      cve_id VARCHAR(50) NOT NULL,
      match_score INTEGER DEFAULT 0,
      match_reason TEXT,
      status VARCHAR(50) DEFAULT 'Active',
      discovered_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewed_by INTEGER
    )`,
        `CREATE INDEX IF NOT EXISTS idx_vendor_cve_vendor ON vendor_cve_matches(vendor_id)`,
        `CREATE INDEX IF NOT EXISTS idx_vendor_cve_cve ON vendor_cve_matches(cve_id)`,

        `CREATE TABLE IF NOT EXISTS threat_intel_sync_log (
      id SERIAL PRIMARY KEY,
      source VARCHAR(50) NOT NULL,
      sync_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      records_processed INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      error_message TEXT
    )`
    ];

    for (const sql of statements) {
        try {
            await client.query(sql);
        } catch (err: any) {
            console.warn(`Warning (may be OK): ${err.message}`);
        }
    }

    console.log('Threat intelligence tables created/verified successfully');
    await client.end();
}

createTables().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
