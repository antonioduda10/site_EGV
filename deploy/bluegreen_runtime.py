"""Validated release metadata and narrow operational command routing."""

import hashlib
import json
import pathlib
import re

from bluegreen_policy import RELEASE, candidate_name


COMMIT = re.compile(r"[a-f0-9]{40}\Z")


def status_command(application_id, database_id):
    if not all(re.fullmatch(r"[a-f0-9]{64}", value) for value in (application_id, database_id)):
        raise ValueError("Invalid container identity for status")
    return ["docker", "ps", "-a", "--filter", "id=" + application_id,
            "--filter", "id=" + database_id, "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"]


def verify_source(directory, commit):
    root = pathlib.Path(directory)
    if not COMMIT.fullmatch(commit) or root.is_symlink():
        raise ValueError("Invalid committed source")
    metadata = json.loads((root / "deploy-source.json").read_text())
    if metadata.get("version") != 1 or metadata.get("commit") != commit or not metadata.get("files"):
        raise ValueError("Source manifest does not match the approved commit")
    actual = {}
    for file in root.rglob("*"):
        relative = file.relative_to(root)
        if "__pycache__" in relative.parts:
            continue
        if file.is_symlink():
            raise ValueError("Source links are not accepted")
        if file.is_file() and relative.as_posix() != "deploy-source.json":
            actual[relative.as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    if actual != metadata["files"]:
        raise ValueError("Extracted files differ from the committed source manifest")
    return metadata


def validate_active(value, root=pathlib.PurePosixPath("/opt/portal-egv")):
    release, commit = value.get("release", ""), value.get("commit", "")
    if not RELEASE.fullmatch(release) or not COMMIT.fullmatch(commit):
        raise ValueError("Invalid active release marker")
    if value.get("candidate") != candidate_name(release):
        raise ValueError("Unexpected active application")
    if not re.fullmatch(r"[a-f0-9]{64}", value.get("candidateID", "")):
        raise ValueError("Missing active container identity")
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", value.get("imageID", "")):
        raise ValueError("Missing immutable application image")
    if value.get("composePath") != str(root / "shared/bluegreen" / release / "compose.json"):
        raise ValueError("Compose path outside the approved release")
    previous = pathlib.PurePosixPath(value.get("previousRelease", ""))
    if previous.parent != root / "releases" or not RELEASE.fullmatch(previous.name):
        raise ValueError("Unexpected legacy release")
    return value


def operation_target(args, application_service="candidate"):
    if not args or args[0] not in ("ps", "logs", "exec", "restart", "start", "stop", "up", "config"):
        raise ValueError("Use the reviewed blue/green workflow for this command")
    action, tail = args[0], list(args[1:])
    if action == "config":
        if tail != ["--quiet"]:
            raise ValueError("Only config --quiet is allowed; configuration can contain secrets")
        return "app", args, False
    with_value = {"--tail", "--since", "--until", "--index", "--user", "-u", "--workdir", "-w", "--timeout", "-t", "--wait-timeout", "--format", "--status"}
    index = 0
    while index < len(tail) and tail[index].startswith("-"):
        option = tail[index].split("=", 1)[0]
        if option in with_value and "=" not in tail[index]:
            index += 1
            if index >= len(tail):
                raise ValueError("Missing option value")
        index += 1
    if index < len(tail):
        service = tail[index]
        if service not in ("app", "db"):
            raise ValueError("Select app or db explicitly")
        if action != "exec" and index + 1 < len(tail):
            raise ValueError("Only one service is allowed")
    else:
        if action == "exec":
            raise ValueError("exec requires a service and command")
        service = "all" if action == "ps" else "app"
    if action == "exec" and index + 1 == len(tail):
        raise ValueError("exec requires a command")
    mutating = action in ("restart", "start", "stop", "up")
    if service == "db" and mutating:
        raise ValueError("Database maintenance requires a separate explicit procedure")
    mapped = [action, *tail]
    if service == "app" and index < len(tail):
        mapped[index + 1] = application_service
    elif service == "app":
        mapped.append(application_service)
    if action == "up" and "--no-deps" not in mapped:
        mapped.insert(1, "--no-deps")
    return service, mapped, mutating
