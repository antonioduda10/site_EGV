#!/usr/bin/env python3
"""Online backup with a shared PostgreSQL snapshot and verified stable uploads."""

import argparse
import datetime
import fcntl
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tarfile

from backup_online_policy import archive_manifest, references_query, stream_hash, uploads_manifest, verify_consistency


ROOT = pathlib.Path("/opt/portal-egv")
BASE = pathlib.Path("/var/backups/portal-egv/data")
DB = "portal-egv-db-1"
PSQL = ["docker", "exec", "-i", "-u", "postgres", DB, "sh", "-c",
        'exec psql --no-psqlrc --quiet --tuples-only --no-align --set=ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"']


def command(args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, timeout=30, **kwargs)
    if result.returncode:
        raise RuntimeError("Online backup check failed; no application was paused")
    return result.stdout.strip()


def query(sql):
    return json.loads(command(PSQL, input="BEGIN READ ONLY; SET LOCAL statement_timeout='20s';" + sql + "COMMIT;"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-online-backup", action="store_true", required=True)
    parser.parse_args()
    if os.geteuid() != 0:
        raise ValueError("This operation requires root on the Portal VPS")
    os.umask(0o077)
    with open("/var/lock/portal-egv-deploy.lock", "a") as deploy_lock, open("/var/lock/portal-egv-backup.lock", "a") as backup_lock:
        fcntl.flock(deploy_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fcntl.flock(backup_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        mount = json.loads(command(["docker", "volume", "inspect", "--format", "{{json .Mountpoint}}", "portal-egv_uploads"]))
        uploads = pathlib.Path(mount)
        if uploads != pathlib.Path("/var/lib/docker/volumes/portal-egv_uploads/_data") or uploads.is_symlink():
            raise ValueError("Unexpected uploads volume; no automatic fallback")
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        temporary, final = BASE / (".partial-online-" + stamp), BASE / stamp
        if final.exists() or not BASE.is_dir() or BASE.is_symlink():
            raise ValueError("Unsafe backup destination")
        temporary.mkdir(mode=0o700, exist_ok=False)
        before_files = uploads_manifest(uploads)
        session = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
        try:
            def snapshot_query(sql):
                session.stdin.write(sql + "\n")
                session.stdin.flush()
                response = session.stdout.readline().strip()
                if not response:
                    raise RuntimeError("Snapshot connection closed unexpectedly")
                return response

            snapshot = snapshot_query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='20s'; SET LOCAL idle_in_transaction_session_timeout='5min'; SELECT pg_export_snapshot();")
            if not re.fullmatch(r"[A-Fa-f0-9]{8}-[A-Fa-f0-9]{8}-[0-9]+", snapshot):
                raise ValueError("Unexpected PostgreSQL snapshot identifier")
            before_rows = json.loads(snapshot_query(references_query()))
            with (temporary / "database.dump").open("wb") as output:
                dump = subprocess.run(["docker", "exec", "-u", "postgres", DB, "sh", "-c",
                                       'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl --snapshot="$1"', "sh", snapshot],
                                      stdout=output, stderr=subprocess.DEVNULL, timeout=180)
            if dump.returncode:
                raise RuntimeError("Snapshot dump failed; partial backup is not accepted")
            with tarfile.open(temporary / "uploads.tar.gz", "w:gz") as package:
                for relative in before_files:
                    package.add(uploads / relative, arcname=relative, recursive=False)
            archived = archive_manifest(temporary / "uploads.tar.gz")
            after_rows = query(references_query())
            after_files = uploads_manifest(uploads)
            proof = verify_consistency(before_rows, after_rows, before_files, after_files, archived)
            session.stdin.write("COMMIT;\n\\q\n")
            session.stdin.flush()
            session.communicate(timeout=10)
            if session.returncode:
                raise RuntimeError("Snapshot session did not finish successfully")
        finally:
            if session.poll() is None:
                session.kill()
                session.wait(timeout=10)
        with (temporary / "database.dump").open("rb") as source:
            checked = subprocess.run(["docker", "exec", "-i", DB, "pg_restore", "--list"], stdin=source, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
        if checked.returncode:
            raise RuntimeError("Dump validation failed; partial backup is not accepted")
        lines = []
        for name in ("database.dump", "uploads.tar.gz"):
            with (temporary / name).open("rb") as stream:
                lines.append(stream_hash(stream) + "  " + name)
        (temporary / "SHA256SUMS").write_text("\n".join(lines) + "\n")
        shutil.copyfile(ROOT / "shared/.env", temporary / "environment.env")
        (temporary / "environment.env").chmod(0o600)
        (temporary / "release.txt").write_text(str((ROOT / "current").resolve()) + "\n")
        proof.update({"mode": "online-verified", "applicationPaused": False, "databaseSnapshotShared": True,
                      "createdUTC": datetime.datetime.now(datetime.timezone.utc).isoformat()})
        (temporary / "online-check.json").write_text(json.dumps(proof, indent=2))
        temporary.rename(final)
        print(json.dumps({"status": "completed", "directory": str(final), "applicationPaused": False, **proof,
                          "files": [{"name": name, "bytes": (final / name).stat().st_size} for name in ("database.dump", "uploads.tar.gz")]}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        detail = str(error) if type(error) in (RuntimeError, ValueError) else type(error).__name__
        print("Online backup was not accepted: " + detail + ". No application or data was replaced or paused. Partial files remain private.", file=sys.stderr)
        sys.exit(1)
