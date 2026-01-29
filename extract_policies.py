
import os

path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'
new_file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\server\routers\clientPolicies.ts'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_line = -1
end_line = -1

# Find start
for i, line in enumerate(lines):
    if "clientPolicies:" in line and "router({" in line:
        start_line = i
        print(f"Found start at line {i+1}: {line.strip()}")
        break

if start_line == -1:
    print("Could not find clientPolicies router start.")
    exit(1)

# Find end via brace counting
balance = 0
found_brace = False
for i in range(start_line, len(lines)):
    line = lines[i]
    for char in line:
        if char == '{':
            balance += 1
            found_brace = True
        elif char == '}':
            balance -= 1
    
    if found_brace and balance == 0:
        end_line = i
        print(f"Found end at line {i+1}")
        break

if end_line == -1:
    print("Could not find matching end brace.")
    exit(1)

# Extract content
extracted_lines = lines[start_line:end_line+1]

block_content = "".join(extracted_lines)
# Remove prefix/suffix
# Prefix: "clientPolicies: router({"
prefix_match = "clientPolicies"
idx = block_content.find(prefix_match)
if idx != -1:
    idx2 = block_content.find("router({", idx)
    content_start = idx2 + len("router({")
    content_end = block_content.rfind("})")
    inner_content = block_content[content_start:content_end]
else:
    print("Structure Error")
    exit(1)

# Create new file
factory_content = f"""import {{ z }} from "zod";
import {{ TRPCError }} from "@trpc/server";
import {{ clientPolicies, clientControls, controls, regulationMappings, notificationLog, users }} from "../../schema";
import {{ logActivity }} from "../../lib/audit";
import * as db from "../../db";
import {{ getDb }} from "../../db";
import {{ policyGenerator }} from "../../lib/policy/policy-generation";
import * as schema from "../../schema";
import {{ eq, and, desc, sql, inArray, like, or }} from "drizzle-orm";

export const createClientPoliciesRouter = (t: any, clientProcedure: any, adminProcedure: any, publicProcedure: any, clientEditorProcedure: any) => {{
    return t.router({{
{inner_content}
    }});
}};
"""

with open(new_file_path, 'w', encoding='utf-8') as f:
    f.write(factory_content)
    
print(f"Created {new_file_path}")

# Update routers.ts
replacement_line = "  clientPolicies: createClientPoliciesRouter(t, clientProcedure, adminProcedure, publicProcedure, clientEditorProcedure),\n"

lines[start_line] = replacement_line
for i in range(start_line+1, end_line+1):
    lines[i] = "" 

# Add Import
import_stmt = 'import { createClientPoliciesRouter } from "./server/routers/clientPolicies";\n'
lines.insert(0, import_stmt)

# Write back
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
    
print("Updated routers.ts")
