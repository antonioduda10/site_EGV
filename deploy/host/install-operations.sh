#!/usr/bin/env bash
set -euo pipefail
root=/opt/portal-egv
install -d -m 700 "$root/bin" "$root/shared/smoke"
install -m 700 "$root/current/deploy/bin/"*.sh "$root/bin/"
install -m 700 "$root/current/deploy/bin/deploy.sh" "$root/deploy.sh"
install -m 700 "$root/current/deploy/r2-backup.py" "$root/bin/"
install -m 700 "$root/current/deploy/domain-policy.py" "$root/bin/"
install -m 600 "$root/current/deploy/r2.env.example" "$root/bin/"
install -m 644 "$root/current/deploy/systemd/portal-egv-backup.service" /etc/systemd/system/
install -m 644 "$root/current/deploy/systemd/portal-egv-backup.timer" /etc/systemd/system/
install -m 644 "$root/current/deploy/systemd/portal-egv-backup-external.service" /etc/systemd/system/
install -m 644 "$root/current/deploy/systemd/portal-egv-backup-external.timer" /etc/systemd/system/
install -m 644 "$root/current/deploy/logrotate-portal-egv" /etc/logrotate.d/portal-egv
systemctl daemon-reload
systemctl enable --now portal-egv-backup.timer
systemctl list-timers portal-egv-backup.timer --no-pager
