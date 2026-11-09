import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "deploy"))
spec = importlib.util.spec_from_file_location("bluegreen_activation", ROOT / "deploy/activate-bluegreen.py")
activation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(activation)

RELEASE = "20261109170000-012345abcdef"
OLD = "20261106114115-c7bbb5f19756"
COMMIT = "1" * 40


def marker(release=RELEASE):
    return {"release": release, "commit": COMMIT, "candidate": "portal-egv-candidate-" + release,
            "candidateID": "2" * 64, "imageID": "sha256:" + "3" * 64,
            "composePath": f"/opt/portal-egv/shared/bluegreen/{release}/compose.json",
            "previousRelease": "/opt/portal-egv/releases/" + OLD}


def state():
    return {"release": RELEASE, "candidate": marker()["candidate"], "previousRelease": marker()["previousRelease"],
            "previousImageSetting": "portal-egv:" + OLD, "previousContainerIDs": {"portal-egv-app-1": "4" * 64}}


class BlueGreenActivationTests(unittest.TestCase):
    def test_image_marker_update_preserves_every_other_environment_byte(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / "shared").mkdir()
            original = b"NEXTAUTH_SECRET=fixture-only\r\nPORTAL_IMAGE=old\r\nDATABASE_URL=fixture-only\r\nNEXTAUTH_URL=https://example.invalid\r\n"
            (root / "shared/.env").write_bytes(original)
            with patch.object(activation, "ROOT", root), patch.object(activation, "atomic_bytes") as write:
                self.assertEqual(activation.set_image("new"), "old")
            self.assertEqual(write.call_args.args[1], original.replace(b"PORTAL_IMAGE=old\r\n", b"PORTAL_IMAGE=new\r\n"))

    def test_rollback_repairs_partial_pointer_changes_even_if_the_active_marker_was_not_written(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / "route-control").mkdir()
            (root / "route-control/approved").write_text("approved")
            with patch.object(activation, "ACTIVE_MARKER", root / "absent.json"), patch.object(activation, "inspect", return_value=True), patch.object(activation, "wait_for"), patch.object(activation, "public_checks"), patch.object(activation, "set_current") as current, patch.object(activation, "set_image") as image, patch.object(activation, "save_json"):
                activation.rollback(root, state())
            self.assertFalse((root / "route-control/approved").exists())
            current.assert_called_once_with(OLD)
            image.assert_called_once_with("portal-egv:" + OLD)

    def test_rollback_does_not_overwrite_a_different_active_deployment(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            file = root / "active.json"
            file.write_text(json.dumps(marker("20261109180000-abcdef012345")))
            with patch.object(activation, "ACTIVE_MARKER", file), patch.object(activation, "inspect") as inspected, self.assertRaises(ValueError):
                activation.rollback(root, state())
            inspected.assert_not_called()

    def test_incomplete_or_missing_authenticated_validation_prevents_retirement(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            file = root / "active.json"
            file.write_text(json.dumps(marker()))
            (root / "production-validation.json").write_text(json.dumps({"commit": COMMIT, "authenticatedAccess": False}))
            with patch.object(activation, "ACTIVE_MARKER", file), patch.object(activation.subprocess, "run") as run, self.assertRaises(ValueError):
                activation.retire(root, state(), COMMIT)
            run.assert_not_called()

    def test_retirement_stops_only_the_verified_previous_app_without_deleting_it_or_volumes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            file = root / "active.json"
            file.write_text(json.dumps(marker()))
            (root / "route-control").mkdir()
            (root / "route-control/approved").write_text("approved")
            proof = {key: True for key in ("authenticatedAccess", "logout", "permissions", "publicChecks", "dataPreserved", "uploadsPreserved")}
            (root / "production-validation.json").write_text(json.dumps({"commit": COMMIT, **proof}))
            with patch.object(activation, "ACTIVE_MARKER", file), patch.object(activation, "inspect", return_value="healthy"), patch.object(activation, "public_checks"), patch.object(activation, "request_status", return_value=403), patch.object(activation, "save_json"), patch.object(activation.subprocess, "run") as run:
                activation.retire(root, state(), COMMIT)
            self.assertEqual(run.call_args.args[0], ["docker", "stop", "--time", "30", "4" * 64])
            self.assertEqual(run.call_count, 1)

    def test_activation_has_no_database_migration_restore_seed_or_user_write_command(self):
        source = (ROOT / "deploy/activate-bluegreen.py").read_text()
        for forbidden in ("pg_restore", "prisma ", "migrate deploy", "db seed", "INSERT INTO", "UPDATE ", "DELETE FROM", '"down"', '"rm"'):
            self.assertNotIn(forbidden, source)
        self.assertIn("rollback(workspace, state)", source)
        self.assertIn("check_backup(backup)", source)
        self.assertIn("verify_source(folder, commit)", source)

    def test_commit_and_manifest_verification_happens_before_public_activation(self):
        source = (ROOT / "deploy/activate-bluegreen.py").read_text()
        self.assertLess(source.index("verify_candidate(args.release, args.commit)"), source.index("activate(folder, workspace, state, args.commit"))
        self.assertIn("org.opencontainers.image.revision", source)


if __name__ == "__main__":
    unittest.main()
