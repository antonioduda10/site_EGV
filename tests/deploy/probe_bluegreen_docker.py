"""Opt-in local Docker rehearsal; no Portal database, users, uploads or secrets."""

import json
import os
import pathlib
import ssl
import subprocess
import sys
import threading
import time
import urllib.request
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "deploy"))
from bluegreen_policy import DOMAIN, GATE, candidate_labels
from test_bluegreen import LABELS, RELEASE


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise RuntimeError("Local rehearsal command failed: " + args[0] + ": " + result.stderr.strip()[:400])
    return result.stdout.strip()


def main():
    if os.environ.get("EGV_LOCAL_DOCKER_PROBE") != "1" or run(["docker", "info", "--format", "{{.Name}}"]) != "docker-desktop":
        raise ValueError("This rehearsal requires opt-in and the local Docker Desktop daemon")
    identifier = "egv-bg-probe-" + uuid.uuid4().hex[:12]
    network = identifier
    containers = []
    stopped = threading.Event()
    samples = []
    poller = None
    run(["docker", "network", "create", "--label", "portal-egv.probe=" + identifier, network])
    gate_volume = run(["docker", "volume", "create", "--label", "portal-egv.probe=" + identifier, identifier + "-gate"])
    try:
        labels = {key: value for key, value in LABELS.items() if "upgrade" not in key and "middlewares" not in key}
        blue = dict(labels, **{"traefik.docker.network": network, "portal-egv.probe": identifier})
        green = candidate_labels(LABELS, RELEASE)
        green = {key: value.replace("$$", "$") for key, value in green.items() if "upgrade" not in key and "middlewares" not in key}
        green.update({"traefik.docker.network": network, "portal-egv.probe": identifier})
        for name, route_labels, gated in (("old", blue, False), ("new", green, True)):
            server = "require('node:http').createServer((q,r)=>{r.end(q.url.includes('health')?'ok':'" + name + "')}).listen(3000,'0.0.0.0')"
            health = (f"if(!require('node:fs').existsSync('{GATE}'))process.exit(1);" if gated else "")
            health += "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
            args = ["docker", "run", "-d", "--name", identifier + "-" + name, "--network", network,
                    "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
                    "--user", "1001:1001", "--tmpfs", "/tmp:size=1048576,mode=1777", "--memory", "128m",
                    "--health-cmd", "node -e \"" + health + "\"", "--health-interval", "1s",
                    "--health-timeout", "2s", "--health-start-period", "1h", "--health-retries", "1"]
            for key, value in route_labels.items():
                args += ["--label", key + "=" + value]
            if gated:
                args += ["--mount", "type=volume,source=" + gate_volume + ",target=/run/portal-egv-route,readonly"]
            args += ["--entrypoint", "node", "node:24-bookworm-slim", "-e", server]
            containers.append(run(args))
        proxy = run(["docker", "run", "-d", "--name", identifier + "-traefik", "--network", network,
                     "--label", "traefik.enable=false", "-p", "127.0.0.1::443",
                     "-v", "/var/run/docker.sock:/var/run/docker.sock:ro", "--memory", "128m",
                     "traefik:v3.7.17", "--providers.docker=true", "--providers.docker.exposedbydefault=false",
                     "--providers.docker.constraints=Label(`portal-egv.probe`,`" + identifier + "`)",
                     "--entrypoints.websecure.address=:443", "--log.level=ERROR"])
        containers.append(proxy)
        address = run(["docker", "port", proxy, "443/tcp"])
        if not address.startswith("127.0.0.1:"):
            raise ValueError("Rehearsal proxy was not bound to loopback")
        # Only this disposable, local proxy uses its generated self-signed certificate.
        context = ssl._create_unverified_context()

        def request():
            req = urllib.request.Request("https://" + address + "/", headers={"Host": DOMAIN})
            with urllib.request.urlopen(req, context=context, timeout=3) as response:
                if response.status != 200:
                    raise RuntimeError("Non-200 during rehearsal")
                return response.read().decode()

        def wait_for(expected):
            end = time.monotonic() + 40
            while time.monotonic() < end:
                try:
                    if request() == expected:
                        return
                except (OSError, RuntimeError):
                    pass
                time.sleep(0.2)
            raise RuntimeError("Routing did not reach the expected version")

        wait_for("old")
        for _ in range(20):
            if request() != "old":
                raise RuntimeError("Closed candidate received traffic")
        gate_status = run(["docker", "inspect", "--format", "{{.State.Health.Status}}", containers[1]])
        if gate_status == "healthy":
            raise RuntimeError("Candidate gate was unexpectedly open")
        cannot_activate = subprocess.run(["docker", "exec", containers[1], "node", "-e", f"require('node:fs').writeFileSync('{GATE}','not-authorized')"], capture_output=True, timeout=15)
        if cannot_activate.returncode == 0:
            raise RuntimeError("Candidate was able to authorize itself")

        def control_gate(opened):
            action = f"require('node:fs').writeFileSync('{GATE}','approved')" if opened else f"require('node:fs').unlinkSync('{GATE}')"
            run(["docker", "run", "--rm", "--network", "none", "--read-only", "--memory", "96m",
                 "--mount", "type=volume,source=" + gate_volume + ",target=/run/portal-egv-route",
                 "--entrypoint", "node", "node:24-bookworm-slim", "-e", action])

        def poll():
            while not stopped.is_set():
                try:
                    samples.append({"body": request(), "status": 200})
                except Exception:
                    samples.append({"status": "error"})
                stopped.wait(0.05)

        poller = threading.Thread(target=poll, daemon=True)
        poller.start()
        control_gate(True)
        wait_for("new")
        time.sleep(2)
        control_gate(False)
        wait_for("old")
        time.sleep(2)
        stopped.set()
        poller.join(timeout=5)
        if any(sample["status"] != 200 for sample in samples) or {sample.get("body") for sample in samples} != {"old", "new"}:
            raise RuntimeError("Continuous availability verification failed")
        result = {"environment": "local-disposable-docker", "samples": len(samples), "errors": 0,
                  "gateClosedServesOld": True, "activationServesNew": True, "rollbackServesOld": True,
                  "candidateCannotActivateItself": True,
                  "productionTouched": False, "databaseOrUploadsUsed": False}
        destination = pathlib.Path("test-results/bluegreen-preparation")
        destination.mkdir(parents=True, exist_ok=True)
        (destination / "docker-rehearsal.json").write_text(json.dumps(result, indent=2))
        print(json.dumps(result))
    finally:
        stopped.set()
        if poller:
            poller.join(timeout=5)
        for container in reversed(containers):
            run(["docker", "rm", "-f", container])
        run(["docker", "network", "rm", network])
        run(["docker", "volume", "rm", gate_volume])


if __name__ == "__main__":
    main()
