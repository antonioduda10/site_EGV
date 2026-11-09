"""Fail-closed configuration for a candidate that cannot serve public traffic yet."""

import hashlib
import pathlib
import re
import shutil


RELEASE = re.compile(r"[0-9]{14}-[a-f0-9]{12}\Z")
DOMAIN = "escolagetuliovargas.com.br"
GATE = "/run/portal-egv-route/approved"
AUTH_KEYS = ("DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET")


def candidate_name(release):
    if not RELEASE.fullmatch(release):
        raise ValueError("Invalid release identifier")
    return "portal-egv-candidate-" + release


def candidate_labels(previous, release):
    candidate_name(release)
    if previous.get("traefik.enable") != "true" or previous.get("traefik.docker.network") != "portal-egv_edge":
        raise ValueError("Unexpected active routing configuration")
    if previous.get("traefik.http.routers.portal-egv-https.rule") != f"Host(`{DOMAIN}`)":
        raise ValueError("Unexpected production domain")
    if any(key.startswith(("traefik.tcp.", "traefik.udp.")) for key in previous):
        raise ValueError("Unsupported routing configuration")
    groups = ("routers", "services", "middlewares")
    names = {group: set() for group in groups}
    for key in previous:
        for group in groups:
            prefix = f"traefik.http.{group}."
            if key.startswith(prefix):
                names[group].add(key[len(prefix):].split(".", 1)[0])
    if names["services"] != {"portal-egv"} or not names["routers"]:
        raise ValueError("Unexpected service topology")
    suffix = "-bg-" + release
    result = {"traefik.enable": "true", "traefik.docker.network": "portal-egv_edge",
              "portal-egv.bluegreen": "true", "portal-egv.release": release}
    for key, value in previous.items():
        if not key.startswith("traefik.http."):
            continue
        parts = key.split(".", 4)
        if len(parts) != 5 or parts[2] not in groups:
            raise ValueError("Unsupported HTTP label")
        group, name = parts[2:4]
        new_key = ".".join(parts[:3] + [name + suffix, parts[4]])
        if group == "routers" and parts[4] in ("service", "middlewares"):
            target_group = "services" if parts[4] == "service" else "middlewares"
            references = value.split(",")
            if any(reference not in names[target_group] for reference in references):
                raise ValueError("External routing reference requires manual review")
            value = ",".join(reference + suffix for reference in references)
        if group == "routers" and parts[4] == "priority":
            if not value.isdigit() or not 0 < int(value) < 10000:
                raise ValueError("Unexpected router priority")
            value = str(int(value) + 10000)
        # Dollar signs from an inspected label must not become Compose substitutions.
        result[new_key] = value.replace("$", "$$")
    for name in names["routers"]:
        old_key = f"traefik.http.routers.{name}.priority"
        if old_key not in previous:
            rule = previous.get(f"traefik.http.routers.{name}.rule", "")
            if not rule or len(rule.encode()) >= 10000:
                raise ValueError("Missing or oversized route rule")
            result[f"traefik.http.routers.{name + suffix}.priority"] = str(10000 + len(rule.encode()))
    return result


def candidate_compose(previous_labels, release, static_directory):
    name = candidate_name(release)
    directory = pathlib.PurePosixPath(static_directory)
    if str(directory) != f"/opt/portal-egv/shared/bluegreen/{release}/static":
        raise ValueError("Static directory outside the release workspace")
    health = ("const fs=require('node:fs');"
              f"if(!fs.existsSync('{GATE}'))process.exit(1);"
              "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(2000)})"
              ".then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))")
    return {
        "name": "portal-egv-preview-" + release,
        "services": {"candidate": {
            "image": "${PORTAL_CANDIDATE_IMAGE:?required}", "container_name": name,
            "restart": "unless-stopped", "init": True,
            "environment": {"NODE_ENV": "production", **{key: "${" + key + ":?required}" for key in AUTH_KEYS},
                            "UPLOAD_DIR": "/app/uploads", "ERROR_LOG_DIR": "/app/logs", "NEXT_TELEMETRY_DISABLED": "1"},
            "ports": ["127.0.0.1:3002:3000"],
            "volumes": ["uploads:/app/uploads", "app_logs:/app/logs", str(directory) + ":/app/.next-build/static:ro",
                        str(directory.parent / "route-control") + ":/run/portal-egv-route:ro"],
            "tmpfs": ["/tmp:size=134217728,mode=1777", "/app/.next-build/cache:size=67108864,uid=1001,gid=1001"],
            "read_only": True, "cap_drop": ["ALL"], "security_opt": ["no-new-privileges:true"],
            "networks": ["edge", "database"], "labels": candidate_labels(previous_labels, release),
            "healthcheck": {"test": ["CMD", "node", "-e", health], "interval": "3s", "timeout": "3s",
                            "start_period": "24h", "retries": 1},
            "mem_limit": "1024m", "memswap_limit": "1536m",
            "logging": {"driver": "json-file", "options": {"max-size": "10m", "max-file": "3"}},
        }},
        "networks": {key: {"name": "portal-egv_" + key, "external": True} for key in ("edge", "database")},
        "volumes": {key: {"name": "portal-egv_" + key, "external": True} for key in ("uploads", "app_logs")},
    }


def file_manifest(directory):
    root = pathlib.Path(directory)
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Expected a regular directory")
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or (not path.is_dir() and not path.is_file()):
            raise ValueError("Links and special files are not accepted")
        if path.is_file():
            result[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def merge_static(previous, candidate, destination):
    old, new = file_manifest(previous), file_manifest(candidate)
    if any(old[name] != new[name] for name in old.keys() & new.keys()):
        raise ValueError("Static asset collision; active release was not changed")
    output = pathlib.Path(destination)
    output.mkdir(mode=0o755, exist_ok=False)
    for source, manifest in ((previous, old), (candidate, new)):
        for name in manifest:
            target = output / name
            target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            shutil.copyfile(pathlib.Path(source) / name, target)
            target.chmod(0o644)
    expected = {**old, **new}
    if file_manifest(output) != expected:
        raise ValueError("Merged static assets failed verification")
    return {"previousFiles": len(old), "candidateFiles": len(new), "mergedFiles": len(expected)}
