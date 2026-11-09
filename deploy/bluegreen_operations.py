#!/usr/bin/env python3
"""Installed operational wrapper. Never initializes or migrates a database."""

import json
import os
import pathlib
import subprocess
import sys

from bluegreen_policy import AUTH_KEYS, RELEASE
from bluegreen_runtime import operation_target, status_command, validate_active


ROOT = pathlib.Path("/opt/portal-egv")


def private_json(path):
    if path.is_symlink() or path.stat().st_mode & 0o077:
        raise ValueError("Unsafe operational marker")
    return json.loads(path.read_text())


def inspect(name, field):
    result = subprocess.run(["docker", "inspect", "--format", "{{json " + field + "}}", name], capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise ValueError("Application container is unavailable")
    return json.loads(result.stdout)


def main():
    mode, args = sys.argv[1], sys.argv[2:]
    active_path = ROOT / "shared/active-bluegreen.json"
    active = validate_active(private_json(active_path)) if active_path.is_file() else None
    if mode == "backup":
        value = active or private_json(ROOT / "shared/online-backup-release.json")
        release = value.get("release", "")
        if not RELEASE.fullmatch(release):
            raise ValueError("Invalid online backup release")
        os.execv(sys.executable, [sys.executable, str(ROOT / "releases" / release / "deploy/backup-online.py"), "--confirm-online-backup"])
    if mode != "compose":
        raise ValueError("Unknown operational command")
    service, mapped, mutating = operation_target(args)
    lock = None
    if mutating:
        import fcntl
        lock = open("/var/lock/portal-egv-deploy.lock", "a")
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    environment = {key: value for key, value in os.environ.items() if key not in AUTH_KEYS}
    if active and service in ("app", "all"):
        if inspect(active["candidate"], ".Id") != active["candidateID"] or inspect(active["candidate"], ".Image") != active["imageID"]:
            raise ValueError("Active application identity changed")
        if service == "all":
            if args != ["ps"]:
                raise ValueError("Use ps app or ps db for filtered output")
            command = status_command(active["candidateID"], inspect("portal-egv-db-1", ".Id"))
        else:
            environment["PORTAL_CANDIDATE_IMAGE"] = active["imageID"]
            command = ["docker", "compose", "--env-file", str(ROOT / "shared/.env"), "-f", active["composePath"], *mapped]
    else:
        previous = pathlib.Path(active["previousRelease"]) if active else (ROOT / "current").resolve()
        command = ["docker", "compose", "-p", "portal-egv", "--project-directory", str(previous), "--env-file", str(ROOT / "shared/.env"), "-f", str(previous / "compose.production.yml")]
        if (ROOT / "shared/https.enabled").is_file():
            command += ["-f", str(previous / "compose.https.yml")]
        command += operation_target(args, application_service="app")[1]
    # Keep the deployment lock in this parent while a mutating subprocess runs.
    result = subprocess.run(command, env=environment)
    if lock:
        lock.close()
    return result.returncode


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, IndexError):
        print("Operational command refused. Check the active release and use the reviewed blue/green procedure; no database initialization was performed.", file=sys.stderr)
        raise SystemExit(1)
