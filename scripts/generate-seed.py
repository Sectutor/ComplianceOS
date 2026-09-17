#!/usr/bin/env python3
"""
Generate seed SQL that matches the EXACT schema of the live database.
Introspects each table's columns and generates INSERTs with correct names.

Usage: python3 scripts/generate-seed.py > scripts/seed-final.sql
"""

import subprocess, json

DB = "complianceos-db-1"
DSN = "postgres://complianceos:complianceos@db:5432/complianceos"

def sql(query):
    r = subprocess.run(["docker", "exec", "-i", DB, "psql", "-U", "complianceos", "-d", "complianceos", "-t", "-A"],
                       input=query, capture_output=True, text=True, timeout=10)
    return r.stdout.strip()

def get_columns(table):
    out = sql(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND table_schema='public' ORDER BY ordinal_position")
    return [c.strip() for c in out.split('\n') if c.strip()]

def col_type(table, col):
    out = sql(f"SELECT data_type FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}' AND table_schema='public'")
    return out

# Main tables for demo + their sample data
TABLES = {
    "clients": {
        1: {"name": "AcmeCorp CyberSecurity", "description": "Demo client for ComplianceOS evaluation", "industry": "Cybersecurity", "size": "200", "status": "active"},
    },
    "users": {
        1: {"open_id": "demo-admin-1", "name": "Alex Chen", "email": "admin@complianceos.local", "role": "owner"},
        2: {"open_id": "demo-user-2", "name": "Sarah Miller", "email": "compliance@acmecorp.com", "role": "admin"},
        3: {"open_id": "demo-user-3", "name": "James Wilson", "email": "auditor@acmecorp.com", "role": "auditor"},
        4: {"open_id": "demo-user-4", "name": "David Park", "email": "engineering@acmecorp.com", "role": "editor"},
    },
    "user_clients": {
        "": [{"user_id": 1, "client_id": 1, "role": "owner"}, {"user_id": 2, "client_id": 1, "role": "admin"},
             {"user_id": 3, "client_id": 1, "role": "auditor"}, {"user_id": 4, "client_id": 1, "role": "editor"}],
    },
    "assets": {
        1: {"client_id": 1, "name": "Production Web App", "type": "application", "description": "Customer-facing SaaS platform", "owner": "Engineering", "status": "active", "location": "AWS eu-central-1"},
        2: {"client_id": 1, "name": "Corporate Database", "type": "database", "description": "PostgreSQL with customer data", "owner": "Engineering", "status": "active", "location": "AWS eu-central-1"},
        3: {"client_id": 1, "name": "Employee Endpoints", "type": "endpoint", "description": "200 company devices", "owner": "IT", "status": "active", "location": "Berlin / Remote"},
        4: {"client_id": 1, "name": "AWS Cloud Infrastructure", "type": "cloud", "description": "ECS, S3, RDS, Lambda", "owner": "Engineering", "status": "active", "location": "AWS eu-central-1"},
        5: {"client_id": 1, "name": "Internal API Gateway", "type": "application", "description": "Kong API Gateway", "owner": "Engineering", "status": "active", "location": "AWS eu-central-1"},
    },
}

# Try to generate INSERTs dynamically
# But first, let's just dump the table schemas for the key tables
key_tables = ["clients", "users", "user_clients", "assets", "client_frameworks",
              "client_controls", "control_baselines", "control_mappings",
              "compliance_frameworks", "controls", "common_controls",
              "risk_scenarios", "risk_assessments", "risk_treatments",
              "evidence", "incidents", "remediation_tasks", "vendors",
              "vendor_assessments", "client_policies", "policy_versions",
              "compliance_certificates", "notification_log", "audit_logs",
              "client_contacts"]

print("-- Schema introspection for demo seed")
print("-- Generated from live Supabase-compatible schema")
print()
for table in key_tables:
    cols = get_columns(table)
    types = [col_type(table, c) for c in cols]
    print(f"-- {table}: {', '.join(f'{c} ({t})' for c, t in zip(cols, types))}")
