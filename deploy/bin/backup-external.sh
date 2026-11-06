#!/usr/bin/env bash
set -euo pipefail
umask 077
if test "$#" -eq 0; then set -- backup; fi
exec python3 /opt/portal-egv/bin/r2-backup.py "$@"
