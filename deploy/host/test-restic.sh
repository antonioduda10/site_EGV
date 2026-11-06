#!/usr/bin/env bash
set -euo pipefail
umask 077
image=restic/restic:0.19.1@sha256:136600b6ff6843d61d355f7f71f460a166429f35de6fd11b568fece3c9a4d510
work=$(mktemp -d /tmp/portal-egv-restic-test.XXXXXXXX)
cleanup() {
  [[ "$(realpath -m "$work")" == /tmp/portal-egv-restic-test.* ]] || return 1
  rm -rf --one-file-system -- "$work"
}
trap cleanup EXIT
mkdir "$work/repository" "$work/source" "$work/restore"
python3 - "$work/password" <<'PY'
import pathlib,secrets,sys
pathlib.Path(sys.argv[1]).write_text(secrets.token_urlsafe(48))
PY
printf 'EGV_SYNTHETIC_BACKUP_ONLY_2026\n' > "$work/source/database.dump"
printf 'EGV_SYNTHETIC_UPLOADS_ONLY_2026\n' > "$work/source/uploads.tar.gz"
restic() {
  docker run --rm --pull never --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --memory 512m --cpus 0.5 \
    --tmpfs /tmp:rw,size=134217728,mode=1777 \
    --env RESTIC_REPOSITORY=/repository --env RESTIC_PASSWORD_FILE=/password --env GOMAXPROCS=1 \
    --mount "type=bind,src=$work/password,dst=/password,readonly" \
    --mount "type=bind,src=$work/repository,dst=/repository" \
    --mount "type=bind,src=$work/source,dst=/source,readonly" \
    --mount "type=bind,src=$work/restore,dst=/restore" \
    "$image" --no-cache --quiet "$@" >> "$work/operations.log" 2>&1
}
restic init
restic backup --host portal-egv-fixture /source
restic check --read-data
restic restore latest --target /restore
cmp "$work/source/database.dump" "$work/restore/source/database.dump"
cmp "$work/source/uploads.tar.gz" "$work/restore/source/uploads.tar.gz"
if grep -R -q 'EGV_SYNTHETIC_' "$work/repository"; then
  echo 'Unexpected plaintext fixture in the encrypted repository.' >&2
  exit 1
fi
echo 'Restic encrypted round-trip verified offline with synthetic bytes; production data and R2 were not accessed.'
