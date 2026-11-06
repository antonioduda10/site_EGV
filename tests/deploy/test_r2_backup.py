import datetime as dt
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('r2_backup', Path(__file__).resolve().parents[2] / 'deploy/r2-backup.py')
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class R2BackupTests(unittest.TestCase):
    def config(self):
        return '\n'.join([
            'RESTIC_REPOSITORY=s3:https://' + 'a' * 32 + '.r2.cloudflarestorage.com/test-bucket/portal-egv',
            'AWS_ACCESS_KEY_ID=' + 'x' * 32, 'AWS_SECRET_ACCESS_KEY=' + 'y' * 64, 'AWS_DEFAULT_REGION=auto'
        ])

    def snapshot(self, root):
        directory = root / '20261105T210000Z'
        directory.mkdir()
        lines = []
        for name in ['database.dump', 'uploads.tar.gz']:
            data = b'fictional test bytes'
            (directory / name).write_bytes(data)
            lines.append(hashlib.sha256(data).hexdigest() + '  ' + name)
        (directory / 'SHA256SUMS').write_text('\n'.join(lines))
        return directory

    def test_valid_r2_configuration(self):
        self.assertEqual(backup.parse_configuration(self.config())['AWS_DEFAULT_REGION'], 'auto')

    def test_placeholders_are_rejected(self):
        with self.assertRaises(backup.BackupError):
            backup.parse_configuration(self.config().replace('x' * 32, 'REPLACE_WITH_KEY'))

    def test_credentials_in_repository_url_are_rejected(self):
        with self.assertRaises(backup.BackupError):
            backup.parse_configuration(self.config().replace('https://', 'https://fictional@'))

    def test_plain_http_is_rejected(self):
        with self.assertRaises(backup.BackupError):
            backup.parse_configuration(self.config().replace('https://', 'http://'))

    def test_unknown_or_duplicate_variables_are_rejected(self):
        for extra in ['\nRESTIC_PASSWORD_COMMAND=fictional', '\nAWS_DEFAULT_REGION=auto']:
            with self.subTest(extra=extra), self.assertRaises(backup.BackupError):
                backup.parse_configuration(self.config() + extra)

    def test_repository_path_traversal_is_rejected(self):
        with self.assertRaises(backup.BackupError):
            backup.parse_configuration(self.config().replace('/portal-egv', '/../outside'))

    def test_complete_snapshot_matches_checksums(self):
        with tempfile.TemporaryDirectory() as temporary:
            backup.verify_snapshot(self.snapshot(Path(temporary)))

    def test_corrupted_snapshot_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = self.snapshot(Path(temporary))
            (directory / 'database.dump').write_bytes(b'changed test bytes')
            with self.assertRaises(backup.BackupError):
                backup.verify_snapshot(directory)

    def test_manifest_cannot_escape_snapshot(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = self.snapshot(Path(temporary))
            (directory / 'SHA256SUMS').write_text('0' * 64 + '  ../outside')
            with self.assertRaises(backup.BackupError):
                backup.verify_snapshot(directory)

    def test_stale_snapshot_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            self.snapshot(Path(temporary))
            with self.assertRaises(backup.BackupError):
                backup.latest_snapshot(Path(temporary), dt.datetime(2026, 11, 7, tzinfo=dt.timezone.utc))

    def test_only_latest_completed_snapshot_is_used(self):
        with tempfile.TemporaryDirectory() as temporary:
            expected = self.snapshot(Path(temporary))
            (Path(temporary) / '.partial-20261105T215900Z').mkdir()
            self.assertEqual(backup.latest_snapshot(Path(temporary), dt.datetime(2026, 11, 5, 22, tzinfo=dt.timezone.utc)), expected)

    def test_private_file_rejects_insecure_mode_and_symlinks(self):
        with tempfile.TemporaryDirectory() as temporary:
            filename = Path(temporary) / 'private'
            filename.write_text('fictional')
            filename.chmod(0o644)
            with self.assertRaises(backup.BackupError):
                backup.private_file(filename)
            link = Path(temporary) / 'link'
            link.symlink_to(filename)
            with self.assertRaises(backup.BackupError):
                backup.private_file(link)

    def test_readiness_failure_never_runs_docker(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(backup, 'ROOT', Path(temporary)), patch.object(backup.subprocess, 'run') as run:
            with self.assertRaises(backup.BackupError):
                backup.restic(['backup', '/source'])
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
