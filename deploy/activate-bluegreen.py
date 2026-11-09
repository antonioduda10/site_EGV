#!/usr/bin/env python3
"""Explicit blue/green activation, application-only rollback and controlled retirement."""

import argparse
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import threading
import time

from bluegreen_policy import AUTH_KEYS, DOMAIN, GATE, candidate_name
from bluegreen_runtime import validate_active, verify_source
from prepare_bluegreen_checks import inspect, public_checks, request_status, wait_for


ROOT = pathlib.Path("/opt/portal-egv")
ACTIVE_MARKER = ROOT / "shared/active-bluegreen.json"


def atomic_bytes(path, data, mode=0o600):
    path = pathlib.Path(path)
    if path.is_symlink():
        raise ValueError("Refusing to replace a linked operational file")
    fd, temporary = tempfile.mkstemp(prefix=".bluegreen-", dir=path.parent)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def save_json(path, value):
    atomic_bytes(path, json.dumps(value, indent=2).encode())


def set_current(release):
    target = ROOT / "releases" / release
    if target.parent != ROOT / "releases" or not target.is_dir() or target.is_symlink() or not (ROOT / "current").is_symlink():
        raise ValueError("Unsafe active release pointer")
    temporary = ROOT / (".current-" + release)
    if temporary.exists() or temporary.is_symlink():
        raise ValueError("Unexpected pending release pointer")
    os.symlink(target, temporary)
    os.replace(temporary, ROOT / "current")


def set_image(image):
    path = ROOT / "shared/.env"
    lines = path.read_bytes().splitlines(keepends=True)
    positions = [index for index, line in enumerate(lines) if line.startswith(b"PORTAL_IMAGE=")]
    if len(positions) != 1:
        raise ValueError("Expected one application image setting")
    index = positions[0]
    ending = b"\r\n" if lines[index].endswith(b"\r\n") else b"\n" if lines[index].endswith(b"\n") else b""
    previous = lines[index].split(b"=", 1)[1].strip().decode()
    lines[index] = b"PORTAL_IMAGE=" + image.encode() + ending
    atomic_bytes(path, b"".join(lines))
    return previous


def check_backup(directory):
    path = pathlib.Path(directory)
    if path.parent != pathlib.Path("/var/backups/portal-egv/data") or path.is_symlink():
        raise ValueError("Backup outside the approved directory")
    proof = json.loads((path / "online-check.json").read_text())
    age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(proof["createdUTC"])
    if proof.get("mode") != "online-verified" or proof.get("applicationPaused") is not False or not proof.get("contentAndFilesStable") or not proof.get("referencedFilesPresent") or not proof.get("databaseSnapshotShared") or not 0 <= age.total_seconds() <= 600:
        raise ValueError("A fresh verified online backup is required")
    entries = (path / "SHA256SUMS").read_text().splitlines()
    if len(entries) != 2:
        raise ValueError("Unexpected backup checksum manifest")
    for entry in entries:
        expected, filename = entry.split("  ", 1)
        if filename not in ("database.dump", "uploads.tar.gz"):
            raise ValueError("Unexpected backup member")
        digest = hashlib.sha256()
        with (path / filename).open("rb") as stream:
            for chunk in iter(lambda: stream.read(1048576), b""):
                digest.update(chunk)
        if digest.hexdigest() != expected:
            raise ValueError("Backup checksum mismatch")
    return proof


def verify_candidate(release, commit):
    folder = ROOT / "releases" / release
    verify_source(folder, commit)
    workspace = ROOT / "shared/bluegreen" / release
    state = json.loads((workspace / "state.json").read_text())
    name = candidate_name(release)
    if state.get("sourceCommit") != commit or state.get("candidate") != name or inspect(name, ".Id") != state.get("candidateID") or inspect(name, ".Image") != state.get("candidateImageID"):
        raise ValueError("Candidate identity does not match the approved commit")
    if inspect(name, ".Config.Labels").get("org.opencontainers.image.revision") != commit:
        raise ValueError("Candidate image revision does not match the approved commit")
    compose = workspace / "compose.json"
    if hashlib.sha256(compose.read_bytes()).hexdigest() != state.get("composeSHA256"):
        raise ValueError("Candidate routing configuration changed")
    for name, identity in state["previousContainerIDs"].items():
        if inspect(name, ".Id") != identity:
            raise ValueError("Existing infrastructure identity changed")
    def environment(container):
        values = dict(item.split("=", 1) for item in inspect(container, ".Config.Env") if "=" in item)
        return {key: values.get(key) for key in AUTH_KEYS}
    if environment(state["candidate"]) != environment("portal-egv-app-1") or any(not value for value in environment(state["candidate"]).values()):
        raise ValueError("Application authentication/database settings changed")
    return folder, workspace, state


def install_operations(folder, release, commit, workspace):
    saved = workspace / "operations-before"
    saved.mkdir(mode=0o700, exist_ok=False)
    pairs = [(folder / "deploy/bin/compose.sh", ROOT / "bin/compose.sh"),
             (folder / "deploy/bin/backup.sh", ROOT / "bin/backup.sh"),
             (folder / "deploy/bin/deploy.sh", ROOT / "deploy.sh")]
    for source, target in pairs:
        if target.is_symlink():
            raise ValueError("Unexpected linked installed script")
        shutil.copyfile(target, saved / target.name)
        (saved / target.name).chmod(0o600)
    for name in ("bluegreen_operations.py", "bluegreen_runtime.py", "bluegreen_policy.py", "activate-bluegreen.py", "prepare_bluegreen_checks.py"):
        atomic_bytes(ROOT / "bin" / name, (folder / "deploy" / name).read_bytes(), 0o700)
    for source, target in pairs:
        atomic_bytes(target, source.read_bytes().replace(b"\r\n", b"\n"), 0o700)
    save_json(ROOT / "shared/online-backup-release.json", {"release": release, "commit": commit})
    print(json.dumps({"operationsInstalled": True, "onlineBackupEnabled": True, "publicTrafficChanged": False}), flush=True)


def rollback(workspace, state):
    if ACTIVE_MARKER.is_file() and validate_active(json.loads(ACTIVE_MARKER.read_text()))["release"] != state["release"]:
        raise ValueError("Another active release must not be overwritten")
    previous = "portal-egv-app-1"
    if not inspect(previous, ".State.Running"):
        subprocess.run(["docker", "start", state["previousContainerIDs"][previous]], check=True, stdout=subprocess.DEVNULL, timeout=30)
    wait_for(lambda: inspect(previous, ".State.Health.Status") == "healthy", 90)
    gate = workspace / "route-control/approved"
    if gate.exists():
        gate.unlink()
    wait_for(lambda: request_status("https://" + DOMAIN + "/api/avisos") == 404, 60)
    public_checks(include_new_module=False)
    if state.get("previousImageSetting"):
        set_current(pathlib.Path(state["previousRelease"]).name)
        set_image(state["previousImageSetting"])
    if ACTIVE_MARKER.is_file():
        ACTIVE_MARKER.unlink()
    state.update({"phase": "rolled-back", "gate": "closed"})
    save_json(workspace / "state.json", state)


def activate(folder, workspace, state, commit, backup):
    check_backup(backup)
    gate = workspace / "route-control/approved"
    if gate.exists() or ACTIVE_MARKER.exists() or state["phase"] != "prepared-not-serving":
        raise ValueError("Expected a closed candidate and no other active marker")
    if not (ROOT / "shared/online-backup-release.json").is_file():
        raise ValueError("Online operational backup must be installed before activation")
    for name in state["previousContainerIDs"]:
        if not inspect(name, ".State.Running"):
            raise ValueError("Previous infrastructure must stay running during activation")
    if inspect("portal-egv-app-1", ".State.Health.Status") != "healthy":
        raise ValueError("Previous application is not healthy")
    for route in ("/api/health", "/", "/sitemap.xml", "/robots.txt"):
        if request_status("http://127.0.0.1:3002" + route, DOMAIN) != 200:
            raise ValueError("Candidate private preflight failed")
    previous_image = next(line.split("=", 1)[1] for line in (ROOT / "shared/.env").read_text().splitlines() if line.startswith("PORTAL_IMAGE="))
    state["previousImageSetting"] = previous_image
    save_json(workspace / "state.json", state)
    stopped = threading.Event()
    samples = []

    def monitor():
        while not stopped.is_set():
            try:
                samples.append(request_status("https://" + DOMAIN + "/api/health"))
            except Exception:
                samples.append("error")
            stopped.wait(0.5)

    thread = threading.Thread(target=monitor, daemon=True)
    thread.start()
    try:
        atomic_bytes(gate, b"operator-approved\n", 0o444)
        wait_for(lambda: inspect(state["candidate"], ".State.Health.Status") == "healthy", 90)
        wait_for(lambda: request_status("https://" + DOMAIN + "/api/avisos") == 403, 60)
        checks = public_checks()
        if any(status != 200 for status in samples):
            raise ValueError("A public availability check failed during the switch")
        marker = {"release": state["release"], "commit": commit, "candidate": state["candidate"],
                  "candidateID": state["candidateID"], "imageID": state["candidateImageID"],
                  "composePath": str(workspace / "compose.json"), "previousRelease": state["previousRelease"]}
        validate_active(marker)
        set_image("portal-egv:" + state["release"])
        set_current(state["release"])
        save_json(ACTIVE_MARKER, marker)
        state.update({"phase": "active-pending-final-validation", "gate": "open", "sourceCommit": commit, "preDeployBackup": backup})
        save_json(workspace / "state.json", state)
        print(json.dumps({"activated": True, "commit": commit, "candidate": state["candidate"], "publicChecks": checks, "previousStillRunning": True}), flush=True)
    except Exception:
        rollback(workspace, state)
        raise
    finally:
        stopped.set()
        thread.join(timeout=15)
        save_json(workspace / "activation-monitor.json", {"requests": len(samples), "failures": sum(status != 200 for status in samples), "statuses": samples})


def retire(workspace, state, commit):
    if not ACTIVE_MARKER.is_file() or validate_active(json.loads(ACTIVE_MARKER.read_text()))["release"] != state["release"]:
        raise ValueError("Only the active release may retire its predecessor")
    proof = json.loads((workspace / "production-validation.json").read_text())
    required = ("authenticatedAccess", "logout", "permissions", "publicChecks", "dataPreserved", "uploadsPreserved")
    if proof.get("commit") != commit or not all(proof.get(key) is True for key in required):
        raise ValueError("Complete production validation is required before retiring the previous application")
    if inspect(state["candidate"], ".State.Health.Status") != "healthy" or not (workspace / "route-control/approved").is_file():
        raise ValueError("New application is not ready")
    public_checks()
    identity = state["previousContainerIDs"]["portal-egv-app-1"]
    subprocess.run(["docker", "stop", "--time", "30", identity], check=True, stdout=subprocess.DEVNULL, timeout=45)
    try:
        public_checks()
        if request_status("https://" + DOMAIN + "/api/avisos") != 403:
            raise ValueError("New module is not publicly routed after retirement")
    except Exception:
        rollback(workspace, state)
        raise
    state["phase"] = "active-previous-retired"
    save_json(workspace / "state.json", state)
    print(json.dumps({"previousStoppedNotDeleted": True, "volumesPreserved": True, "active": state["candidate"]}))


def main():
    import fcntl
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install-operations", "activate", "rollback", "retire-previous"))
    parser.add_argument("release")
    parser.add_argument("--commit", required=True)
    parser.add_argument("--backup")
    parser.add_argument("--confirm", action="store_true", required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise ValueError("Root is required on the Portal VPS")
    os.umask(0o077)
    with open("/var/lock/portal-egv-deploy.lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        folder, workspace, state = verify_candidate(args.release, args.commit)
        if args.action == "install-operations":
            install_operations(folder, args.release, args.commit, workspace)
        elif args.action == "activate":
            if not args.backup:
                raise ValueError("Fresh pre-deployment backup is required")
            activate(folder, workspace, state, args.commit, args.backup)
        elif args.action == "rollback":
            rollback(workspace, state)
        else:
            retire(workspace, state, args.commit)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        detail = str(error) if type(error) in (ValueError, RuntimeError) else type(error).__name__
        print("Blue/green operation failed: " + detail + ". No database restore, import, seed or migration was performed.", file=sys.stderr)
        raise SystemExit(1)
