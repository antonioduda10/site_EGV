#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=${PORTAL_ROOT:-/opt/portal-egv}
domain=${1:?Usage: configure-domain.sh SCHOOL_DOMAIN [--check-only]}
mode=${2:-activate}
[[ "$#" -le 2 && ( "$mode" = activate || "$mode" = --check-only ) ]] || exit 1
exec 8>"${PORTAL_LOCK_FILE:-/var/lock/portal-egv-deploy.lock}"
flock -n 8 || { echo 'Another deployment or backup is active.' >&2; exit 1; }
python3 "$root/bin/domain-policy.py" "$domain"
if test "$mode" = --check-only; then exit 0; fi
grep -q 'portal-egv-www-https.rule' "$root/current/compose.https.yml" || { echo 'Publish the prepared www/HTTPS release before activation.' >&2; exit 1; }
"$root/bin/compose.sh" --profile tools run --rm --no-deps migrate node deploy/check-production-users.cjs || { echo 'Manual action required: replace legacy passwords through the SSH-only dashboard first. HTTPS and environment were not changed.' >&2; exit 1; }
curl --fail --silent --max-time 10 http://127.0.0.1:3000/api/health >/dev/null
python3 <<'PY'
import json,subprocess
arguments=json.loads(subprocess.check_output(['docker','inspect','--format','{{json .Config.Cmd}}','traefik-traefik-1'],text=True))
required={'--providers.docker=true','--entrypoints.web.address=:80','--entrypoints.websecure.address=:443','--certificatesresolvers.letsencrypt.acme.httpchallenge=true','--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web'}
if not required.issubset(set(arguments)):
    raise SystemExit('Existing Traefik configuration requires review; no changes were made.')
PY
PORTAL_DEPLOY_LOCK_HELD=1 "$root/bin/backup.sh"
rollback_dir=$(mktemp -d "$root/shared/domain-rollback.XXXXXXXX")
cp -a "$root/shared/.env" "$rollback_dir/environment.env"
was_https=false
if test -f "$root/shared/https.enabled"; then was_https=true; fi
changed=false
rollback() {
  local status=$?
  trap - ERR INT TERM HUP
  set +e
  if test "$changed" = true; then
    cp -a "$rollback_dir/environment.env" "$root/shared/.env"
    if test "$was_https" = true; then touch "$root/shared/https.enabled"; else rm -f "$root/shared/https.enabled"; fi
    if "$root/bin/compose.sh" up -d --no-deps app; then
      echo 'HTTPS activation failed; the previous application configuration was restored. Traefik and database were not recreated.' >&2
    else
      echo 'Configuration was restored, but app restart failed; manual review is required. Traefik and database were not recreated.' >&2
    fi
  fi
  if test "$status" -eq 0; then status=1; fi
  exit "$status"
}
trap rollback ERR INT TERM HUP
changed=true
python3 - "$root/shared/.env" "$domain" <<'PY'
import os,pathlib,sys,tempfile
p=pathlib.Path(sys.argv[1])
values={'NEXTAUTH_URL':'https://'+sys.argv[2],'PORTAL_HOST':sys.argv[2],'PORTAL_WWW_HOST':'www.'+sys.argv[2]}
lines=[]
for line in p.read_text().splitlines():
    key=line.split('=',1)[0]
    lines.append(key+'='+values.pop(key) if key in values else line)
lines.extend(key+'='+value for key,value in values.items())
fd,temporary=tempfile.mkstemp(prefix='.domain-',dir=p.parent)
with os.fdopen(fd,'w') as stream: stream.write('\n'.join(lines)+'\n')
os.replace(temporary,p)
PY
touch "$root/shared/https.enabled"
"$root/bin/compose.sh" config --quiet
"$root/bin/compose.sh" up -d --no-deps app
verified=false
deadline=$((SECONDS + 240))
while test "$SECONDS" -lt "$deadline"; do
  if curl --fail --silent --max-time 5 --resolve "$domain:443:127.0.0.1" "https://$domain/api/health" >/dev/null \
    && curl --fail --silent --max-time 5 --resolve "www.$domain:443:127.0.0.1" "https://www.$domain/" >/dev/null; then
    verified=true
    break
  fi
  sleep 3
done
test "$verified" = true
curl --fail --silent --max-time 10 "https://$domain/api/health" >/dev/null
for source in "http://$domain" "http://www.$domain" "https://www.$domain"; do
  destination=$(curl --silent --max-time 10 --output /dev/null --write-out '%{redirect_url}' "$source/noticias?check=canonical")
  test "$destination" = "https://$domain/noticias?check=canonical"
done
trap - ERR INT TERM HUP
echo "HTTPS and canonical redirects verified: https://$domain (including www certificate). Cloudflare may now use Full (strict)."
