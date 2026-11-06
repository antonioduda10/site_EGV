#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
test "$(id -u)" = 0
backup=/var/backups/portal-egv/host
install -d -m 700 "$backup"
stamp=$(date -u +%Y%m%dT%H%M%SZ)

if ! command -v swapon >/dev/null; then
  apt-get update -qq
  apt-get install -y --no-install-recommends mount
fi
if ! swapon --noheadings --show=NAME | grep -q .; then
  if test -e /swapfile; then
    echo 'A swapfile already exists but is inactive; review it before continuing.' >&2
    exit 1
  fi
  test "$(findmnt -no FSTYPE /)" = ext4
  test "$(df --output=avail -B1 / | tail -1)" -gt 5368709120
  umask 077
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi
if swapon --noheadings --show=NAME | grep -qx /swapfile && ! grep -Eq '^/swapfile[[:space:]]' /etc/fstab; then
  cp -a /etc/fstab "$backup/fstab-$stamp"
  printf '\n/swapfile none swap sw 0 0\n' >> /etc/fstab
fi
printf 'vm.swappiness=10\n' > /etc/sysctl.d/90-portal-egv-swap.conf
sysctl -q -p /etc/sysctl.d/90-portal-egv-swap.conf
timedatectl set-timezone America/Fortaleza
hostnamectl set-hostname portal-egv
install -d -m 755 /opt/portal-egv/releases /opt/portal-egv/bin
install -d -m 700 /opt/portal-egv/shared /opt/portal-egv/incoming /var/backups/portal-egv/data
free -h
swapon --show
echo 'Swap and host directories ready. Docker and Traefik were not reinstalled.'
