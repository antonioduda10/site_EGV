#!/usr/bin/env bash
set -euo pipefail
umask 077
root=${PORTAL_ROOT:-/opt/portal-egv}
next=$(realpath -e "${1:?Usage: deploy.sh /opt/portal-egv/releases/RELEASE}")
[[ "$next" == "$root/releases/"* ]] && test -f "$next/compose.production.yml" || { echo 'Invalid release directory.' >&2; exit 1; }
release=$(basename "$next")
[[ "$release" =~ ^[0-9]{14}-[a-f0-9]{12}$ ]] || exit 1
exec 8>/var/lock/portal-egv-deploy.lock
flock -n 8 || { echo 'Another deployment is active.' >&2; exit 1; }
if test -f "$root/shared/active-bluegreen.json" || test -f "$root/shared/online-backup-release.json"; then
  echo 'Legacy replacement is disabled. Use the committed-source blue/green procedure; no migration was run.' >&2
  exit 1
fi
previous=$(readlink -f "$root/current")
previous_image=$(python3 -c 'import pathlib; p=pathlib.Path("/opt/portal-egv/shared/.env"); print(next(x.split("=",1)[1] for x in p.read_text().splitlines() if x.startswith("PORTAL_IMAGE=")))')
export PORTAL_IMAGE="portal-egv:$release"
candidate() {
  local args=(-p portal-egv --project-directory "$next" --env-file "$root/shared/.env" -f "$next/compose.production.yml")
  if test -f "$root/shared/https.enabled"; then args+=(-f "$next/compose.https.yml"); fi
  docker compose "${args[@]}" "$@"
}
candidate --profile tools config --quiet
candidate --profile tools build app migrate
PORTAL_DEPLOY_LOCK_HELD=1 "$root/bin/backup.sh"
rollback() {
  trap - ERR
  echo 'Deployment failed; attempting application-image rollback. Database migrations are NOT reversed automatically.' >&2
  export PORTAL_IMAGE="$previous_image"
  ln -sfn "$previous" "$root/current"
  "$root/bin/compose.sh" up -d --no-deps app || true
  echo 'Review database compatibility and the pre-deploy backup before any manual restoration.' >&2
  exit 1
}
trap rollback ERR
candidate --profile tools run --rm --no-deps migrate
ln -sfn "$next" "$root/current"
candidate up -d --no-deps app
healthy=false
for attempt in {1..60}; do
  id=$(candidate ps -q app)
  if test -n "$id" && test "$(docker inspect --format '{{.State.Health.Status}}' "$id")" = healthy; then healthy=true; break; fi
  sleep 2
done
test "$healthy" = true
python3 - "$PORTAL_IMAGE" <<'PY'
import os,pathlib,sys
p=pathlib.Path('/opt/portal-egv/shared/.env')
lines=p.read_text().splitlines()
value='\n'.join('PORTAL_IMAGE='+sys.argv[1] if x.startswith('PORTAL_IMAGE=') else x for x in lines)+'\n'
tmp=p.with_suffix('.new')
fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as stream: stream.write(value)
os.replace(tmp,p)
PY
trap - ERR
install -m 700 "$next/deploy/bin/"*.sh "$root/bin/"
install -m 700 "$next/deploy/bin/deploy.sh" "$root/deploy.sh"
install -m 700 "$next/deploy/r2-backup.py" "$root/bin/"
install -m 700 "$next/deploy/domain-policy.py" "$root/bin/"
install -m 600 "$next/deploy/r2.env.example" "$root/bin/"
echo "Deployment healthy: $release"
