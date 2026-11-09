#!/usr/bin/env python3
"""Prepare only. This command never opens the routing gate or changes current."""

import argparse
import fcntl
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

from bluegreen_policy import AUTH_KEYS, DOMAIN, GATE, candidate_compose, candidate_name, file_manifest, merge_static
from bluegreen_runtime import verify_source


ROOT = pathlib.Path("/opt/portal-egv")
ACTIVE = "portal-egv-app-1"
REQUIRED = ("traefik-traefik-1", "portal-egv-db-1", ACTIVE)


def run(args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if result.returncode:
        raise RuntimeError("Preparation command failed; active application was not replaced")
    return result.stdout.strip()


def inspect(name, field):
    return json.loads(run(["docker", "inspect", "--format", "{{json " + field + "}}", name], timeout=20))


def same_schema(previous, candidate):
    if (previous / "prisma/schema.prisma").read_bytes() != (candidate / "prisma/schema.prisma").read_bytes():
        raise ValueError("Schema changed; this preparation does not allow migrations")
    if file_manifest(previous / "prisma/migrations") != file_manifest(candidate / "prisma/migrations"):
        raise ValueError("Migrations changed; separate review required")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def http_check(url, expected, host=None):
    request = urllib.request.Request(url, headers={"User-Agent": "PortalEGV-bluegreen-preflight/1.0", **({"Host": host} if host else {})})
    try:
        response = urllib.request.build_opener(NoRedirect()).open(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        if response.status != expected:
            raise RuntimeError("Unexpected response in read-only preflight")
        return {"status": response.status, "contentType": response.headers.get("Content-Type")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release")
    parser.add_argument("--confirm-prepare-only", action="store_true", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--replace-closed-candidate")
    args = parser.parse_args()
    name = candidate_name(args.release)
    release = ROOT / "releases" / args.release
    if os.geteuid() != 0 or release.is_symlink() or not release.is_dir():
        raise ValueError("Expected root and an extracted release directory")
    source = verify_source(release, args.commit)
    with open("/var/lock/portal-egv-deploy.lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        previous = (ROOT / "current").resolve(strict=True)
        if previous.parent != ROOT / "releases":
            raise ValueError("Unexpected active release")
        same_schema(previous, release)
        identities = {container: inspect(container, ".Id") for container in REQUIRED}
        for container in REQUIRED:
            if not inspect(container, ".State.Running") or inspect(container, ".State.Paused"):
                raise ValueError("Existing infrastructure is not running normally")
        if inspect(ACTIVE, ".State.Health.Status") != "healthy":
            raise ValueError("Active application is not healthy")
        traefik_args = [value.lower() for value in inspect("traefik-traefik-1", ".Args")]
        if "--providers.docker=true" not in traefik_args or "--providers.docker.exposedbydefault=false" not in traefik_args:
            raise ValueError("Unexpected Docker provider configuration")
        if any("allowemptyservices" in value or "allownonrunning" in value for value in traefik_args):
            raise ValueError("Routing health filtering requires separate review")
        if inspect(ACTIVE, ".NetworkSettings.Ports") != {"3000/tcp": [{"HostIp": "127.0.0.1", "HostPort": "3000"}]}:
            raise ValueError("Unexpected active application ports")
        if any(inspect("portal-egv-db-1", ".NetworkSettings.Ports").values()):
            raise ValueError("Database has published ports")
        candidates = run(["docker", "ps", "-a", "--no-trunc", "-q", "--filter", "label=portal-egv.bluegreen=true"], timeout=20).splitlines()
        replaced = None
        if candidates:
            old_name = candidate_name(args.replace_closed_candidate or "")
            old_workspace = ROOT / "shared/bluegreen" / args.replace_closed_candidate
            old_state = json.loads((old_workspace / "state.json").read_text())
            if candidates != [old_state.get("candidateID")] or old_state.get("candidate") != old_name:
                raise ValueError("Unexpected preview container; no container was removed")
            if old_state.get("phase") != "prepared-not-serving" or (old_workspace / "route-control/approved").exists() or inspect(old_name, ".State.Health.Status") == "healthy":
                raise ValueError("Only an explicitly identified closed preview can be replaced")
            replaced = {"name": old_name, "id": old_state["candidateID"], "workspace": old_workspace, "state": old_state}
        available = int(next(line.split()[1] for line in pathlib.Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:")))
        if available < 2 * 1024 * 1024 or os.statvfs(ROOT).f_bavail * os.statvfs(ROOT).f_frsize < 3 * 1024 ** 3:
            raise ValueError("Insufficient spare memory or disk for preparation")
        if not replaced:
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", 3002))
        before = http_check("https://" + DOMAIN + "/api/health", 200)
        workspace = ROOT / "shared/bluegreen" / args.release
        workspace.parent.mkdir(mode=0o700, exist_ok=True)
        if workspace.parent.is_symlink():
            raise ValueError("Unsafe preparation directory")
        workspace.mkdir(mode=0o700, exist_ok=False)
        (workspace / "route-control").mkdir(mode=0o755)
        state = {"release": args.release, "phase": "building", "previousRelease": str(previous),
                 "previousContainerIDs": identities, "candidate": name, "gate": "closed", "publicHealthBefore": before,
                 "sourceCommit": args.commit, "verifiedSourceFiles": len(source["files"])}

        def save():
            destination = workspace / "state.json"
            fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w") as stream:
                json.dump(state, stream, indent=2)

        save()
        image = "portal-egv:" + args.release
        log_path = workspace / "build.log"
        fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as log:
            build = subprocess.run(["docker", "build", "--target", "runner", "--build-arg", "PORTAL_SOURCE_COMMIT=" + args.commit, "--tag", image, str(release)], stdout=log, stderr=subprocess.STDOUT, timeout=1800)
        if build.returncode:
            raise RuntimeError("Candidate build failed; diagnostic remains private on the server")
        verify_source(release, args.commit)
        if inspect(image, ".Config.Labels").get("org.opencontainers.image.revision") != args.commit:
            raise ValueError("Built image revision does not match the reviewed source")
        print("Candidate image built; active application is unchanged.", flush=True)
        temporary_id = run(["docker", "create", "--network", "none", "--label", "traefik.enable=false", image], timeout=20)
        try:
            old_assets, new_assets = workspace / "previous-static", workspace / "candidate-static"
            old_assets.mkdir(mode=0o700)
            new_assets.mkdir(mode=0o700)
            run(["docker", "cp", ACTIVE + ":/app/.next-build/static/.", str(old_assets)], timeout=60)
            run(["docker", "cp", temporary_id + ":/app/.next-build/static/.", str(new_assets)], timeout=60)
            state["staticAssets"] = merge_static(old_assets, new_assets, workspace / "static")
        finally:
            run(["docker", "rm", temporary_id], timeout=20)
        configuration = candidate_compose(inspect(ACTIVE, ".Config.Labels"), args.release, str(workspace / "static"))
        config_path = workspace / "compose.json"
        fd = os.open(config_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as stream:
            json.dump(configuration, stream, indent=2)
        state["composeSHA256"] = hashlib.sha256(config_path.read_bytes()).hexdigest()
        environment = {key: value for key, value in os.environ.items() if key not in AUTH_KEYS}
        environment["PORTAL_CANDIDATE_IMAGE"] = image
        compose = ["docker", "compose", "--env-file", str(ROOT / "shared/.env"), "-f", str(config_path)]
        run(compose + ["config", "--quiet"], env=environment, timeout=30)
        if replaced:
            if (replaced["workspace"] / "route-control/approved").exists() or inspect(replaced["name"], ".State.Health.Status") == "healthy":
                raise ValueError("Preview gate changed; no replacement was performed")
            run(["docker", "rm", "-f", replaced["id"]], timeout=30)
            replaced["state"]["phase"] = "superseded-closed"
            replaced["state"]["supersededBy"] = args.release
            (replaced["workspace"] / "state.json").write_text(json.dumps(replaced["state"], indent=2))
        run(compose + ["up", "-d", "--no-deps", "candidate"], env=environment, timeout=60)
        for attempt in range(60):
            try:
                http_check("http://127.0.0.1:3002/api/health", 200, DOMAIN)
                break
            except (OSError, RuntimeError):
                if attempt == 59:
                    raise RuntimeError("Candidate did not become ready; routing gate remains closed")
                time.sleep(2)
        private_checks = {}
        for route in ("/", "/noticias", "/eventos", "/documentos", "/galeria", "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato", "/login", "/sitemap.xml", "/robots.txt"):
            private_checks[route] = http_check("http://127.0.0.1:3002" + route, 200, DOMAIN)
        for route in ("/api/avisos", "/api/usuarios"):
            private_checks[route] = http_check("http://127.0.0.1:3002" + route, 403, DOMAIN)
        for route in ("/dashboard", "/dashboard/avisos", "/dashboard/config", "/dashboard/usuarios"):
            private_checks[route] = http_check("http://127.0.0.1:3002" + route, 307, DOMAIN)
        def auth_environment(container):
            values = dict(value.split("=", 1) for value in inspect(container, ".Config.Env") if "=" in value)
            return {key: values.get(key) for key in AUTH_KEYS}
        if auth_environment(ACTIVE) != auth_environment(name) or any(not value for value in auth_environment(name).values()):
            raise ValueError("Candidate authentication/database environment does not match the active application")
        if any(inspect(container, ".Id") != identity for container, identity in identities.items()):
            raise ValueError("Active infrastructure changed during preparation")
        if (ROOT / "current").resolve() != previous:
            raise ValueError("Active release changed during preparation")
        if inspect(name, ".State.Health.Status") == "healthy":
            raise ValueError("Unexpected open routing gate")
        check_gate = subprocess.run(["docker", "exec", name, "node", "-e", f"process.exit(require('node:fs').existsSync('{GATE}')?1:0)"], capture_output=True, timeout=10)
        if check_gate.returncode:
            raise ValueError("Candidate gate is not closed")
        state.update({"phase": "prepared-not-serving", "candidateID": inspect(name, ".Id"),
                      "candidateImageID": inspect(name, ".Image"), "privateReadOnlyChecks": private_checks,
                      "authenticationEnvironmentMatches": True, "schemaAndMigrationsUnchanged": True,
                      "publicHealthAfter": http_check("https://" + DOMAIN + "/api/health", 200)})
        save()
        print(json.dumps({"phase": state["phase"], "release": args.release, "gate": "closed", "checks": len(private_checks),
                          "stateFile": str(workspace / "state.json"), "activeInfrastructureUnchanged": True}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        detail = str(error) if type(error) in (RuntimeError, ValueError) else type(error).__name__
        print("Preparation stopped: " + detail + ". No activation, migration, seed, database import or active application replacement was performed.", file=sys.stderr)
        sys.exit(1)
