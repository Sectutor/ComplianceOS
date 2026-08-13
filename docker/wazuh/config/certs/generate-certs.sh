#!/bin/bash
# Generate self-signed certificates for Wazuh Docker stack (local testing)
# Based on: https://documentation.wazuh.com/current/deployment-options/docker/index.html

set -e
CERT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Generating Wazuh certificates in: $CERT_DIR ==="

# 1. Root CA
openssl genrsa -out "$CERT_DIR/root-ca-key.pem" 2048
openssl req -x509 -new -nodes -key "$CERT_DIR/root-ca-key.pem" \
  -days 3650 -out "$CERT_DIR/root-ca.pem" \
  -subj "/CN=root-ca/O=Wazuh/C=US"

# 2. Admin cert
openssl genrsa -out "$CERT_DIR/admin-key-temp.pem" 2048
openssl req -new -key "$CERT_DIR/admin-key-temp.pem" \
  -out "$CERT_DIR/admin.csr" \
  -subj "/CN=admin/O=Wazuh/C=US"
openssl x509 -req -in "$CERT_DIR/admin.csr" \
  -CA "$CERT_DIR/root-ca.pem" -CAkey "$CERT_DIR/root-ca-key.pem" \
  -CAcreateserial -out "$CERT_DIR/admin.pem" -days 3650
openssl pkcs12 -export -in "$CERT_DIR/admin.pem" \
  -inkey "$CERT_DIR/admin-key-temp.pem" \
  -out "$CERT_DIR/admin.p12" -password pass:admin
rm -f "$CERT_DIR/admin-key-temp.pem" "$CERT_DIR/admin.csr" "$CERT_DIR/admin.p12"

# 3. Indexer cert (node-1)
openssl genrsa -out "$CERT_DIR/indexer-key-temp.pem" 2048
openssl req -new -key "$CERT_DIR/indexer-key-temp.pem" \
  -out "$CERT_DIR/indexer.csr" \
  -subj "/CN=node-1/O=Wazuh/C=US"
cat > "$CERT_DIR/indexer.ext" <<EOF
subjectAltName = DNS:wazuh-indexer, DNS:localhost, IP:127.0.0.1
EOF
openssl x509 -req -in "$CERT_DIR/indexer.csr" \
  -CA "$CERT_DIR/root-ca.pem" -CAkey "$CERT_DIR/root-ca-key.pem" \
  -CAcreateserial -out "$CERT_DIR/indexer.pem" -days 3650 \
  -extfile "$CERT_DIR/indexer.ext"
cp "$CERT_DIR/indexer-key-temp.pem" "$CERT_DIR/indexer-key.pem"
rm -f "$CERT_DIR/indexer-key-temp.pem" "$CERT_DIR/indexer.csr" "$CERT_DIR/indexer.ext"

# 4. Dashboard cert
openssl genrsa -out "$CERT_DIR/dashboard-key-temp.pem" 2048
openssl req -new -key "$CERT_DIR/dashboard-key-temp.pem" \
  -out "$CERT_DIR/dashboard.csr" \
  -subj "/CN=wazuh-dashboard/O=Wazuh/C=US"
cat > "$CERT_DIR/dashboard.ext" <<EOF
subjectAltName = DNS:wazuh-dashboard, DNS:localhost, IP:127.0.0.1
EOF
openssl x509 -req -in "$CERT_DIR/dashboard.csr" \
  -CA "$CERT_DIR/root-ca.pem" -CAkey "$CERT_DIR/root-ca-key.pem" \
  -CAcreateserial -out "$CERT_DIR/dashboard.pem" -days 3650 \
  -extfile "$CERT_DIR/dashboard.ext"
cp "$CERT_DIR/dashboard-key-temp.pem" "$CERT_DIR/dashboard-key.pem"
rm -f "$CERT_DIR/dashboard-key-temp.pem" "$CERT_DIR/dashboard.csr" "$CERT_DIR/dashboard.ext"

# 5. Server cert
openssl genrsa -out "$CERT_DIR/server-key-temp.pem" 2048
openssl req -new -key "$CERT_DIR/server-key-temp.pem" \
  -out "$CERT_DIR/server.csr" \
  -subj "/CN=wazuh-server/O=Wazuh/C=US"
openssl x509 -req -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/root-ca.pem" -CAkey "$CERT_DIR/root-ca-key.pem" \
  -CAcreateserial -out "$CERT_DIR/server.pem" -days 3650
cp "$CERT_DIR/server-key-temp.pem" "$CERT_DIR/server-key.pem"
rm -f "$CERT_DIR/server-key-temp.pem" "$CERT_DIR/server.csr"

# Copy server certs as .crt/.key for the server config
cp "$CERT_DIR/server.pem" "$CERT_DIR/server.crt"
cp "$CERT_DIR/server-key.pem" "$CERT_DIR/server.key"
cp "$CERT_DIR/root-ca.pem" "$CERT_DIR/ca.crt"

# Permissions
chmod 600 "$CERT_DIR"/*-key.pem

echo "=== All certificates generated ==="
ls -la "$CERT_DIR"/*.pem "$CERT_DIR"/*.crt "$CERT_DIR"/*.key 2>/dev/null
