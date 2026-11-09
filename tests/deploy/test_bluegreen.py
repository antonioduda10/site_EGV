import pathlib
import sys
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "deploy"))
from bluegreen_policy import GATE, candidate_compose, candidate_labels, candidate_name, file_manifest, merge_static


RELEASE = "20261109170000-012345abcdef"
LABELS = {
    "traefik.enable": "true", "traefik.docker.network": "portal-egv_edge",
    "traefik.http.services.portal-egv.loadbalancer.server.port": "3000",
    "traefik.http.routers.portal-egv-https.rule": "Host(`escolagetuliovargas.com.br`)",
    "traefik.http.routers.portal-egv-https.service": "portal-egv",
    "traefik.http.routers.portal-egv-https.entrypoints": "websecure",
    "traefik.http.routers.portal-egv-https.tls": "true",
    "traefik.http.routers.portal-egv-https.tls.certresolver": "letsencrypt",
    "traefik.http.routers.portal-egv-upgrade.rule": "Host(`escolagetuliovargas.com.br`) && HeaderRegexp(`Upgrade`, `(?i)websocket`)",
    "traefik.http.routers.portal-egv-upgrade.priority": "400",
    "traefik.http.routers.portal-egv-upgrade.middlewares": "portal-egv-local",
    "traefik.http.routers.portal-egv-upgrade.service": "portal-egv",
    "traefik.http.middlewares.portal-egv-local.ipallowlist.sourcerange": "127.0.0.1/32,::1/128",
    "traefik.http.middlewares.portal-egv-canonical.redirectregex.replacement": "https://escolagetuliovargas.com.br${1}",
}


class BlueGreenPolicyTests(unittest.TestCase):
    def config(self):
        return candidate_compose(LABELS, RELEASE, f"/opt/portal-egv/shared/bluegreen/{RELEASE}/static")

    def test_invalid_releases_are_rejected(self):
        for release in ("../current", "/tmp/x", "latest", RELEASE + "/x", RELEASE + "\n"):
            with self.subTest(release=release), self.assertRaises(ValueError):
                candidate_name(release)

    def test_new_container_and_compose_project_do_not_replace_the_active_app(self):
        config = self.config()
        self.assertEqual(list(config["services"]), ["candidate"])
        self.assertNotEqual(config["name"], "portal-egv")
        self.assertEqual(config["services"]["candidate"]["container_name"], "portal-egv-candidate-" + RELEASE)

    def test_only_loopback_is_published_and_no_database_is_created(self):
        config = self.config()
        self.assertEqual(config["services"]["candidate"]["ports"], ["127.0.0.1:3002:3000"])
        self.assertNotIn("db", config["services"])
        self.assertNotIn("migrate", config["services"])
        self.assertTrue(all(value["external"] for value in config["networks"].values()))
        self.assertTrue(all(value["external"] for value in config["volumes"].values()))

    def test_only_existing_persistent_volumes_are_reused(self):
        config = self.config()
        self.assertEqual(set(config["volumes"]), {"uploads", "app_logs"})
        self.assertIn("uploads:/app/uploads", config["services"]["candidate"]["volumes"])
        self.assertTrue(any(value.endswith(":/app/.next-build/static:ro") for value in config["services"]["candidate"]["volumes"]))
        self.assertTrue(any(value.endswith(":/run/portal-egv-route:ro") for value in config["services"]["candidate"]["volumes"]))

    def test_authentication_values_remain_references_to_private_server_environment(self):
        env = self.config()["services"]["candidate"]["environment"]
        for key in ("DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"):
            self.assertEqual(env[key], "${" + key + ":?required}")
        self.assertNotIn("AUTH_URL", env)

    def test_candidate_cannot_become_healthy_without_explicit_gate(self):
        health = self.config()["services"]["candidate"]["healthcheck"]
        self.assertIn(GATE, health["test"][-1])
        self.assertLess(health["test"][-1].index("existsSync"), health["test"][-1].index("fetch("))
        self.assertEqual(health["retries"], 1)
        self.assertEqual(health["start_period"], "24h")
        self.assertFalse(GATE.startswith("/tmp/"))

    def test_route_names_and_references_are_unique(self):
        labels = candidate_labels(LABELS, RELEASE)
        self.assertTrue(all(key not in LABELS for key in labels if key.startswith("traefik.http.")))
        self.assertEqual(labels[f"traefik.http.routers.portal-egv-https-bg-{RELEASE}.service"], "portal-egv-bg-" + RELEASE)
        self.assertEqual(labels[f"traefik.http.routers.portal-egv-upgrade-bg-{RELEASE}.middlewares"], "portal-egv-local-bg-" + RELEASE)

    def test_security_route_still_has_priority_over_the_main_router(self):
        labels = candidate_labels(LABELS, RELEASE)
        main = int(labels[f"traefik.http.routers.portal-egv-https-bg-{RELEASE}.priority"])
        block = int(labels[f"traefik.http.routers.portal-egv-upgrade-bg-{RELEASE}.priority"])
        self.assertGreater(block, main)
        self.assertGreater(main, 10000)

    def test_rules_tls_and_allowlist_are_preserved(self):
        labels = candidate_labels(LABELS, RELEASE)
        for ending in ("rule", "tls", "tls.certresolver", "entrypoints"):
            self.assertEqual(labels[f"traefik.http.routers.portal-egv-https-bg-{RELEASE}.{ending}"], LABELS[f"traefik.http.routers.portal-egv-https.{ending}"])
        self.assertEqual(labels[f"traefik.http.middlewares.portal-egv-local-bg-{RELEASE}.ipallowlist.sourcerange"], "127.0.0.1/32,::1/128")

    def test_compose_does_not_expand_the_redirect_capture_group(self):
        labels = candidate_labels(LABELS, RELEASE)
        self.assertEqual(labels[f"traefik.http.middlewares.portal-egv-canonical-bg-{RELEASE}.redirectregex.replacement"], "https://escolagetuliovargas.com.br$${1}")

    def test_unknown_domain_topology_external_references_and_priorities_fail_closed(self):
        for extra in (
            {"traefik.enable": "false"},
            {"traefik.http.routers.portal-egv-https.rule": "Host(`other.invalid`)"},
            {"traefik.http.services.other.loadbalancer.server.port": "80"},
            {"traefik.http.routers.portal-egv-https.service": "other@docker"},
            {"traefik.http.routers.portal-egv-upgrade.priority": "12000"},
            {"traefik.tcp.routers.unexpected.rule": "HostSNI(`*`)"},
        ):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                candidate_labels({**LABELS, **extra}, RELEASE)

    def test_static_mount_cannot_escape_the_workspace(self):
        for path in ("/tmp/assets", f"/opt/portal-egv/shared/bluegreen/{RELEASE}/../static", "/app/uploads"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                candidate_compose(LABELS, RELEASE, path)

    def test_static_assets_of_both_versions_are_retained_without_replacing_the_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            old, new = root / "old", root / "new"
            old.mkdir()
            new.mkdir()
            (old / "old.js").write_bytes(b"old")
            (new / "new.js").write_bytes(b"new")
            (old / "shared.js").write_bytes(b"same")
            (new / "shared.js").write_bytes(b"same")
            before = file_manifest(old), file_manifest(new)
            self.assertEqual(merge_static(old, new, root / "merged"), {"previousFiles": 2, "candidateFiles": 2, "mergedFiles": 3})
            self.assertEqual((file_manifest(old), file_manifest(new)), before)

    def test_different_assets_with_the_same_path_block_preparation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            old, new = root / "old", root / "new"
            old.mkdir()
            new.mkdir()
            (old / "collision.js").write_bytes(b"old")
            (new / "collision.js").write_bytes(b"new")
            with self.assertRaises(ValueError):
                merge_static(old, new, root / "merged")
            self.assertFalse((root / "merged").exists())

    def test_preparation_has_no_activation_migrations_seed_or_active_recreation(self):
        source = (ROOT / "deploy/prepare-bluegreen.py").read_text()
        for forbidden in ("migrate deploy", "db seed", "migrate reset", "db push", "docker pause", "docker stop", "ln -sfn", "os.symlink", '"app"]'):
            self.assertNotIn(forbidden, source)
        self.assertIn('["up", "-d", "--no-deps", "candidate"]', source)
        self.assertNotIn("writeFileSync", source)


if __name__ == "__main__":
    unittest.main()
