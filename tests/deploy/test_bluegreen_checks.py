import pathlib
import sys
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "deploy"))
import prepare_bluegreen_checks as checks


class BlueGreenVersionChecksTests(unittest.TestCase):
    def old_version_status(self, url):
        path = urlsplit(url).path
        if path == "/dashboard/avisos":
            return 404
        return 307 if path.startswith("/dashboard") else 200

    def test_rollback_accepts_the_real_route_set_of_the_previous_version(self):
        with patch.object(checks, "request_status", side_effect=self.old_version_status) as request:
            result = checks.public_checks(include_new_module=False)
        self.assertNotIn("/dashboard/avisos", result)
        self.assertEqual(result["/dashboard/config"], 307)
        self.assertFalse(any(urlsplit(call.args[0]).path == "/dashboard/avisos" for call in request.call_args_list))

    def test_the_new_release_still_must_protect_its_new_module(self):
        with patch.object(checks, "request_status", side_effect=self.old_version_status), self.assertRaises(ValueError):
            checks.public_checks()

    def test_common_public_page_failures_still_fail_rollback_validation(self):
        def failing(url):
            return 500 if urlsplit(url).path == "/noticias" else self.old_version_status(url)
        with patch.object(checks, "request_status", side_effect=failing), self.assertRaises(ValueError):
            checks.public_checks(include_new_module=False)


if __name__ == "__main__":
    unittest.main()
