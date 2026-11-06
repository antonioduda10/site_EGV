import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
  if (result.status !== 0) throw new Error("Deployment command failed.");
}
try {
  run(process.execPath, ["node_modules/tsx/dist/cli.mjs", "deploy/package.ts"]);
  const metadata = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), "portal-egv-deploy/latest.json"), "utf8")) as { release: string; archive: string; sha256: string };
  if (!/^\d{14}-[a-f0-9]{12}$/.test(metadata.release) || !/^[a-f0-9]{64}$/.test(metadata.sha256)) throw new Error("Invalid release metadata.");
  const options = ["-o", "StrictHostKeyChecking=yes"];
  run("scp", [...options, "deploy/host/extract-release.py", "root@179.66.135.203:/opt/portal-egv/extract-release.py"]);
  run("scp", [...options, metadata.archive, `root@179.66.135.203:/opt/portal-egv/incoming/${metadata.release}.zip`]);
  run("ssh", [...options, "root@179.66.135.203", `python3 /opt/portal-egv/extract-release.py ${metadata.release} ${metadata.sha256} && /opt/portal-egv/deploy.sh /opt/portal-egv/releases/${metadata.release}`]);
} catch {
  console.error("Publish did not complete. No credentials were stored in the source package; review the protected server backup and deployment output.");
  process.exitCode = 1;
}
