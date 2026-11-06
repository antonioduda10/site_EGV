#!/usr/bin/env python3
import os
import pathlib
import secrets
import sys

root = pathlib.Path('/opt/portal-egv')
target = root / 'shared/.env'
if target.exists():
    raise SystemExit('Production environment already exists; it was not overwritten.')
release = sys.argv[1]
if not release.replace('-', '').isalnum():
    raise SystemExit('Invalid release identifier.')
password = secrets.token_hex(32)
content = {
    'POSTGRES_DB': 'portal_egv',
    'POSTGRES_USER': 'portal_bootstrap',
    'POSTGRES_PASSWORD': secrets.token_hex(32),
    'APP_DATABASE_PASSWORD': password,
    'DATABASE_URL': f'postgresql://portal_egv:{password}@db:5432/portal_egv?schema=public&connection_limit=5&pool_timeout=20',
    'NEXTAUTH_SECRET': secrets.token_hex(48),
    'NEXTAUTH_URL': 'http://179.66.135.203',
    'PORTAL_HOST': '179.66.135.203',
    'PORTAL_IMAGE': f'portal-egv:{release}',
}
target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as output:
    output.writelines(f'{key}={value}\n' for key, value in content.items())
print('Production secrets generated on the VPS; values were not displayed.')
