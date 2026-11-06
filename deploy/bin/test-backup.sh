#!/usr/bin/env bash
set -euo pipefail
root=${PORTAL_ROOT:-/opt/portal-egv}
backup=$(find /var/backups/portal-egv/data -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' | sort | tail -1)
test -n "$backup" && test -f "$backup/SHA256SUMS"
(cd "$backup" && sha256sum --check --status SHA256SUMS)
suffix="$(date -u +%s)_$RANDOM"
database="portal_egv_restorecheck_$suffix"
volume="portal-egv-restorecheck-${suffix//_/-}"
[[ "$database" =~ ^portal_egv_restorecheck_[0-9_]+$ ]] || exit 1
[[ "$volume" =~ ^portal-egv-restorecheck-[0-9-]+$ ]] || exit 1
created_db=false
created_volume=false
cleanup() {
  if test "$created_db" = true; then "$root/bin/compose.sh" exec -T db sh -c 'exec dropdb -U "$POSTGRES_USER" --force "$1"' sh "$database" >/dev/null; fi
  if test "$created_volume" = true; then docker volume rm "$volume" >/dev/null; fi
}
trap cleanup EXIT
"$root/bin/compose.sh" exec -T db sh -c 'exec createdb -U "$POSTGRES_USER" --owner=portal_egv "$1"' sh "$database"
created_db=true
"$root/bin/compose.sh" exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$1" --role=portal_egv --clean --if-exists --no-owner --no-acl --exit-on-error' sh "$database" < "$backup/database.dump"
query='SELECT json_build_object('\''users'\'',(SELECT count(*) FROM "Usuario"),'\''news'\'',(SELECT count(*) FROM "Noticia"),'\''documents'\'',(SELECT count(*) FROM "ArquivoDocumento"),'\''migrations'\'',(SELECT count(*) FROM "_prisma_migrations"));'
live=$(printf '%s\n' "$query" | "$root/bin/compose.sh" exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At')
restored=$(printf '%s\n' "$query" | "$root/bin/compose.sh" exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d "$1" -At' sh "$database")
test "$live" = "$restored"
if docker volume inspect "$volume" >/dev/null 2>&1; then echo 'Temporary restore volume already exists; refusing reuse.' >&2; exit 1; fi
docker volume create "$volume" >/dev/null
created_volume=true
docker run --rm --network none -v "$volume:/data" -v "$backup:/backup:ro" postgres:16-bookworm sh -eu -c 'tar --no-same-owner -xzf /backup/uploads.tar.gz -C /data; chown -R 1001:1001 /data'
"$root/bin/compose.sh" --profile tools run --rm --no-deps -v portal-egv_uploads:/source:ro -v "$volume:/restored:ro" migrate node -e '
const fs=require("fs"),path=require("path"),crypto=require("crypto");
function scan(root,relative="",result={}) { for(const item of fs.readdirSync(path.join(root,relative),{withFileTypes:true})) {const name=path.join(relative,item.name);if(item.isSymbolicLink())throw new Error("Unexpected link");if(item.isDirectory())scan(root,name,result);else result[name]=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,name))).digest("hex");}return result;}
const source=scan("/source"),restored=scan("/restored");const ok=JSON.stringify(Object.entries(source).sort())===JSON.stringify(Object.entries(restored).sort());console.log(JSON.stringify({restoredUploadFiles:Object.keys(restored).length,allBytesMatch:ok}));if(!ok)process.exitCode=1;
'
echo 'Backup restored successfully into an isolated temporary database and volume; production data was not overwritten.'
