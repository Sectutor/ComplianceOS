
import os
import re

file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Import if missing
import_statement = 'import { createBusinessContinuityRouter } from "./server/routers/businessContinuity";'
if import_statement not in content:
    # Find a good place to insert. After "import { createChecklistRouter } ..."
    # Or just after the last "import ... from ...;"
    # Let's try to find "import { createChecklistRouter } from './server/routers/checklist';"
    # Note quotes might vary (single vs double).
    
    pattern = r"import \{ createChecklistRouter \} from ['\"].*['\"];"
    match = re.search(pattern, content)
    if match:
        end_idx = match.end()
        content = content[:end_idx] + '\n' + import_statement + content[end_idx:]
        print("Inserted import statement.")
    else:
        # Fallback: insert after imports end (harder to find reliably without regex wizardry).
        # Let's insert at top imports.
        print("Could not find specific import to append after. Inserting at top of imports.")
        content = import_statement + '\n' + content


# 2. Find and Replace Router Block
# Look for "businessContinuity: router({"
start_marker = "businessContinuity: router({"
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Could not find start of businessContinuity router block.")
    # Try with "t.router" just in case
    start_marker = "businessContinuity: t.router({"
    start_idx = content.find(start_marker)

if start_idx != -1:
    print(f"Found block start at {start_idx}")
    
    # Find end via brace counting
    # The start_marker ends with '{'. So count starts at 1.
    # We start counting AFTER the start_marker.
    cursor = start_idx + len(start_marker)
    balance = 1
    
    while cursor < len(content) and balance > 0:
        char = content[cursor]
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
        cursor += 1
    
    if balance == 0:
        end_idx = cursor
        print(f"Found block end at {end_idx}")
        
        # Check if comma follows
        if cursor < len(content) and content[cursor] == ',':
            end_idx += 1
            
        # Replace
        # Original: businessContinuity: router({ ... })
        # New: businessContinuity: createBusinessContinuityRouter(t, clientProcedure)
        
        # Note: start_marker is "businessContinuity: router({"
        # We replace from start_idx to end_idx (exclusive? cursor is one past })
        
        # Wait, start_marker DOES NOT INCLUDE the variable declaration. It is a key in an object.
        # "businessContinuity: router({"
        
        # We want to replace "router({ ... })" with "createBusinessContinuityRouter(t, clientProcedure)"
        # Or replace the whole line "businessContinuity: router({ ... })"
        
        # New text:
        new_block = "businessContinuity: createBusinessContinuityRouter(t, clientProcedure)"
        
        # If the original had a comma at the end, I included it in end_idx?
        # If I include comma in replacement, I should check.
        # Safer: Just replace the braces logic.
        
        # Let's verify what I captured.
        # captured_text = content[start_idx:end_idx]
        # It is "businessContinuity: router({ ... })" (maybe with comma)
        
        # If I replace it:
        replacement = "businessContinuity: createBusinessContinuityRouter(t, clientProcedure)"
        if content[end_idx-1] == ',': # If I captured the trailing comma
             replacement += ","
             
        # Wait, my logic `if content[cursor] == ',': end_idx += 1` handles matching comma.
        # So `content[start_idx:end_idx]` includes the comma if present.
        # So I should add comma to replacement if evident.
        
        # Actually, simpler: The `create...` call returns the router.
        # So "key: value" syntax.
        
        content = content[:start_idx] + replacement + content[end_idx:]
        print("Replaced router block.")
    else:
        print("Could not find matching brace for block end.")
else:
    print("Router block not found.")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
