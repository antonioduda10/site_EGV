#!/usr/bin/env bash
set -euo pipefail
umask 077
root=${PORTAL_ROOT:-/opt/portal-egv}
base=/var/backups/portal-egv/data
install -d -m 700 "$base"
if test "${PORTAL_DEPLOY_LOCK_HELD:-0}" != 1; then
  exec 7>/var/lock/portal-egv-deploy.lock
  flock -w 900 7 || { echo 'Deployment is still active; backup postponed.' >&2; exit 1; }
fi
exec 9>/var/lock/portal-egv-backup.lock
flock -n 9 || { echo 'Another backup is running.' >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
temporary="$base/.partial-$stamp"
final="$base/$stamp"
mkdir -m 700 "$temporary"
paused_id=
resume() { if test -n "$paused_id"; then docker unpause "$paused_id" >/dev/null || true; fi; }
trap resume EXIT
trap 'echo "Backup failed; incomplete files retained for diagnosis: $temporary" >&2' ERR
# Freeze only this application's writers while capturing the database and files.
# Database and Traefik remain running; outstanding app requests resume afterward.
app_id=$("$root/bin/compose.sh" ps -q app)
if test -n "$app_id" && test "$(docker inspect --format '{{.State.Running}} {{.State.Paused}}' "$app_id")" = 'true false'; then
  docker pause "$app_id" >/dev/null
  paused_id=$app_id
fi
"$root/bin/compose.sh" exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$temporary/database.dump"
docker run --rm --network none -v portal-egv_uploads:/data:ro postgres:16-bookworm tar -C /data -czf - . > "$temporary/uploads.tar.gz"
resume
paused_id=
"$root/bin/compose.sh" exec -T db pg_restore --list < "$temporary/database.dump" > /dev/null
tar -tzf "$temporary/uploads.tar.gz" > /dev/null
(cd "$temporary" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
cp -a "$root/shared/.env" "$temporary/environment.env"
readlink -f "$root/current" > "$temporary/release.txt"
mv -- "$temporary" "$final"
trap - ERR
echo "Backup completed: $stamp"
# Retain at least seven days. Only timestamp-named direct children belong to this script.
while IFS= read -r -d '' old; do
  name=$(basename "$old")
  [[ "$name" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
  [[ "$(realpath -m "$old")" == "$base/$name" ]] || exit 1
  rm -rf --one-file-system -- "$old"
done < <(find "$base" -mindepth 1 -maxdepth 1 -type d -mtime +7 -print0)
