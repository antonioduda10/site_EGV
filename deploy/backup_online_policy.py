"""Consistency checks for a non-pausing PostgreSQL and uploads backup."""

import hashlib
from html.parser import HTMLParser
import json
import pathlib
import re
import tarfile
from urllib.parse import unquote, urlsplit


FILE_COLUMNS = {
    "Noticia": ("id", "imagemCapa", "conteudo"),
    "Evento": ("id", "conteudo"),
    "PaginaInstitucional": ("id", "conteudo"),
    "Banner": ("id", "imagem"),
    "ArquivoDocumento": ("id", "caminho"),
    "Midia": ("id", "caminho"),
    "VideoGaleria": ("id", "url"),
    "SecretariaServidor": ("id", "fotoUrl"),
    "ConfiguracaoSite": ("id", "logoUrl", "politicaPrivacidade", "cookies", "termos", "menuJson",
                         "acessoRapidoJson", "rodapeJson", "textosPublicosJson", "avisosHomeJson"),
}
DIRECT_FIELDS = {"imagemCapa", "imagem", "caminho", "url", "fotoUrl", "logoUrl", "imagemUrl"}


def references_query():
    items = []
    for table, columns in FILE_COLUMNS.items():
        selected = ",".join('"' + column + '"' for column in columns)
        items.append("'" + table + "', COALESCE((SELECT jsonb_agg(r ORDER BY r.id) FROM (SELECT "
                     + selected + ' FROM "' + table + '") r),\'[]\'::jsonb)')
    return "SELECT jsonb_build_object(" + ",".join(items) + ");"


def upload_reference(value, direct=False):
    parsed = urlsplit(value.replace("\\", "/"))
    path = parsed.path
    local = False
    for prefix in ("/api/uploads/", "/uploads/", "uploads/", "/app/uploads/"):
        if path.startswith(prefix):
            path = path[len(prefix):]
            local = True
            break
    if not local:
        if not direct or parsed.scheme or parsed.netloc or path.startswith("/"):
            return None
        local = bool(path)
    if not local:
        return None
    for _ in range(3):
        path = unquote(path)
    relative = pathlib.PurePosixPath(path)
    if not path or "%" in path or relative.is_absolute() or ".." in relative.parts or "\\" in path or re.search(r'[<>:"|?*\x00-\x1f]', path):
        raise ValueError("Unsafe upload reference; backup must not be accepted")
    return relative.as_posix()


def collect_upload_references(rows):
    found = set()

    class ImagesAndLinks(HTMLParser):
        def handle_starttag(self, tag, attrs):
            for key, value in attrs:
                if key in ("src", "href") and value:
                    reference = upload_reference(value)
                    if reference:
                        found.add(reference)

    def visit(value, key=None):
        if isinstance(value, dict):
            for field, child in value.items():
                visit(child, field)
        elif isinstance(value, list):
            for child in value:
                visit(child)
        elif isinstance(value, str):
            if key in DIRECT_FIELDS:
                reference = upload_reference(value, direct=True)
                if reference:
                    found.add(reference)
            if value.lstrip().startswith(("{", "[")):
                try:
                    visit(json.loads(value))
                except json.JSONDecodeError:
                    pass
            elif "<" in value:
                ImagesAndLinks().feed(value)
            elif value.startswith(("/api/uploads/", "/uploads/", "uploads/")):
                found.add(upload_reference(value))

    visit(rows)
    return found


def stream_hash(stream):
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        digest.update(chunk)
    return digest.hexdigest()


def uploads_manifest(directory):
    root = pathlib.Path(directory)
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Expected an uploads directory without symbolic links")
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or (not path.is_file() and not path.is_dir()):
            raise ValueError("Unsafe upload file type")
        if path.is_file():
            with path.open("rb") as stream:
                result[path.relative_to(root).as_posix()] = stream_hash(stream)
    return result


def archive_manifest(archive):
    result = {}
    with tarfile.open(archive, "r:gz") as package:
        for member in package:
            if not member.isfile() or pathlib.PurePosixPath(member.name).is_absolute() or ".." in pathlib.PurePosixPath(member.name).parts or member.name in result:
                raise ValueError("Unsafe archive member")
            with package.extractfile(member) as stream:
                result[member.name] = stream_hash(stream)
    return result


def verify_consistency(before_rows, after_rows, before_files, after_files, archived_files):
    if before_rows != after_rows or before_files != after_files or before_files != archived_files:
        raise ValueError("Concurrent file/content change detected; keep serving the old version and retry the backup")
    missing = collect_upload_references(before_rows) - archived_files.keys()
    if missing:
        raise ValueError("A referenced upload is missing; backup must not be accepted")
    return {"fileCount": len(archived_files), "referencedFilesPresent": True, "contentAndFilesStable": True}
