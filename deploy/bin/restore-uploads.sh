#!/usr/bin/env bash
set -euo pipefail
root=${PORTAL_ROOT:-/opt/portal-egv}
test "${2:-}" = --confirm-replace-uploads || { echo 'Usage: restore-uploads.sh BACKUP_DIRECTORY --confirm-replace-uploads' >&2; exit 1; }
exec 8>/var/lock/portal-egv-deploy.lock
flock -n 8 || { echo 'Another deployment or backup is active.' >&2; exit 1; }
backup=$(realpath -e "${1:?Backup directory required}")
test -f "$backup/uploads.tar.gz" && test -f "$backup/SHA256SUMS"
(cd "$backup" && sha256sum --check --status SHA256SUMS)
PORTAL_DEPLOY_LOCK_HELD=1 "$root/bin/backup.sh"
"$root/bin/compose.sh" stop app
docker run --rm --network none -v portal-egv_uploads:/data -v "$backup:/backup:ro" postgres:16-bookworm sh -eu -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar --no-same-owner -xzf /backup/uploads.tar.gz -C /data; chown -R 1001:1001 /data'
"$root/bin/compose.sh" up -d --no-deps app
echo 'Uploads restored. Verify file access and health.'
