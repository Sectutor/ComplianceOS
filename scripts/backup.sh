#!/usr/bin/env bash
#
# backup.sh — ComplianceOS Database & Uploads Backup Script
#
# Dumps the PostgreSQL database, archives uploads, and creates a
# timestamped backup folder with a manifest.  Cleans up old backups.
#
# Environment variables (with defaults):
#   DB_HOST       — PostgreSQL host              (default: localhost)
#   DB_PORT       — PostgreSQL port              (default: 5432)
#   DB_NAME       — PostgreSQL database name     (default: complianceos)
#   DB_USER       — PostgreSQL user              (default: complianceos)
#   DB_PASSWORD   — PostgreSQL password          (default: complianceos)
#   BACKUP_DIR    — Destination directory        (default: ./backups)
#   BACKUP_RETENTION_DAYS — max age of backups   (default: 30)
#   UPLOADS_DIR   — uploads directory to archive (default: /app/uploads)
#
set -euo pipefail

# -----------------------------------------------
# Coloured output helpers
# -----------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# -----------------------------------------------
# Configuration
# -----------------------------------------------
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-complianceos}"
DB_USER="${DB_USER:-complianceos}"
DB_PASSWORD="${DB_PASSWORD:-complianceos}"

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Auto-detect uploads directory: use supplied value, or check project path, or fall back
if [ -n "${UPLOADS_DIR:-}" ]; then
    UPLOADS_SRC="$UPLOADS_DIR"
else
    PROJECT_UPLOADS="/d/OneDrive - Intellfence/WebDev/ComplianceOS/uploads"
    if [ -d "$PROJECT_UPLOADS" ]; then
        UPLOADS_SRC="$PROJECT_UPLOADS"
    else
        UPLOADS_SRC="/app/uploads"
    fi
fi

# Timestamp for this backup run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}"

# -----------------------------------------------
# Prerequisites
# -----------------------------------------------
check_prerequisites() {
    if ! command -v pg_dump &>/dev/null; then
        error "pg_dump not found.  Install PostgreSQL client tools and try again."
        exit 1
    fi
    if ! command -v md5sum &>/dev/null && ! command -v md5 &>/dev/null; then
        warn "Neither md5sum nor md5 found — manifest will skip file hashes."
    fi
}

# -----------------------------------------------
# Backup Database
# -----------------------------------------------
backup_database() {
    local dump_path="$1/db_dump.sql.gz"
    info "Dumping database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}..."

    # pg_dump accepts password via PGPASSWORD env var
    export PGPASSWORD="${DB_PASSWORD}"

    if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
               -d "${DB_NAME}" --no-password 2>/dev/null | gzip > "${dump_path}"; then
        success "Database dump saved to ${dump_path}"
    else
        error "Database dump failed.  Check connection settings and credentials."
        unset PGPASSWORD
        exit 1
    fi
    unset PGPASSWORD
}

# -----------------------------------------------
# Archive Uploads
# -----------------------------------------------
backup_uploads() {
    local archive_path="$1/uploads.tar.gz"
    if [ -d "${UPLOADS_SRC}" ]; then
        info "Archiving uploads from ${UPLOADS_SRC}..."
        tar -czf "${archive_path}" -C "$(dirname "${UPLOADS_SRC}")" \
            "$(basename "${UPLOADS_SRC}")" 2>/dev/null
        success "Uploads archive saved to ${archive_path}"
    else
        warn "Uploads directory '${UPLOADS_SRC}' not found — skipping."
        touch "${archive_path}"  # placeholder so manifest is consistent
    fi
}

# -----------------------------------------------
# md5 helper (portable)
# -----------------------------------------------
compute_md5() {
    local file="$1"
    if command -v md5sum &>/dev/null; then
        md5sum "${file}" | cut -d' ' -f1
    elif command -v md5 &>/dev/null; then
        md5 -q "${file}" 2>/dev/null || echo "unavailable"
    else
        echo "unavailable"
    fi
}

# -----------------------------------------------
# Create Manifest
# -----------------------------------------------
create_manifest() {
    local manifest_path="$1/backup_manifest.json"
    local db_dump_path="$1/db_dump.sql.gz"
    local uploads_archive_path="$1/uploads.tar.gz"

    local db_size="0"
    local uploads_size="0"
    local db_md5="unavailable"
    local uploads_md5="unavailable"

    [ -f "${db_dump_path}" ]         && db_size=$(stat -c%s "${db_dump_path}" 2>/dev/null || stat -f%z "${db_dump_path}" 2>/dev/null || echo "0")
    [ -f "${uploads_archive_path}" ] && uploads_size=$(stat -c%s "${uploads_archive_path}" 2>/dev/null || stat -f%z "${uploads_archive_path}" 2>/dev/null || echo "0")
    [ -f "${db_dump_path}" ]         && db_md5=$(compute_md5 "${db_dump_path}")
    [ -f "${uploads_archive_path}" ] && uploads_md5=$(compute_md5 "${uploads_archive_path}")

    cat > "${manifest_path}" <<MANIFEST
{
  "backup_id": "${TIMESTAMP}",
  "created_at": "$(date --iso-8601=seconds 2>/dev/null || date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "database": {
    "host": "${DB_HOST}",
    "port": "${DB_PORT}",
    "name": "${DB_NAME}"
  },
  "files": {
    "db_dump.sql.gz": {
      "size_bytes": ${db_size},
      "md5": "${db_md5}"
    },
    "uploads.tar.gz": {
      "size_bytes": ${uploads_size},
      "md5": "${uploads_md5}"
    }
  }
}
MANIFEST

    success "Manifest written to ${manifest_path}"
}

# -----------------------------------------------
# Cleanup Old Backups
# -----------------------------------------------
cleanup_old_backups() {
    info "Cleaning backups older than ${BACKUP_RETENTION_DAYS} days in ${BACKUP_DIR}..."
    local count=0
    while IFS= read -r -d '' dir; do
        if rm -rf "${dir}"; then
            ((count++))
        fi
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -name 'backup_*' \
             -mtime "+${BACKUP_RETENTION_DAYS}" -print0 2>/dev/null || true)
    if [ "${count}" -gt 0 ]; then
        success "Removed ${count} old backup(s)."
    else
        info "No old backups to clean up."
    fi
}

# -----------------------------------------------
# Main
# -----------------------------------------------
main() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ComplianceOS — Backup Script${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""

    check_prerequisites

    # Ensure backup directory exists
    mkdir -p "${BACKUP_PATH}"

    backup_database "${BACKUP_PATH}"
    backup_uploads "${BACKUP_PATH}"
    create_manifest "${BACKUP_PATH}"

    echo ""
    success "Backup completed successfully!"
    info "  Location : ${BACKUP_PATH}"
    info "  Contents :"
    ls -lh "${BACKUP_PATH}" | tail -n +2 | while IFS= read -r line; do
        echo -e "              ${line}"
    done
    echo ""

    cleanup_old_backups
    echo ""
}

main "$@"
