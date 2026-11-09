import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { zipSync, type Zippable } from "fflate";
import { safeDeploymentPath } from "./package-policy";
import { execFileSync } from "node:child_process";

const directories = ["app", "components", "lib", "pages", "public", "types", "deploy"];
const files = ["package.json", "package-lock.json", "next.config.mjs", "next-env.d.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", ".eslintrc.json", ".dockerignore", "Dockerfile", "compose.production.yml", "compose.https.yml", "DEPLOY_HOSTINGER.md", "prisma/schema.prisma", "tools/check-node.cjs"];

async function main() {
  const entries: Zippable = {};
  const commitIndex = process.argv.indexOf("--commit");
  const commit = commitIndex >= 0 ? process.argv[commitIndex + 1] : undefined;
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
  if (commitIndex >= 0) {
    if (!commit || !/^[a-f0-9]{40}$/.test(commit)
      || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== commit
      || execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) throw new Error("Use a clean, reviewed HEAD commit.");
    const tree = execFileSync("git", ["ls-tree", "-rz", commit], { encoding: "utf8" });
    for (const record of tree.split("\0").filter(Boolean)) {
      const separator = record.indexOf("\t");
      const relative = record.slice(separator + 1);
      const selected = files.includes(relative) || relative.startsWith("prisma/migrations/")
        || directories.some((directory) => relative.startsWith(`${directory}/`));
      if (!selected || !safeDeploymentPath(relative)) continue;
      if (!/^100(?:644|755) blob [a-f0-9]{40}$/.test(record.slice(0, separator))) throw new Error("Only regular committed files are accepted.");
      entries[relative] = execFileSync("git", ["show", `${commit}:${relative}`]);
    }
    const manifest: Record<string, string> = {};
    for (const [name, data] of Object.entries(entries)) {
      if (!(data instanceof Uint8Array)) throw new Error("Expected a committed file blob.");
      manifest[name] = createHash("sha256").update(data).digest("hex");
    }
    entries["deploy-source.json"] = Buffer.from(JSON.stringify({ version: 1, commit, files: manifest }));
  } else {
    for (const directory of directories) await collect(directory);
    await collect("prisma/migrations");
    for (const file of files) await collect(file);
  }
  const archive = zipSync(entries, { level: 6 });
  const checksum = createHash("sha256").update(archive).digest("hex");
  const release = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + checksum.slice(0, 12);
  const destination = path.join(os.tmpdir(), "portal-egv-deploy");
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const output = path.join(destination, `${release}.zip`);
  await fs.writeFile(output, archive, { mode: 0o600 });
  await fs.writeFile(path.join(destination, "latest.json"), JSON.stringify({ release, archive: output, sha256: checksum, files: Object.keys(entries).length, ...(commit ? { commit } : {}) }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ release, archive: output, sha256: checksum, files: Object.keys(entries).length, ...(commit ? { commit } : {}) }));
}
main().catch(() => { console.error("Unable to package the allowlisted source; no secrets were printed."); process.exitCode = 1; });
