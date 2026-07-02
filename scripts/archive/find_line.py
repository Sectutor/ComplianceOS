
file_path = r'd:\OneDrive - Intellfence\WebDev\ComplianceOS\routers.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'clientControls: create' in line:
            print(f"Line {i+1}: '{line.strip()}'")
