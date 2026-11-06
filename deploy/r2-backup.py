#!/usr/bin/env python3
"""Encrypted off-site backup of a completed local snapshot, never live volumes."""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path('/opt/portal-egv')
BACKUPS = Path('/var/backups/portal-egv/data')
RESTORE = Path('/var/backups/portal-egv/restore-r2')
IMAGE = 'restic/restic:0.19.1@sha256:136600b6ff6843d61d355f7f71f460a166429f35de6fd11b568fece3c9a4d510'
STAMP = re.compile(r'^\d{8}T\d{6}Z$')


class BackupError(Exception):
    pass


def private_directory(path):
    if path.is_symlink() or not path.is_dir() or path.stat().st_uid != 0 or stat.S_IMODE(path.stat().st_mode) != 0o700:
        raise BackupError('Private operational directories must be root-owned, mode 0700, without links.')


def private_file(path):
    if path.is_symlink() or not path.is_file():
        raise BackupError('A required private file is missing or is a link.')
    info = path.stat()
    if info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise BackupError('Private files must belong to root and have mode 0600.')


def parse_configuration(text):
    allowed = {'RESTIC_REPOSITORY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION'}
    values = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, separator, value = line.partition('=')
        if not separator or key not in allowed or key in values or not value or value != value.strip():
            raise BackupError('Invalid R2 configuration; use the example without shell syntax.')
        if 'REPLACE_' in value or 'YOUR_' in value or value[0] in "\"'":
            raise BackupError('R2 credentials have not been configured yet.')
        values[key] = value
    if set(values) != allowed or values['AWS_DEFAULT_REGION'] != 'auto':
        raise BackupError('R2 requires the four documented variables and region auto.')
    repository = values['RESTIC_REPOSITORY']
    url = urlsplit(repository[3:]) if repository.startswith('s3:') else urlsplit('')
    if url.scheme != 'https' or not re.fullmatch(r'[a-f0-9]{32}(?:\.eu|\.fedramp|\.us)?\.r2\.cloudflarestorage\.com', url.netloc):
        raise BackupError('Use the HTTPS S3 endpoint from the R2 dashboard, without credentials in its URL.')
    parts = url.path.split('/')[1:]
    if len(parts) < 2 or any(not re.fullmatch(r'[a-zA-Z0-9_-][a-zA-Z0-9._-]*', p) or p in {'.', '..'} for p in parts) or url.query or url.fragment:
        raise BackupError('Use a dedicated private bucket and repository prefix.')
    if min(len(values[k]) for k in ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) < 20:
        raise BackupError('R2 access credentials are incomplete.')
    return values


def verify_snapshot(directory):
    if directory.is_symlink() or not directory.is_dir():
        raise BackupError('Unsafe snapshot directory.')
    manifest = directory / 'SHA256SUMS'
    if manifest.is_symlink() or not manifest.is_file():
        raise BackupError('The backup has no regular checksum manifest.')
    names = set()
    for line in manifest.read_text().splitlines():
        parts = line.split()
        if len(parts) != 2 or not re.fullmatch(r'[a-f0-9]{64}', parts[0]) or parts[1] not in {'database.dump', 'uploads.tar.gz'} or parts[1] in names:
            raise BackupError('Invalid backup checksum manifest.')
        filename = directory / parts[1]
        if filename.is_symlink() or not filename.is_file():
            raise BackupError('The snapshot is incomplete or contains an unsafe link.')
        with filename.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if digest != parts[0]:
            raise BackupError('Backup checksum mismatch; refusing to send or restore it.')
        names.add(parts[1])
    if names != {'database.dump', 'uploads.tar.gz'}:
        raise BackupError('Both database and uploads must belong to the same snapshot.')


def latest_snapshot(base, now=None):
    candidates = sorted(p for p in base.iterdir() if STAMP.fullmatch(p.name) and p.is_dir() and not p.is_symlink())
    if not candidates:
        raise BackupError('No completed local backup is available.')
    selected = candidates[-1]
    age = (now or dt.datetime.now(dt.timezone.utc)) - dt.datetime.strptime(selected.name, '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc)
    if not dt.timedelta(minutes=-5) <= age <= dt.timedelta(hours=26):
        raise BackupError('The local backup is stale; run the local backup first.')
    verify_snapshot(selected)
    return selected


def prepare():
    shared = ROOT / 'shared'
    shared.mkdir(mode=0o700, exist_ok=True)
    private_directory(shared)
    environment = shared / 'r2.env'
    password = shared / 'r2-restic-password'
    for destination, content in [
        (environment, Path(__file__).with_name('r2.env.example').read_text()),
        (password, secrets.token_urlsafe(48) + '\n')
    ]:
        if not destination.exists():
            with os.fdopen(os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
                stream.write(content)
        private_file(destination)
    print('Private R2 placeholders and encryption key prepared; no external service was enabled.')


def restic(arguments, source=None, target=None):
    shared = ROOT / 'shared'
    private_directory(shared)
    config, password = shared / 'r2.env', shared / 'r2-restic-password'
    private_file(config)
    private_file(password)
    parse_configuration(config.read_text())
    if len(password.read_bytes().strip()) < 32:
        raise BackupError('The repository encryption password is too short.')
    command = ['docker', 'run', '--rm', '--pull', 'never', '--memory', '512m', '--cpus', '0.5', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:rw,size=134217728,mode=1777', '--env-file', str(config), '--env', 'GOMAXPROCS=1', '--env', 'RESTIC_PASSWORD_FILE=/run/secrets/repository-password', '--mount', f'type=bind,src={password},dst=/run/secrets/repository-password,readonly']
    for directory, destination, readonly in [(source, '/source', True), (target, '/restore', False)]:
        if directory:
            command += ['--mount', f'type=bind,src={directory},dst={destination}' + (',readonly' if readonly else '')]
    command += [IMAGE, '--json', '--no-cache'] + arguments
    result = subprocess.run(command, capture_output=True, text=True, timeout=3600, check=False)
    log = ROOT / 'shared' / 'r2-last.log'
    if log.is_symlink():
        raise BackupError('Unsafe external-backup log path.')
    descriptor = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(descriptor, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(result.stdout + result.stderr)
    if result.returncode:
        raise BackupError('Restic failed. Inspect the private r2-last.log over SSH; credentials were not printed.')
    return result.stdout


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'init', 'backup', 'check', 'restore-check', 'snapshots'])
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise BackupError('Run this operational command as root on the VPS.')
    with open('/var/lock/portal-egv-deploy.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise BackupError('A deployment or backup is running; try again later.') from None
        if args.action == 'prepare':
            prepare()
        elif args.action == 'init':
            restic(['init'])
            print('Encrypted R2 repository initialized; save its password outside this VPS.')
        elif args.action == 'backup':
            source = latest_snapshot(BACKUPS)
            restic(['backup', '--host', 'portal-egv', '--tag', 'portal-egv', '/source'], source=source)
            print(json.dumps({'externalBackupSucceeded': True, 'localSnapshot': source.name}))
        elif args.action == 'check':
            restic(['check', '--read-data'])
            print('Encrypted repository and all stored data checked successfully.')
        elif args.action == 'snapshots':
            entries = json.loads(restic(['snapshots', '--host', 'portal-egv', '--tag', 'portal-egv']))
            print(json.dumps({'externalSnapshots': len(entries or [])}))
        else:
            RESTORE.mkdir(mode=0o700, parents=True, exist_ok=True)
            private_directory(RESTORE)
            target = Path(tempfile.mkdtemp(prefix='r2-check-', dir=RESTORE))
            restic(['restore', 'latest', '--host', 'portal-egv', '--tag', 'portal-egv', '--target', '/restore'], target=target)
            verify_snapshot(target / 'source')
            if target.parent.resolve() != RESTORE.resolve() or not target.name.startswith('r2-check-'):
                raise BackupError('Unsafe temporary restore path; nothing was deleted.')
            shutil.rmtree(target)
            print('R2 download/decryption and database/uploads checksums verified without overwriting production.')


if __name__ == '__main__':
    try:
        main()
    except (BackupError, OSError, ValueError, subprocess.SubprocessError) as error:
        print(str(error) if isinstance(error, BackupError) else 'External-backup operation failed; no credentials were displayed.', file=sys.stderr)
        raise SystemExit(1) from None
