#!/usr/bin/env bash
set -euo pipefail
umask 077
root=/opt/portal-egv
cd "$root/current"
compose=(docker compose -p portal-egv --env-file "$root/shared/.env" -f compose.production.yml)
test ! -e "$root/shared/import.completed" || { echo 'Initial import already completed; no data was overwritten.'; exit 0; }
chmod 600 "$root/shared/database.dump" "$root/shared/uploads.tar.gz" "$root/shared/transfer-manifest.json"
python3 - <<'PY'
import hashlib, json, pathlib, tarfile
base=pathlib.Path('/opt/portal-egv/shared')
manifest=json.loads((base/'transfer-manifest.json').read_text())
for name,key in [('database.dump','databaseSha256'),('uploads.tar.gz','uploadsSha256')]:
    h=hashlib.sha256()
    with (base/name).open('rb') as stream:
        for data in iter(lambda:stream.read(1024*1024),b''): h.update(data)
    if h.hexdigest()!=manifest[key]: raise SystemExit('Private transfer checksum mismatch.')
with tarfile.open(base/'uploads.tar.gz','r:gz') as archive:
    for item in archive:
        p=pathlib.PurePosixPath(item.name)
        if p.is_absolute() or '..' in p.parts or item.issym() or item.islnk() or not (item.isfile() or item.isdir()): raise SystemExit('Unsafe upload archive.')
print('Database and upload archive checksums verified; archive paths are confined.')
PY
docker volume create portal-egv_postgres_data >/dev/null
"${compose[@]}" up -d db
for attempt in {1..60}; do
  id=$("${compose[@]}" ps -q db)
  test "$(docker inspect --format '{{.State.Health.Status}}' "$id")" != healthy || break
  sleep 2
done
# A separate constant statement avoids interpolating datasource values into SQL or logs.
tables=$(printf "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';\n" | "${compose[@]}" exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At')
test "$tables" = 0 || { echo 'Target database is not empty; import refused.' >&2; exit 1; }
"${compose[@]}" exec -T db pg_restore --list < "$root/shared/database.dump" > "$root/shared/restore-private.list"
# A freshly initialized PostgreSQL already owns the public schema. Skip only its
# CREATE SCHEMA entry, not any table, type, row, index or migration record.
python3 - <<'PY'
import pathlib,re
p=pathlib.Path('/opt/portal-egv/shared/restore-private.list')
p.write_text(''.join(line for line in p.read_text().splitlines(keepends=True) if not re.match(r'^\d+;\s+\d+\s+\d+\s+SCHEMA\s+-\s+public\s',line)))
PY
docker cp "$root/shared/restore-private.list" "$id:/tmp/portal-restore.list"
"${compose[@]}" exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --role=portal_egv --no-owner --no-acl --exit-on-error --use-list=/tmp/portal-restore.list' < "$root/shared/database.dump" 2> "$root/shared/import-private.log" || { echo 'Restore failed; private diagnostic log retained on the VPS.' >&2; exit 1; }
docker volume create portal-egv_uploads >/dev/null
docker volume create portal-egv_app_logs >/dev/null
docker run --rm --network none -v portal-egv_uploads:/data -v portal-egv_app_logs:/logs -v "$root/shared:/transfer:ro" postgres:16-bookworm sh -eu -c '
  test -z "$(find /data -mindepth 1 -maxdepth 1 -print -quit)" || { echo "Uploads volume is not empty; import refused." >&2; exit 1; }
  tar --no-same-owner --no-same-permissions -xzf /transfer/uploads.tar.gz -C /data
  chown -R 1001:1001 /data /logs
  find /data /logs -type d -exec chmod 750 {} +
  find /data /logs -type f -exec chmod 640 {} +
'
touch "$root/shared/import.completed"
echo 'Initial database and uploads restored without resetting the source or an existing database.'
