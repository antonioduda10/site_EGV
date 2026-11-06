import { loadEnvConfig } from "@next/env";
import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
import { pipeline } from "node:stream/promises";

loadEnvConfig(process.cwd());
const db = new PrismaClient({ log: [] });
const destination = path.join(os.tmpdir(), "portal-egv-transfer");

async function hashFile(filename: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}
async function executeFile(command: string, args: string[], output?: string) {
  const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", output ? "pipe" : "ignore", "pipe"] });
  // Do not reproduce tool errors that could contain datasource or personal information.
  child.stderr?.on("data", () => undefined);
  const exited = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error("Export subprocess failed.")));
  });
  if (output) await Promise.all([pipeline(child.stdout!, createWriteStream(output, { mode: 0o600 })), exited]);
  else await exited;
}

async function main() {
  const sourceUrl = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(sourceUrl.hostname)) throw new Error("Only the local datasource can be exported by this helper.");
  const records = JSON.parse(execFileSync("docker", ["inspect", "egv-postgres"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as { Config: { Env: string[] }; State: { Running: boolean } }[];
  const env = Object.fromEntries(records[0].Config.Env.map((item) => { const separator = item.indexOf("="); return [item.slice(0, separator), item.slice(separator + 1)]; }));
  if (!records[0].State.Running || sourceUrl.pathname.slice(1) !== env.POSTGRES_DB) throw new Error("Local container does not match the configured datasource.");
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const dump = path.join(destination, "database.dump");
  const counts = await db.$transaction(async (tx) => {
    const snapshots = await tx.$queryRaw<{ snapshot: string }[]>`SELECT pg_export_snapshot() AS snapshot`;
    const result: Record<string, number> = {};
    for (const model of Prisma.dmmf.datamodel.models) {
      const name = model.dbName || model.name;
      if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) throw new Error("Unexpected table identifier.");
      const rows = await tx.$queryRawUnsafe<{ total: number }[]>(`SELECT count(*)::int AS total FROM public."${name}"`);
      result[name] = rows[0].total;
    }
    await executeFile("docker", ["exec", "egv-postgres", "sh", "-c", 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema=public --format=custom --no-owner --no-acl --snapshot="$1"', "sh", snapshots[0].snapshot], dump);
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 120000 });
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const files: { path: string; bytes: number; sha256: string }[] = [];
  async function visit(directory: string) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Upload symlink requires manual review.");
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile()) files.push({ path: path.relative(uploadRoot, filename).replace(/\\/g, "/"), bytes: (await fs.stat(filename)).size, sha256: await hashFile(filename) });
    }
  }
  await visit(uploadRoot);
  const uploads = path.join(destination, "uploads.tar.gz");
  await executeFile("tar", ["-czf", uploads, "-C", uploadRoot, "."]);
  const manifest = { counts, files, databaseSha256: await hashFile(dump), uploadsSha256: await hashFile(uploads), createdAt: new Date().toISOString() };
  await fs.writeFile(path.join(destination, "transfer-manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
  console.log(JSON.stringify({ exported: true, directory: destination, tables: Object.keys(counts).length, uploadFiles: files.length, uploadBytes: files.reduce((sum, item) => sum + item.bytes, 0) }));
}
main().catch(() => { console.error("Local export failed. No credentials, personal rows or raw database errors were printed."); process.exitCode = 1; }).finally(() => db.$disconnect());
