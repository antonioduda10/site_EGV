#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
test "$(id -u)" = 0
test -s /root/.ssh/authorized_keys
backup=/var/backups/portal-egv/host
install -d -m 700 "$backup"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
cp -a /etc/ssh/sshd_config "$backup/sshd_config-$stamp"
cp -a /etc/ssh/sshd_config.d "$backup/sshd_config.d-$stamp"
printf '%s\n' 'PubkeyAuthentication yes' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' 'PermitRootLogin prohibit-password' 'X11Forwarding no' > /etc/ssh/sshd_config.d/00-00-portal-egv.conf
chmod 600 /etc/ssh/sshd_config.d/00-00-portal-egv.conf
sshd -t
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH public key access'
ufw allow 80/tcp comment 'Traefik HTTP'
ufw allow 443/tcp comment 'Traefik HTTPS'
ufw --force enable
systemctl reload ssh
ufw status verbose
sshd -T | grep -E '^(pubkeyauthentication|passwordauthentication|permitrootlogin) '
echo 'Keep the current session open until a second public-key SSH connection succeeds.'
