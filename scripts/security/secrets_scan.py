import os
import re
import sys

# High entropy and credential detection patterns
SECRET_PATTERNS = [
    ("AWS Access Key ID", re.compile(r'\b(AKIA[0-9A-Z]{16})\b')),
    ("AWS Secret Access Key", re.compile(r'(?i)(aws_secret_access_key|aws_secret_key)\s*[:=]\s*["\']([0-9a-zA-Z/+]{40})["\']')),
    ("Private RSA/EC/SSH Key", re.compile(r'-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----')),
    ("GitHub Personal Access Token", re.compile(r'\bghp_[0-9a-zA-Z]{36}\b')),
    ("Slack API Token", re.compile(r'\bxox[baprs]-[0-9a-zA-Z]{10,48}\b')),
    ("Generic High-Entropy Secret Key", re.compile(r'''(?i)(secret[_-]?key|api[_-]?secret|password|bearer[_-]?token)\s*[:=]\s*["']([A-Za-z0-9+/=_-]{24,})["']''')),
]

# Excluded paths and dummy placeholders
EXCLUDE_DIRS = {".git", "node_modules", "dist", "build", ".next", ".cache", "tmp", ".gemini", "docs", ".trae"}
EXCLUDE_FILES = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock"}
EXCLUDE_EXTS = {".png", ".jpg", ".jpeg", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".pdf", ".lock", ".md"}
ALLOWED_PLACEHOLDERS = {"YOUR_API_KEY", "YOUR_SECRET_KEY", "MOCK_KEY", "DEMO_KEY", "TEST_SECRET", "CHANGE_ME", "ENTER_KEY_HERE", "AKIAIOSFODNN7EXAMPLE"}

def scan_file_for_secrets(filepath):
    findings = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        for line_num, line in enumerate(lines, 1):
            # Skip comments or env variable reads
            if line.strip().startswith('//') or line.strip().startswith('#') or 'process.env.' in line:
                continue

            for name, pattern in SECRET_PATTERNS:
                matches = pattern.findall(line)
                for match in matches:
                    matched_str = match[1] if isinstance(match, tuple) else match
                    if matched_str not in ALLOWED_PLACEHOLDERS and len(matched_str) > 16:
                        # Mask secret in output
                        masked = matched_str[:4] + "*" * (len(matched_str) - 8) + matched_str[-4:]
                        findings.append({
                            "type": name,
                            "line": line_num,
                            "masked": masked,
                        })
    except Exception:
        pass
    return findings

def audit_secrets(root_dir):
    print("=== Automated Codebase Secrets Scan ===")
    print(f"Scanning directory: {root_dir}\n")

    total_files = 0
    total_secrets = 0

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file in EXCLUDE_FILES or any(file.endswith(ext) for ext in EXCLUDE_EXTS):
                continue

            filepath = os.path.join(root, file)
            total_files += 1
            findings = scan_file_for_secrets(filepath)

            if findings:
                total_secrets += len(findings)
                print(f"[ALERT] {filepath}:")
                for f in findings:
                    print(f"  - Line {f['line']}: {f['type']} ({f['masked']})")

    print(f"\nFiles Scanned: {total_files}")
    print(f"Hardcoded Secrets Detected: {total_secrets}")

    if total_secrets == 0:
        print("[OK] Secrets Audit PASSED! No hardcoded tokens, API keys, or private keys found.")
        return True
    else:
        print("[FAIL] Hardcoded secrets detected! Please move them to environment variables.")
        return False

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    success = audit_secrets(target)
    sys.exit(0 if success else 1)
