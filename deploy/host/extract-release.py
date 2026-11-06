#!/usr/bin/env python3
import hashlib
import pathlib
import stat
import sys
import zipfile

root = pathlib.Path('/opt/portal-egv')
release, expected = sys.argv[1:3]
if not release.replace('-', '').isalnum() or len(expected) != 64:
    raise SystemExit('Invalid release metadata.')
archive = root / 'incoming' / f'{release}.zip'
if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
    raise SystemExit('Archive checksum mismatch.')
destination = root / 'releases' / release
destination.mkdir(mode=0o755, exist_ok=False)
with zipfile.ZipFile(archive) as package:
    for item in package.infolist():
        relative = pathlib.PurePosixPath(item.filename)
        if relative.is_absolute() or '..' in relative.parts or stat.S_ISLNK(item.external_attr >> 16):
            raise SystemExit('Unsafe path in release archive.')
        if relative.name == '.env' or 'node_modules' in relative.parts:
            raise SystemExit('Private/runtime file in source archive.')
    package.extractall(destination)
for item in (destination / 'deploy').rglob('*.sh'):
    item.chmod(0o755 if 'postgres-init' in item.parts else 0o700)
print(f'Release extracted and checksum verified: {release}')
