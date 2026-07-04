#!/usr/bin/env bash
#
# restore.sh — ComplianceOS Database & Uploads Restore Script
#
# Restores a ComplianceOS backup:
#  1. Locates the backup directory (arg, env, or prompt)
#  2. Drops & recreates the target database (with confirmation)
#  3. Restores the database from the gzipped SQL dump
#  4. Extracts the uploads archive to the uploads directory
#
# Usage:
#   ./restore.sh                                  # prompts for backup path
#   ./restore.sh /path/to/backup_20250101_120000  # restore specific backup
#   ./restore.sh --latest                         # restore most recent backup
#
# Environment variables (with defaults):
#   DB_HOST       — PostgreSQL host              (default: localhost)
#   DB_PORT       — PostgreSQL port              (default: 5432)
#   DB_NAME       — PostgreSQL database name     (default: complianceos)
#   DB_USER       — PostgreSQL user              (default: complianceos)
#   DB_PASSWORD   — PostgreSQL password          (default: complianceos)
#   BACKUP_DIR    — Directory containing backups (default: ./backups)
#   UPLOADS_DIR   — Uploads directory target     (default: /app/uploads)
#
set -euo pipefail

# -----------------------------------------------
# Coloured output helpers
# -----------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

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
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Auto-detect uploads target directory
if [ -n "${UPLOADS_DIR:-}" ]; then
    UPLOADS_DEST="$UPLOADS_DIR"
else
    PROJECT_UPLOADS="/d/OneDrive - Intellfence/WebDev/ComplianceOS/uploads"
    if [ -d "$(dirname "$PROJECT_UPLOADS")" ]; then
        UPLOADS_DEST="$PROJECT_UPLOADS"
    else
        UPLOADS_DEST="/app/uploads"
    fi
fi

# -----------------------------------------------
# Prerequisites
# -----------------------------------------------
check_prerequisites() {
    if ! command -v psql &>/dev/null; then
        error "psql not found.  Install PostgreSQL client tools and try again."
        exit 1
    fi
    if ! command -v gunzip &>/dev/null; then
        error "gunzip (gzip) not found.  Install gzip and try again."
        exit 1
    fi
    if ! command -v tar &>/dev/null; then
        error "tar not found.  Install tar and try again."
        exit 1
    fi
}

# -----------------------------------------------
# Locate the backup directory
# -----------------------------------------------
locate_backup() {
    local input="${1:-}"

    # --latest flag — pick most recent
    if [ "${input}" = "--latest" ]; then
        local latest
        latest=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name 'backup_*' \
                  -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
        if [ -z "${latest}" ]; then
            error "No backups found in ${BACKUP_DIR}."
            exit 1
        fi
        echo "${latest}"
        return
    fi

    # Explicit path supplied
    if [ -n "${input}" ]; then
        if [ -d "${input}" ]; then
            echo "${input}"
            return
        else
            error "Specified backup path does not exist: ${input}"
            exit 1
        fi
    fi

    # Prompt user interactively
    while true; do
        echo -e -n "${CYAN}Enter path to backup directory (or '--latest'): ${NC}"
        read -r user_path
        if [ "${user_path}" = "--latest" ]; then
            # Recurse with --latest logic
            locate_backup "--latest"
            return
        fi
        if [ -d "${user_path}" ]; then
            echo "${user_path}"
            return
        fi
        error "Directory not found: ${user_path}.  Try again."
    done
}

# -----------------------------------------------
# Confirm destructive operation
# -----------------------------------------------
confirm_destructive() {
    local db="$1"
    echo ""
    warn "${BOLD}DANGER ZONE${NC}"
    warn "This will ${BOLD}DROP AND RECREATE${NC} the database '${db}'."
    warn "All existing data in '${db}' will be ${RED}PERMANENTLY LOST${NC}."
    echo ""
    echo -e -n "${YELLOW}Type 'yes' to proceed: ${NC}"
    read -r confirmation
    if [ "${confirmation}" != "yes" ]; then
        info "Restore cancelled by user."
        exit 0
    fi
}

# -----------------------------------------------
# Drop and recreate database
# -----------------------------------------------
reset_database() {
    local db="$1"
    info "Dropping database '${db}' (if exists)..."

    export PGPASSWORD="${DB_PASSWORD}"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
         -c "DROP DATABASE IF EXISTS \"${db}\";" --no-password 2>/dev/null

    info "Creating database '${db}'..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
         -c "CREATE DATABASE \"${db}\";" --no-password 2>/dev/null

    unset PGPASSWORD
    success "Database '${db}' is ready."
}

# -----------------------------------------------
# Restore database from gzipped dump
# -----------------------------------------------
restore_database() {
    local dump_path="$1"
    if [ ! -f "${dump_path}" ]; then
        error "Database dump file not found: ${dump_path}"
        exit 1
    fi

    info "Restoring database from $(basename "${dump_path}")..."
    export PGPASSWORD="${DB_PASSWORD}"

    gunzip -c "${dump_path}" | psql -h "${DB_HOST}" -p "${DB_PORT}" \
        -U "${DB_USER}" -d "${DB_NAME}" --no-password 2>/dev/null

    unset PGPASSWORD
    success "Database restore complete."
}

# -----------------------------------------------
# Extract uploads archive
# -----------------------------------------------
restore_uploads() {
    local archive_path="$1"
    if [ ! -f "${archive_path}" ]; then
        warn "Uploads archive not found: ${archive_path} — skipping."
        return
    fi

    # Check if archive has content (ignore placeholder empty archives)
    local archive_size
    archive_size=$(stat -c%s "${archive_path}" 2>/dev/null || stat -f%z "${archive_path}" 2>/dev/null || echo "0")
    if [ "${archive_size}" -le 100 ]; then
        info "Uploads archive appears empty or is a placeholder — skipping extraction."
        return
    fi

    info "Extracting uploads to ${UPLOADS_DEST}..."
    mkdir -p "${UPLOADS_DEST}"
    tar -xzf "${archive_path}" -C "$(dirname "${UPLOADS_DEST}")" 2>/dev/null
    success "Uploads extracted to ${UPLOADS_DEST}."
}

# -----------------------------------------------
# Main
# -----------------------------------------------
main() {
    local restore_path

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ComplianceOS — Restore Script${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""

    check_prerequisites

    # Locate backup (from CLI arg, or prompt)
    restore_path=$(locate_backup "${1:-}")
    info "Using backup: ${restore_path}"

    # Confirm the backup contents
    local dump_file="${restore_path}/db_dump.sql.gz"
    local archive_file="${restore_path}/uploads.tar.gz"

    if [ ! -f "${dump_file}" ]; then
        error "Required file 'db_dump.sql.gz' not found in backup."
        exit 1
    fi

    echo ""
    info "Backup contents:"
    ls -lh "${restore_path}" | tail -n +2 | while IFS= read -r line; do
        echo -e "  ${line}"
    done
    echo ""

    # Confirm destructive operation
    confirm_destructive "${DB_NAME}"

    # Perform restore
    reset_database "${DB_NAME}"
    echo ""
    restore_database "${dump_file}"
    echo ""
    restore_uploads "${archive_file}"

    echo ""
    success "Restore completed successfully!"
    info "  Database : ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
    info "  Uploads  : ${UPLOADS_DEST}"
    echo ""
}

main "$@"
