import hashlib
import json
import pathlib
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "deploy"))
from bluegreen_runtime import operation_target, validate_active, verify_source


RELEASE = "20261109170000-012345abcdef"
COMMIT = "1" * 40


class BlueGreenOperationsTests(unittest.TestCase):
    def marker(self):
        return {"release": RELEASE, "commit": COMMIT, "candidate": "portal-egv-candidate-" + RELEASE,
                "candidateID": "2" * 64, "imageID": "sha256:" + "3" * 64,
                "composePath": f"/opt/portal-egv/shared/bluegreen/{RELEASE}/compose.json",
                "previousRelease": "/opt/portal-egv/releases/20261106114115-c7bbb5f19756"}

    def test_only_validated_operational_paths_and_immutable_images_are_accepted(self):
        self.assertEqual(validate_active(self.marker())["commit"], COMMIT)
        for extra in ({"release": "../other"}, {"commit": "main"}, {"imageID": "latest"},
                      {"composePath": "/tmp/unreviewed.json"}, {"candidate": "portal-egv-db-1"},
                      {"previousRelease": "/tmp/old"}):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                validate_active({**self.marker(), **extra})

    def test_application_commands_address_the_active_candidate(self):
        self.assertEqual(operation_target(["logs", "--tail", "100", "app"]), ("app", ["logs", "--tail", "100", "candidate"], False))
        self.assertEqual(operation_target(["exec", "-T", "app", "node", "-e", "process.exit(0)"])[1], ["exec", "-T", "candidate", "node", "-e", "process.exit(0)"])
        self.assertEqual(operation_target(["ps", "-q", "app"])[1], ["ps", "-q", "candidate"])

    def test_default_restart_does_not_restart_postgresql_even_before_the_switch(self):
        self.assertEqual(operation_target(["restart"]), ("app", ["restart", "candidate"], True))
        self.assertEqual(operation_target(["restart"], application_service="app")[1], ["restart", "app"])

    def test_up_is_always_no_deps_and_database_recreation_is_refused(self):
        self.assertEqual(operation_target(["up", "-d", "app"])[1], ["up", "--no-deps", "-d", "candidate"])
        for action in ("up", "restart", "start", "stop"):
            with self.subTest(action=action), self.assertRaises(ValueError):
                operation_target([action, "db"])

    def test_database_reads_and_explicit_exec_use_the_legacy_database_service(self):
        self.assertEqual(operation_target(["exec", "-T", "db", "pg_isready"]), ("db", ["exec", "-T", "db", "pg_isready"], False))
        self.assertEqual(operation_target(["logs", "db"])[0], "db")

    def test_sensitive_config_output_destructive_commands_and_ambiguous_services_are_refused(self):
        for args in (["config"], ["down", "-v"], ["run", "migrate"], ["logs", "app", "db"], ["exec", "-T"], ["exec", "app"], ["logs", "--tail"], ["up", "other"]):
            with self.subTest(args=args), self.assertRaises(ValueError):
                operation_target(args)
        self.assertEqual(operation_target(["config", "--quiet"])[1], ["config", "--quiet"])

    def test_source_manifest_is_bound_to_the_exact_commit_and_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / "app").mkdir()
            file = root / "app/page.tsx"
            file.write_bytes(b"committed bytes")
            manifest = {"version": 1, "commit": COMMIT, "files": {"app/page.tsx": hashlib.sha256(file.read_bytes()).hexdigest()}}
            (root / "deploy-source.json").write_text(json.dumps(manifest))
            self.assertEqual(verify_source(root, COMMIT)["commit"], COMMIT)
            with self.assertRaises(ValueError):
                verify_source(root, "2" * 40)
            file.write_bytes(b"changed bytes")
            with self.assertRaises(ValueError):
                verify_source(root, COMMIT)

    def test_unexpected_files_are_not_silently_included_in_a_committed_release(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / "file.ts").write_bytes(b"source")
            (root / "deploy-source.json").write_text(json.dumps({"version": 1, "commit": COMMIT, "files": {"file.ts": hashlib.sha256(b"source").hexdigest()}}))
            (root / "unexpected.txt").write_bytes(b"not committed")
            with self.assertRaises(ValueError):
                verify_source(root, COMMIT)

    def test_legacy_replacement_is_blocked_after_bluegreen_enablement(self):
        source = (ROOT / "deploy/bin/deploy.sh").read_text()
        self.assertLess(source.index("active-bluegreen.json"), source.index("candidate --profile tools"))
        self.assertIn("online-backup-release.json", source)

    def test_scheduled_backup_routes_online_before_any_legacy_pause(self):
        source = (ROOT / "deploy/bin/backup.sh").read_text()
        self.assertLess(source.index("bluegreen_operations.py"), source.index("docker pause"))
        self.assertIn("online-backup-release.json", source)


if __name__ == "__main__":
    unittest.main()
