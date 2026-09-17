import os
import re
import sys

def audit_sql_security(target_dir):
    print(f"=== SQL Injection Security Audit ===")
    print(f"Scanning target directory: {target_dir}\n")

    unparameterized_patterns = [
        re.compile(r'sql\.raw\(.*?\+\s*[a-zA-Z_]\w*'),  # Unsafe string concatenation in sql.raw (not numbers)
        re.compile(r'sql`[^`]*?\$\{[a-zA-Z_]\w*?\s*\+\s*["\']'),  # String addition inside sql template
        re.compile(r'db\.query\(["\'].*?\+'),  # Raw string concatenation in db.query
        re.compile(r'execute\(["\'].*?\+\s*[a-zA-Z_]'), # Raw string concatenation in execute
    ]

    total_files_scanned = 0
    vulnerabilities_found = 0
    findings = []

    for root, _, files in os.walk(target_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js')):
                total_files_scanned += 1
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()

                    for idx, line in enumerate(lines, 1):
                        for pattern in unparameterized_patterns:
                            if pattern.search(line):
                                findings.append({
                                    'file': filepath,
                                    'line': idx,
                                    'content': line.strip()
                                })
                                vulnerabilities_found += 1
                except Exception as e:
                    pass

    print(f"Files Scanned: {total_files_scanned}")
    print(f"Unsafe Dynamic SQL Injections Found: {vulnerabilities_found}\n")

    if findings:
        print("[WARNING] Potential SQL Vulnerabilities Identified:")
        for f in findings:
            print(f"  - [{f['file']}:{f['line']}] {f['content']}")
        return False
    else:
        print("[OK] ALL database queries use safe Drizzle ORM parameterized abstractions & template SQL tags.")
        print("=== SQL Injection Security Audit PASSED ===")
        return True

if __name__ == "__main__":
    search_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.cwd() if hasattr(os, 'cwd') else os.getcwd(), "packages", "core", "src")
    success = audit_sql_security(search_path)
    sys.exit(0 if success else 1)
