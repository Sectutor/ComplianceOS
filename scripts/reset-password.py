#!/usr/bin/env python3
"""Reset Supabase user password"""
import json, urllib.request, sys, subprocess

# Get keys from .env.local
env_local = "D:/OneDrive - Intellfence/WebDev/ComplianceOS/.env.local"
SVC_KEY = subprocess.run(
    ["grep", "^SUPABASE_SERVICE_ROLE_KEY=", env_local],
    capture_output=True, text=True
).stdout.strip().split("=", 1)[-1]
SUPABASE_URL = "https://erjlkrtccmlrvsjtpppp.supabase.co"
EMAIL = "admin@intellfence.com"
NEW_PASSWORD = "NKssnyw47!@"

# Get all users
req = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/admin/users")
req.add_header("apikey", SVC_KEY)
req.add_header("Authorization", f"Bearer {SVC_KEY}")
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
users = data.get("users", [])

# Find user
match = [u for u in users if u.get("email") == EMAIL]
if not match:
    print(f"User {EMAIL} not found")
    sys.exit(1)

user_id = match[0]["id"]
print(f"Found user: {EMAIL} -> {user_id}")

# Update password
body = json.dumps({"password": NEW_PASSWORD}).encode()
req2 = urllib.request.Request(
    f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
    data=body,
    method="PUT"
)
req2.add_header("apikey", SVC_KEY)
req2.add_header("Authorization", f"Bearer {SVC_KEY}")
req2.add_header("Content-Type", "application/json")

resp2 = urllib.request.urlopen(req2)
result = json.loads(resp2.read())
print(f"Password updated for: {result.get('email')}")
