import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { zipSync, type Zippable } from "fflate";
import { safeDeploymentPath } from "./package-policy";

const directories = ["app", "components", "lib", "pages", "public", "types", "deploy"];
const files = ["package.json", "package-lock.json", "next.config.mjs", "next-env.d.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", ".eslintrc.json", ".dockerignore", "Dockerfile", "compose.production.yml", "compose.https.yml", "DEPLOY_HOSTINGER.md", "prisma/schema.prisma", "tools/check-node.cjs"];

async function main() {
  const entries: Zippable = {};
  async function collect(relative: string) {
    if (!safeDeploymentPath(relative)) return;
    const absolute = path.resolve(relative);
    const stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error("Symlinks are not accepted in a deployment package.");
    if (stat.isDirectory()) {
      for (const name of await fs.readdir(absolute)) {
        await collect(`${relative}/${name}`);
      }
    } else if (stat.isFile()) {
      let bytes = await fs.readFile(absolute);
      if (/\.sh$/.test(relative)) bytes = Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"));
      entries[relative] = bytes;
    }
  }
  for (const directory of directories) await collect(directory);
  await collect("prisma/migrations");
  for (const file of files) await collect(file);
  const archive = zipSync(entries, { level: 6 });
  const checksum = createHash("sha256").update(archive).digest("hex");
  const release = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + checksum.slice(0, 12);
  const destination = path.join(os.tmpdir(), "portal-egv-deploy");
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const output = path.join(destination, `${release}.zip`);
  await fs.writeFile(output, archive, { mode: 0o600 });
  await fs.writeFile(path.join(destination, "latest.json"), JSON.stringify({ release, archive: output, sha256: checksum, files: Object.keys(entries).length }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ release, archive: output, sha256: checksum, files: Object.keys(entries).length }));
}
main().catch(() => { console.error("Unable to package the allowlisted source; no secrets were printed."); process.exitCode = 1; });
