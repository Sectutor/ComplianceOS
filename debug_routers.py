
file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "clientControls" in line:
        print(f"Line {i+1}: {line.strip()}")
        # Print context
        for j in range(1, 4):
            if i+j < len(lines):
                print(f"  + {lines[i+j].strip()}")
