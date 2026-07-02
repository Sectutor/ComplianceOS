
import os

path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'
new_file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\server\routers\clientControls.ts'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_line = -1
end_line = -1

# Find start
for i, line in enumerate(lines):
    if "clientControls:" in line and "router({" in line:
        start_line = i
        print(f"Found start at line {i+1}: {line.strip()}")
        break

if start_line == -1:
    print("Could not find clientControls router start.")
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
# We want content INSIDE "router({ ... })"
# Start line contains "clientControls: router({"
# End line contains "})," or similar.

# Extract all lines from start_line to end_line
extracted_lines = lines[start_line:end_line+1]

# We need to strip the wrapping "clientControls: router({" and "}),"
# This is hard to do perfectly with lines if multiple braces on one line.
# But generally "router({" is at end of start_line.
# And "})," is at end_line.

# Let's just grab the whole block and put it inside `clientControls: t.router({ ... })` in the new file?
# NO, we want `createClientControlsRouter` to return `t.router({ ... })`.
# And we want to maintain the `clientControls` KEY?
# If we return `t.router({ ...definition... })`.
# And in `routers.ts` we use `clientControls: create...(t, cp)`.
# Then `create...` should return the ROUTER OBJECT.
# Use `t.router({ define procedures })`.
# So we need the procedures.

# The extracted text is `clientControls: router({ ... })`.
# We want to remove `clientControls: router({` from start.
# And `})` from end.

# Join lines first
block_content = "".join(extracted_lines)
# Remove "clientControls: router({"
# Be careful with whitespace.
prefix_match = "clientControls"
idx = block_content.find(prefix_match)
if idx != -1:
    # Find "router({" after that
    idx2 = block_content.find("router({", idx)
    if idx2 != -1:
        # Content starts after "router({"
        content_start = idx2 + len("router({")
        
        # Content ends before last "})"
        # Finding last "})"
        content_end = block_content.rfind("})")
        
        inner_content = block_content[content_start:content_end]
    else:
        print("Structure Error")
        exit(1)
        
# Create new file
factory_content = f"""import {{ z }} from "zod";
import {{ TRPCError }} from "@trpc/server";
import {{ clientControls, controlMappings, controls, regulationMappings, notificationLog }} from "../../schema";
import {{ logActivity }} from "../../lib/audit";
import * as db from "../../db";
import {{ getDb }} from "../../db";
import * as schema from "../../schema";
import {{ eq, and, desc, sql, inArray, like, or }} from "drizzle-orm";

export const createClientControlsRouter = (t: any, clientProcedure: any, adminProcedure: any, publicProcedure: any, clientEditorProcedure: any) => {{
    return t.router({{
{inner_content}
    }});
}};
"""

with open(new_file_path, 'w', encoding='utf-8') as f:
    f.write(factory_content)
    
print(f"Created {new_file_path}")

# Update routers.ts
# Replace lines[start_line : end_line+1] with definition.
replacement_line = "  clientControls: createClientControlsRouter(t, clientProcedure, adminProcedure, publicProcedure, clientEditorProcedure),\n"

# Check if comma needed
if lines[end_line].strip().endswith(','):
    # replacement_line has comma.
    pass
else:
    # If original didn't have comma, maybe last item.
    # But replacement has comma. That's usually safe in JS object.
    pass

# Update lines
lines[start_line] = replacement_line
# Clear others
for i in range(start_line+1, end_line+1):
    lines[i] = "" 

# Add Import
import_stmt = 'import { createClientControlsRouter } from "./server/routers/clientControls";\n'
lines.insert(0, import_stmt)

# Write back
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
    
print("Updated routers.ts")
