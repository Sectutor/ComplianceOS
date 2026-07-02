
import os
import re

ROUTER_NAME = "risk"
NEW_FILE_NAME = "risk.ts"
FACTORY_NAME = "createRiskRouter"

routers_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'
new_file_path = fr'd:\OneDrive - Intellfence\WebDev\ComplianceOS\server\routers\{NEW_FILE_NAME}'

# Read routers.ts
with open(routers_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find block
# Search for "risk: router({" or "risk: t.router({"
start_marker_1 = f"{ROUTER_NAME}: router({{"
start_marker_2 = f"{ROUTER_NAME}: t.router({{"

start_idx = content.find(start_marker_1)
used_marker = start_marker_1
if start_idx == -1:
    start_idx = content.find(start_marker_2)
    used_marker = start_marker_2

if start_idx == -1:
    print(f"Could not find router block for '{ROUTER_NAME}'")
    exit(1)

print(f"Found block start at {start_idx}")

# Find end via brace counting
cursor = start_idx + len(used_marker)
balance = 1
while cursor < len(content) and balance > 0:
    char = content[cursor]
    if char == '{':
        balance += 1
    elif char == '}':
        balance -= 1
    cursor += 1

if balance != 0:
    print("Could not find matching brace")
    exit(1)

end_idx = cursor
print(f"Found block end at {end_idx}")

# content[start_idx:end_idx] is "risk: router({ ... })"
# We want the CONTENT INSIDE "router({ ... })".
# The marker is "risk: router({"
# So inner content starts at start_idx + len(used_marker)
# And ends at end_idx - 1 (the closing brace '}')
# Actually, end_idx points to character AFTER '}'.
# So inner content is content[start_idx + len(used_marker) : end_idx - 1]

inner_content = content[start_idx + len(used_marker) : end_idx - 1]

# Create new file content
new_file_content = f"""import {{ z }} from "zod";
import * as db from "../../db";
import {{ getDb }} from "../../db";
import * as schema from "../../schema";
import {{ eq, and, desc, sql, inArray }} from "drizzle-orm";
import {{ TRPCError }} from "@trpc/server";

export const {FACTORY_NAME} = (t: any, clientProcedure: any) => {{
    return t.router({{
{inner_content}
    }});
}};
"""

# Write new file
os.makedirs(os.path.dirname(new_file_path), exist_ok=True)
with open(new_file_path, 'w', encoding='utf-8') as f:
    f.write(new_file_content)
print(f"Created {new_file_path}")

# Update routers.ts
# 1. Add import
import_stmt = f'import {{ {FACTORY_NAME} }} from "./server/routers/{ROUTER_NAME}";'
if import_stmt not in content:
    # Insert at top imports
    # Basic insertion after imports
    content = import_stmt + '\n' + content

# 2. Replace block
# Check for trailing comma
replacement = f"{ROUTER_NAME}: {FACTORY_NAME}(t, clientProcedure)"
if end_idx < len(content) and content[end_idx] == ',':
    replacement += ","
    end_idx += 1 # consume commas
    
# Wait, if end_idx was AFTER '}', checking content[end_idx] is correct.
# Replace from start_idx to end_idx
content = content[:start_idx] + replacement + content[end_idx:]

with open(routers_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated routers.ts")
