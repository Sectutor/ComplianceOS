
import os

file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\db.ts'

with open(file_path, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

lines = content.splitlines()

print(f"Total lines: {len(lines)}")
for i, line in enumerate(lines):
    if "export async function getBcpProjects" in line:
        print(f"FOUND getBcpProjects at line {i+1}: {line.strip()}")
    if "export async function createBcpProject" in line:
        print(f"FOUND createBcpProject at line {i+1}: {line.strip()}")
        
