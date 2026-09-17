#!/usr/bin/env python3
"""
Extract Intellfence demo client data from Supabase into portable SQL.
Usage: python3 scripts/extract-demo.py "postgresql://..."
Output: scripts/seed-demo-full.sql (portable, no credentials, COPY format)
"""

import sys, subprocess

DSN = sys.argv[1] if len(sys.argv) > 1 else None
if not DSN:
    print("Usage: python3 scripts/extract-demo.py <postgresql://...>")
    sys.exit(1)

CLIENT_ID = 3

def sql(query):
    r = subprocess.run(["docker", "exec", "-i", "complianceos-db-1", "psql", DSN, "-t", "-A"],
                       input=query, capture_output=True, text=True, timeout=30)
    return r.stdout.strip()

def copy_data(table, where):
    # Pass explicit column list to avoid OID/sequence issues
    cols = get_columns(table)
    col_csv = ','.join(cols)
    r = subprocess.run(
        ["docker", "exec", "-i", "complianceos-db-1", "psql", DSN, "--csv"],
        input=f"SELECT {col_csv} FROM \"{table}\" WHERE {where};\n",
        capture_output=True, text=True, timeout=120
    )
    # Skip header line
    lines = r.stdout.split('\n', 1)
    return lines[1] if len(lines) > 1 else ''

def get_columns(table):
    out = sql(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND table_schema='public' ORDER BY ordinal_position")
    return [c.strip() for c in out.split('\n') if c.strip()]

def write_table(f, table, data):
    lines = data.strip().split('\n')
    if not lines or not data.strip():
        return 0
    cols = get_columns(table)
    col_list = ','.join(f'"{c}"' for c in cols)
    f.write(f"COPY \"{table}\" ({col_list}) FROM stdin;\n")
    f.write(data)
    if not data.endswith('\n'):
        f.write('\n')
    f.write("\\.\n\n")
    return len(lines)

# Get table lists
tables_raw = sql("SELECT table_name FROM information_schema.columns WHERE column_name='client_id' AND table_schema='public' ORDER BY table_name")
tables = [t.strip() for t in tables_raw.split('\n') if t.strip()]
user_ids = sql(f"SELECT user_id FROM user_clients WHERE client_id={CLIENT_ID}")
user_id_list = [u.strip() for u in user_ids.split('\n') if u.strip()]

user_tables = ["users", "user_clients", "user_invitations", "org_roles", "notification_log",
               "notification_settings", "email_templates", "email_messages",
               "employee_training_records", "employee_acknowledgments", "employees"]
ref_tables = ["compliance_frameworks", "controls", "common_controls", "control_mappings",
              "control_baselines", "control_tech_mappings", "policy_templates",
              "evidence_templates", "training_modules", "samm_practices", "asvs_categories",
              "asvs_requirements", "nvd_cve_cache", "cisa_kev_cache", "integration_definitions"]

print(f"=== Extracting Intellfence (client_id={CLIENT_ID}) ===")
print(f"Tables: {len(tables)} | Users: {len(user_id_list)} | Ref: {len(ref_tables)}")

with open("scripts/seed-demo-full.sql", "w") as f:
    f.write("-- ComplianceOS Demo: Intellfence Client\n")
    f.write("-- Portable SQL — no credentials, works on any PostgreSQL\n")
    f.write("-- Usage: psql -U complianceos -d complianceos < scripts/seed-demo-full.sql\n\n")
    f.write("SET session_replication_role = 'replica';\n")
    f.write("SET client_min_messages TO WARNING;\n\n")

    total = 0
    for table in ref_tables:
        data = copy_data(table, "TRUE")
        n = write_table(f, table, data)
        total += n
        print(f"  ref {table}: {n} rows")

    for table in tables:
        data = copy_data(table, f"client_id = {CLIENT_ID}")
        n = write_table(f, table, data)
        total += n
        print(f"  {table}: {n} rows")

    if user_id_list:
        uid_csv = ",".join(user_id_list)
        for table in user_tables:
            cols = get_columns(table)
            if 'user_id' in cols:
                data = copy_data(table, f"user_id IN ({uid_csv})")
            elif 'id' in cols and table == 'users':
                data = copy_data(table, f"id IN ({uid_csv})")
            else:
                continue
            n = write_table(f, table, data)
            total += n
            print(f"  user {table}: {n} rows")

    f.write("SET session_replication_role = 'origin';\n\n")

print(f"\n✅ Total: {total} rows written to scripts/seed-demo-full.sql")
