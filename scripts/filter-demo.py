#!/usr/bin/env python3
"""
Filter pg_dump INSERT statements to only keep Intellfence (client_id=3) data.
Usage: python3 scripts/filter-demo.py
Output: scripts/seed-demo-intellfence.sql (~1MB instead of 18MB)
"""

import re

INPUT = "scripts/supabase-data.sql"
OUTPUT = "scripts/seed-demo-intellfence.sql"
CLIENT_ID = 3

# Reference tables: keep ALL rows (frameworks, controls, etc.)
REF_TABLES = {
    "compliance_frameworks", "controls", "common_controls",
    "control_mappings", "control_baselines", "control_tech_mappings",
    "policy_templates", "evidence_templates", "training_modules",
    "samm_practices", "asvs_categories", "asvs_requirements",
    "nvd_cve_cache", "cisa_kev_cache", "integration_definitions",
    "framework_mappings", "framework_knowledge_mappings",
    "samm_stream_questions", "fips_199_information_types_ref",
    "global_vendors", "global_contacts", "vendor_assessment_templates",
    "learning_frameworks", "learning_sections",
}

# User tables: keep rows matching these user IDs
USER_IDS = None  # Will be populated after first pass

table_name_re = re.compile(r'INSERT INTO\s+(?:public\.)?["]?(\w+)["]?\s')

def get_table_name(line):
    m = table_name_re.match(line)
    return m.group(1) if m else None

def has_client_id(line):
    return re.search(r'client_id[\),\s]', line) is not None

def get_intellfence_user_ids():
    """First pass: extract user IDs that belong to client_id=3."""
    ids = set()
    with open(INPUT, 'r') as f:
        for line in f:
            table = get_table_name(line)
            if table == "user_clients":
                # Multi-row INSERT: VALUES (1,3,...), (2,3,...)
                for m in re.finditer(r'\((\d+),3[\),]', line):
                    ids.add(m.group(1))
    print(f"Found {len(ids)} user IDs belonging to client {CLIENT_ID}")
    return ids

print("=== Filtering Intellfence demo data ===")
USER_IDS = get_intellfence_user_ids()
uid_pattern = '(' + '|'.join(re.escape(str(u)) for u in sorted(USER_IDS)) + ')'

total_read = 0
total_written = 0
skipped_ref = 0
skipped_client = 0

with open(INPUT, 'r') as fin, open(OUTPUT, 'w') as fout:
    fout.write("-- ComplianceOS Demo Data: Intellfence Client\n")
    fout.write(f"-- Filtered from production dump (client_id={CLIENT_ID})\n")
    fout.write("-- Portable — no credentials, works on any PostgreSQL\n\n")
    fout.write("SET session_replication_role = 'replica';\n")
    fout.write("SET client_min_messages TO WARNING;\n\n")

    for line in fin:
        total_read += 1
        table = get_table_name(line)
        if not table:
            continue

        # Reference tables: keep all
        if table in REF_TABLES:
            fout.write(line)
            total_written += 1
            skipped_ref += 1
            continue

        # Client-scoped tables: filter by client_id=3
        if f"client_id={CLIENT_ID}" in line or re.search(rf'\((\d+),{CLIENT_ID}[,\)]', line):
            fout.write(line)
            total_written += 1
            skipped_client += 1
            continue

        # User tables: filter by user ID
        if table in ("users", "user_clients", "notification_log", "email_messages",
                     "email_templates", "notification_settings", "employees",
                     "employee_training_records", "employee_acknowledgments",
                     "org_roles", "user_invitations"):
            if re.search(rf'\(({uid_pattern})[\),]', line) if USER_IDS else False:
                fout.write(line)
                total_written += 1
                continue

    fout.write("\nSET session_replication_role = 'origin';\n")

print(f"\nRead: {total_read} lines")
print(f"Written: {total_written} lines")
print(f"Reference: {skipped_ref} | Client-specific: {skipped_client}")
print(f"Output: {OUTPUT}")
