import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'deploy/bin/configure-domain.sh'
DOMAIN = 'escolagetuliovargas.com.br'


class DomainActivationTests(unittest.TestCase):
    def prepare(self, root):
        for directory in ['bin', 'current', 'shared', 'fake-bin']:
            (root / directory).mkdir()
        (root / 'current/compose.https.yml').write_text('portal-egv-www-https.rule: fixture\n')
        (root / 'shared/.env').write_text('NEXTAUTH_URL=http://previous.example\nPORTAL_HOST=previous.example\n')
        (root / 'shared/.env').chmod(0o600)
        files = {
            'bin/domain-policy.py': 'import os; raise SystemExit(int(os.environ.get("FAKE_DNS_EXIT", "0")))\n',
            'bin/backup.sh': '#!/bin/bash\ntouch "$PORTAL_ROOT/backup-ran"\n',
            'bin/compose.sh': '''#!/bin/bash
printf '%s\\n' "$*" >> "$PORTAL_ROOT/commands.txt"
if [[ "$*" == *check-production-users.cjs* ]]; then exit "${FAKE_WEAK_PASSWORDS:-0}"; fi
if [[ "$*" == 'up -d --no-deps app' && "${FAKE_UP_FAIL:-0}" = 1 && ! -f "$PORTAL_ROOT/failed-once" ]]; then touch "$PORTAL_ROOT/failed-once"; exit 1; fi
''',
            'fake-bin/curl': '''#!/bin/bash
if [[ "$*" == *--write-out* ]]; then printf 'https://escolagetuliovargas.com.br/noticias?check=canonical'; fi
''',
            'fake-bin/docker': "#!/bin/bash\nprintf '%s\\n' '" + json.dumps([
                '--providers.docker=true', '--entrypoints.web.address=:80', '--entrypoints.websecure.address=:443',
                '--certificatesresolvers.letsencrypt.acme.httpchallenge=true', '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web'
            ]) + "'\n"
        }
        for name, content in files.items():
            filename = root / name
            filename.write_text(content)
            filename.chmod(0o700)

    def execute(self, root, **overrides):
        environment = dict(os.environ, PORTAL_ROOT=str(root), PORTAL_LOCK_FILE=str(root / 'lock'), PATH=str(root / 'fake-bin') + os.pathsep + os.environ['PATH'], **overrides)
        return subprocess.run(['bash', str(SCRIPT), DOMAIN], env=environment, capture_output=True, text=True, timeout=20)

    def test_dns_pending_changes_nothing_and_does_not_backup_or_restart(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.prepare(root)
            original = (root / 'shared/.env').read_bytes()
            result = self.execute(root, FAKE_DNS_EXIT='2')
            self.assertEqual(result.returncode, 2)
            self.assertEqual((root / 'shared/.env').read_bytes(), original)
            self.assertFalse((root / 'shared/https.enabled').exists())
            self.assertFalse((root / 'backup-ran').exists())
            self.assertFalse((root / 'commands.txt').exists())

    def test_legacy_passwords_block_activation_before_environment_changes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.prepare(root)
            original = (root / 'shared/.env').read_bytes()
            result = self.execute(root, FAKE_WEAK_PASSWORDS='1')
            self.assertEqual(result.returncode, 1)
            self.assertEqual((root / 'shared/.env').read_bytes(), original)
            self.assertFalse((root / 'backup-ran').exists())

    def test_app_failure_restores_previous_environment_and_https_flag(self):
        for was_https in [False, True]:
            with self.subTest(was_https=was_https), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                self.prepare(root)
                if was_https:
                    (root / 'shared/https.enabled').touch()
                original = (root / 'shared/.env').read_bytes()
                result = self.execute(root, FAKE_UP_FAIL='1')
                self.assertEqual(result.returncode, 1)
                self.assertEqual((root / 'shared/.env').read_bytes(), original)
                self.assertEqual((root / 'shared/https.enabled').exists(), was_https)
                self.assertEqual((root / 'commands.txt').read_text().count('up -d --no-deps app'), 2)

    def test_success_updates_only_public_origin_and_preserves_private_mode(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.prepare(root)
            result = self.execute(root)
            self.assertEqual(result.returncode, 0, result.stderr)
            contents = (root / 'shared/.env').read_text()
            self.assertIn('NEXTAUTH_URL=https://' + DOMAIN, contents)
            self.assertIn('PORTAL_WWW_HOST=www.' + DOMAIN, contents)
            self.assertTrue((root / 'shared/https.enabled').exists())
            self.assertEqual((root / 'shared/.env').stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
