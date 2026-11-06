#!/usr/bin/env bash
set -euo pipefail
root=${PORTAL_ROOT:-/opt/portal-egv}
test "${2:-}" = --confirm-replace-database || { echo 'Usage: restore-db.sh BACKUP_DIRECTORY --confirm-replace-database' >&2; exit 1; }
exec 8>/var/lock/portal-egv-deploy.lock
flock -n 8 || { echo 'Another deployment or backup is active.' >&2; exit 1; }
backup=$(realpath -e "${1:?Backup directory required}")
test -f "$backup/database.dump" && test -f "$backup/SHA256SUMS"
(cd "$backup" && sha256sum --check --status SHA256SUMS)
PORTAL_DEPLOY_LOCK_HELD=1 "$root/bin/backup.sh"
"$root/bin/compose.sh" stop app
"$root/bin/compose.sh" exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --role=portal_egv --clean --if-exists --no-owner --no-acl --exit-on-error' < "$backup/database.dump"
"$root/bin/compose.sh" --profile tools run --rm --no-deps migrate
"$root/bin/compose.sh" up -d --no-deps app
echo 'Database restored. Verify health and application behavior before allowing traffic.'
