
import os
import re

ROUTER_NAME = "clientControls"
NEW_FILE_NAME = "compliance.ts" 
FACTORY_NAME = "createComplianceRouter"

routers_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'
new_file_path = fr'd:\OneDrive - Intellfence\WebDev\ComplianceOS\server\routers\{NEW_FILE_NAME}'

# Read routers.ts
with open(routers_path, 'rb') as f:
    content_bytes = f.read()
    content = content_bytes.decode('utf-8', errors='ignore')

print(f"File length: {len(content)}")

# Find block
regex = re.compile(fr"{ROUTER_NAME}\s*:\s*(?:t\.)?router\s*\({{")
match = regex.search(content)

if not match:
    print(f"Could not find router block for '{ROUTER_NAME}'")
    # Debug: Search for just the name
    idx = content.find(ROUTER_NAME)
    if idx != -1:
        print(f"Found '{ROUTER_NAME}' at {idx}. Context: {content[idx:idx+50]}")
    else:
        print(f"'{ROUTER_NAME}' literally not found in file text.")
    exit(1)

start_idx = match.start()
inner_start_idx = match.end() # Points to char inside {

print(f"Found block start at {start_idx}")

# Find end via brace counting
cursor = inner_start_idx
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

end_idx = cursor # points after '}'
print(f"Found block end at {end_idx}")

# We want content INSIDE "router({ ... })"
# match.end() is after "router({"
# end_idx is after "}"
inner_content = content[inner_start_idx : end_idx - 1]

# Create new file content
new_file_content = f"""import {{ z }} from "zod";
import * as db from "../../db";
import {{ getDb }} from "../../db";
import * as schema from "../../schema";
import {{ eq, and, desc, sql, inArray, like, or }} from "drizzle-orm";
import {{ TRPCError }} from "@trpc/server";

export const {FACTORY_NAME} = (t: any, clientProcedure: any) => {{
    return t.router({{
        {ROUTER_NAME}: t.router({{
{inner_content}
        }}),
    }});
}};
"""
# Note: compliance router might group both controls and policies?
# If I extract "clientControls", I should probably just extract content and put it in "clientControls: t.router({...})" inside new router.
# Or if new router IS compliance router, it handles multiple sub-routers?
# For now, let's just make createComplianceRouter return { clientControls: ... }

# Write new file
os.makedirs(os.path.dirname(new_file_path), exist_ok=True)
with open(new_file_path, 'w', encoding='utf-8') as f:
    f.write(new_file_content)
print(f"Created {new_file_path}")

# Update routers.ts
# 1. Add import
import_stmt = f'import {{ {FACTORY_NAME} }} from "./server/routers/compliance";'
if import_stmt not in content:
    # Insert at top
    content = import_stmt + '\n' + content

# 2. Replace block
# We replace "clientControls: router({ ... })" with "...createComplianceRouter(t, clientProcedure)..."
# But createComplianceRouter returns object { clientControls: ... }.
# So we need "mergeRouters" ??
# OR, if we just want "clientControls: createClientControlsRouter...", that's fine.
# But implementation plan said "Compliance" router (Controls, Policies).
# So "createComplianceRouter" should probably merge both?

# For this script, I am extracting ONLY "clientControls".
# So I should probably name it "createClientControlsRouter" or make strict match.

# Let's pivot: Just extract "clientControls" to "server/routers/compliance.ts" but maintain naming.
# Replacement in routers.ts:
# "clientControls: router({ ... })" -> "clientControls: createComplianceRouter(t, clientProcedure).clientControls" ?? No that's ugly.

# Better: "compliance: createComplianceRouter...".
# But usage in Frontend is "trpc.clientControls...".
# If I change key in appRouter to "compliance", frontend breaks.
# Unless I do: "...createComplianceRouter(t, procedure)" which returns { clientControls: ..., clientPolicies: ... }
# And I use "t.mergeRouters(createComplianceRouter(...))" in appRouter? 
# or spread it? "...createComplianceRouter(...)"

# To Keep it simple: Extract "clientControls" to "createClientControlsRouter" in "server/routers/clientControls.ts".
# This aligns with pattern.
# Renaming variables in script:
NEW_FILE_NAME = "clientControls.ts"
FACTORY_NAME = "createClientControlsRouter"

# Re-construct new file content with new Factory Name
new_file_content = f"""import {{ z }} from "zod";
import * as db from "../../db";
import {{ getDb }} from "../../db";
import * as schema from "../../schema";
import {{ eq, and, desc, sql, inArray, like, or }} from "drizzle-orm";
import {{ TRPCError }} from "@trpc/server";

export const {FACTORY_NAME} = (t: any, clientProcedure: any) => {{
    return t.router({{
{inner_content}
    }});
}};
"""

with open(fr'd:\OneDrive - Intellfence\WebDev\ComplianceOS\server\routers\{NEW_FILE_NAME}', 'w', encoding='utf-8') as f:
    f.write(new_file_content)

# Update replacement string
replacement = f"{ROUTER_NAME}: {FACTORY_NAME}(t, clientProcedure)"
if end_idx < len(content) and content[end_idx] == ',':
    replacement += ","
    end_idx += 1

content = content[:start_idx] + replacement + content[end_idx:]

# Import stmt
import_stmt = f'import {{ {FACTORY_NAME} }} from "./server/routers/clientControls";'
content = import_stmt + '\n' + content

with open(routers_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated routers.ts")
