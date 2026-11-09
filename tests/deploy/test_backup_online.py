import io
import pathlib
import sys
import tarfile
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "deploy"))
from backup_online_policy import archive_manifest, collect_upload_references, references_query, upload_reference, uploads_manifest, verify_consistency


class OnlineBackupTests(unittest.TestCase):
    def test_query_only_reads_file_reference_fields_not_authentication(self):
        query = references_query()
        self.assertTrue(query.startswith("SELECT jsonb_build_object"))
        self.assertIn("jsonb_agg(r ORDER BY r.id)", query)
        for forbidden in ("Usuario", "senhaHash", "INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER "):
            self.assertNotIn(forbidden, query)
        for table in ("Noticia", "ConfiguracaoSite", "ArquivoDocumento", "Midia", "VideoGaleria"):
            self.assertIn('FROM "' + table + '"', query)

    def test_references_cover_rich_html_json_and_direct_files(self):
        rows = {"Noticia": [{"imagemCapa": "/api/uploads/noticias/a.jpg", "conteudo": '<p><img src="/api/uploads/noticias/b.jpg"><a href="/api/uploads/documentos/a.pdf">Arquivo</a></p>'}],
                "ConfiguracaoSite": [{"avisosHomeJson": '{"alerts":[{"imagemUrl":"/api/uploads/config/avisos/c.png"}]}'}],
                "Midia": [{"caminho": "midia/d.webp"}], "VideoGaleria": [{"url": "https://youtube.com/watch?v=test"}]}
        self.assertEqual(collect_upload_references(rows), {"noticias/a.jpg", "noticias/b.jpg", "documentos/a.pdf", "config/avisos/c.png", "midia/d.webp"})

    def test_public_assets_and_external_images_are_not_mistaken_for_uploads(self):
        for value in ("/logo-egv.png", "https://other.invalid/photo.jpg", "mailto:contato@example.invalid"):
            self.assertIsNone(upload_reference(value, direct=True))

    def test_internal_upload_urls_and_legacy_paths_are_supported(self):
        for value in ("https://example.invalid/api/uploads/a.jpg", "uploads/a.jpg", "/api/uploads/a.jpg", "/app/uploads/a.jpg"):
            self.assertEqual(upload_reference(value, direct=True), "a.jpg")

    def test_path_traversal_and_encoded_paths_fail_closed(self):
        for value in ("/api/uploads/../secret", "/api/uploads/%2e%2e/secret", "/api/uploads/%252e%252e/secret", "/api/uploads/%2fetc/passwd", "/api/uploads/a%00.jpg"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                upload_reference(value)

    def test_changed_database_references_reject_the_backup(self):
        with self.assertRaises(ValueError):
            verify_consistency({"x": 1}, {"x": 2}, {}, {}, {})

    def test_changed_files_or_archive_reject_the_backup(self):
        for before, after, archive in (({"a": "1"}, {"a": "2"}, {"a": "1"}), ({"a": "1"}, {"a": "1"}, {"a": "2"})):
            with self.subTest(archive=archive), self.assertRaises(ValueError):
                verify_consistency({}, {}, before, after, archive)

    def test_missing_referenced_upload_rejects_the_backup(self):
        rows = {"Midia": [{"caminho": "/api/uploads/missing.jpg"}]}
        with self.assertRaises(ValueError):
            verify_consistency(rows, rows, {}, {}, {})

    def test_round_trip_archive_bytes_and_empty_uploads(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            uploads = root / "uploads"
            uploads.mkdir()
            (uploads / "a.jpg").write_bytes(b"fictitious file")
            before = uploads_manifest(uploads)
            archive = root / "uploads.tar.gz"
            with tarfile.open(archive, "w:gz") as package:
                package.add(uploads / "a.jpg", arcname="a.jpg")
            proof = verify_consistency({}, {}, before, uploads_manifest(uploads), archive_manifest(archive))
            self.assertEqual(proof["fileCount"], 1)
        self.assertEqual(verify_consistency({}, {}, {}, {}, {})["fileCount"], 0)

    def test_archive_links_special_files_and_traversal_are_refused(self):
        for name, kind in (("../outside", tarfile.REGTYPE), ("/absolute", tarfile.REGTYPE), ("link", tarfile.SYMTYPE)):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                archive = pathlib.Path(temporary) / "unsafe.tar.gz"
                with tarfile.open(archive, "w:gz") as package:
                    info = tarfile.TarInfo(name)
                    info.type = kind
                    info.size = 1 if kind == tarfile.REGTYPE else 0
                    package.addfile(info, io.BytesIO(b"x") if info.size else None)
                with self.assertRaises(ValueError):
                    archive_manifest(archive)

    def test_online_command_has_no_pause_stop_restore_seed_or_database_writes(self):
        source = (pathlib.Path(__file__).resolve().parents[2] / "deploy/backup-online.py").read_text()
        for forbidden in ("docker pause", "docker stop", "migrate deploy", "migrate reset", "db seed", "DROP TABLE", "DELETE FROM", "UPDATE ", "--clean"):
            self.assertNotIn(forbidden, source)
        self.assertIn("pg_export_snapshot", source)
        self.assertIn("--snapshot=", source)
        self.assertIn("--list", source)


if __name__ == "__main__":
    unittest.main()
