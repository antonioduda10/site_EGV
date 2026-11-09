#!/usr/bin/env bash
set -euo pipefail
root=${PORTAL_ROOT:-/opt/portal-egv}
test -d "$root/current"
if test -f "$root/shared/active-bluegreen.json" || test -f "$root/shared/online-backup-release.json"; then
  exec python3 "$root/bin/bluegreen_operations.py" compose "$@"
fi
args=(-p portal-egv --project-directory "$root/current" --env-file "$root/shared/.env" -f "$root/current/compose.production.yml")
if test -f "$root/shared/https.enabled"; then args+=(-f "$root/current/compose.https.yml"); fi
exec docker compose "${args[@]}" "$@"
