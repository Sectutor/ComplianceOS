# Database Recovery Patterns

Exact error messages encountered and their fixes for the GRCompliance + PostgreSQL stack.

## Error: DNS resolution failure

**Symptom**: Health check returns:
```json
{"database":{"connected":false,"error":"getaddrinfo EAI_AGAIN db"}}
```
API calls return: `{"error":"getaddrinfo ENOTFOUND db"}`

**Root cause**: DB container on different Docker network than GRCompliance.

**Fix**:
```bash
# Check networks
docker inspect complianceos-complianceos-1 --format '{{json .NetworkSettings.Networks}}' | python3 -c "import sys,json; [print(k) for k in json.load(sys.stdin)]"
docker inspect complianceos-db-1 --format '{{json .NetworkSettings.Networks}}' | python3 -c "import sys,json; [print(k) for k in json.load(sys.stdin)]"

# Connect containers to each other's networks
docker network connect complianceos_stack-net complianceos-db-1
docker network connect complianceos-network complianceos-complianceos-1
docker restart complianceos-complianceos-1
```

## Error: Password authentication failed

**Symptom**: After fixing network:
```json
{"database":{"connected":false,"error":"password authentication failed for user \"complianceos\""}}
```

**Root cause**: DB container was recreated; the `complianceos` PostgreSQL role does not exist.

**Fix**:
```bash
# Create user (password may be masked in DATABASE_URL env)
docker exec complianceos-db-1 psql -U postgres -d complianceos -c "CREATE USER complianceos WITH PASSWORD 'complianceos';"
docker exec complianceos-db-1 psql -U postgres -d complianceos -c "GRANT ALL PRIVILEGES ON DATABASE complianceos TO complianceos;"
docker exec complianceos-db-1 psql -U postgres -d complianceos -c "GRANT ALL ON SCHEMA public TO complianceos;"
docker restart complianceos-complianceos-1
```

## Error: Permission denied on tables

**Symptom**: Health returns OK but risk queries fail:
```json
{"error":"permission denied for table risk_scenarios","code":"INTERNAL_ERROR"}
```

**Root cause**: Database-level GRANT doesn't propagate to existing table objects owned by `postgres`.

**Fix**:
```bash
docker exec complianceos-db-1 psql -U postgres -d complianceos -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO complianceos; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO complianceos;"
```

## Error: Password masked in env

**Symptom**: `docker exec ... env | grep DATABASE_URL` or `docker inspect` shows `***` instead of password.

**Root cause**: GRCompliance's entrypoint/shell sanitizes credential output.

**Fix**: Cannot extract original password. Create a new user with a known password (see "Password authentication failed" above) and restart.
