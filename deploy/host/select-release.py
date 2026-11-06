#!/usr/bin/env python3
import os
import pathlib
import re
import sys

root=pathlib.Path('/opt/portal-egv')
release=sys.argv[1]
if not re.fullmatch(r'\d{14}-[a-f0-9]{12}',release): raise SystemExit('Invalid release.')
destination=root/'releases'/release
if not (destination/'compose.production.yml').is_file(): raise SystemExit('Release not extracted.')
environment=root/'shared/.env'
lines=environment.read_text().splitlines()
temporary=environment.with_suffix('.select')
fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as output:
    output.write('\n'.join('PORTAL_IMAGE=portal-egv:'+release if x.startswith('PORTAL_IMAGE=') else x for x in lines)+'\n')
os.replace(temporary,environment)
link=root/'current.next'
link.symlink_to(destination)
os.replace(link,root/'current')
print('Selected release without displaying or changing credentials: '+release)
