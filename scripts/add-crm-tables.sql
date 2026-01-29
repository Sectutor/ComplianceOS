-- Safe migration to add CRM tables
-- This script only CREATES new tables, does not modify or delete existing ones

CREATE TABLE IF NOT EXISTS global_contacts (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  company VARCHAR(255),
  role VARCHAR(255),
  phone VARCHAR(50),
  source VARCHAR(50) DEFAULT 'manual',
  status VARCHAR(50) DEFAULT 'lead',
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gc_email ON global_contacts(email);
CREATE INDEX IF NOT EXISTS idx_gc_status ON global_contacts(status);

CREATE TABLE IF NOT EXISTS client_contacts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  department VARCHAR(255),
  role VARCHAR(100),
  phone VARCHAR(50),
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clc_client ON client_contacts(client_id);

-- Done!
SELECT 'CRM tables created successfully!' AS result;
