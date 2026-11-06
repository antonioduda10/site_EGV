#!/usr/bin/env python3
import datetime
import json
import os
import pathlib
import shutil
import subprocess
import yaml

container='traefik-traefik-1'
config=pathlib.Path('/docker/traefik/docker-compose.yml')
state=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
if state['HostConfig']['NetworkMode']!='host': raise SystemExit('Traefik topology changed; review required.')
original_image=state['Image']
if json.loads(subprocess.check_output(['docker','image','inspect',state['Config']['Image']]))[0]['Id']!=original_image: raise SystemExit('Traefik cached tag changed; refusing an implicit image upgrade.')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup=pathlib.Path('/var/backups/portal-egv/host')/f'traefik-{stamp}'
backup.mkdir(mode=0o700,parents=True)
shutil.copy2(config,backup/'docker-compose.yml')
if config.with_name('.env').exists(): shutil.copy2(config.with_name('.env'),backup/'environment.env')
for mount in state['Mounts']:
    if mount['Destination']=='/letsencrypt':
        subprocess.run(['tar','-C',mount['Source'],'-czf',str(backup/'letsencrypt.tar.gz'),'.'],check=True)
for p in backup.iterdir(): p.chmod(0o600)
data=yaml.safe_load(config.read_text())
service=data['services']['traefik']
flag='--entrypoints.web.http.redirections.entrypoint.priority='
service['command']=[x for x in service['command'] if not x.lower().startswith(flag)]+[flag+'1']
service['logging']={'driver':'json-file','options':{'max-size':'10m','max-file':'3'}}
temporary=config.with_suffix('.pending')
temporary.write_text(yaml.safe_dump(data,sort_keys=False))
temporary.chmod(0o600)
os.replace(temporary,config)
command=['docker','compose','--project-directory',str(config.parent),'-f',str(config)]
subprocess.run(command+['config','--quiet'],check=True)
subprocess.run(command+['up','-d','--no-deps','--pull','never','traefik'],check=True)
after=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
if after['Image']!=original_image: raise SystemExit('Unexpected image change; inspect protected backup immediately.')
print('Traefik HTTP redirect priority adjusted; same image, host network and certificate volume preserved.')
