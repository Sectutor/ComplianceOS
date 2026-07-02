
import os

file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\db.ts'

with open(file_path, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

lines = content.splitlines(keepends=True)

# Truncate at line 3670 (0-indexed 3669)
# Check context around 3669
print(lines[3668]) # 3669
print(lines[3669]) # 3670
print(lines[3670]) # 3671

# Be safe, truncate at 3670.
lines = lines[:3670]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Truncated db.ts at line 3670")
