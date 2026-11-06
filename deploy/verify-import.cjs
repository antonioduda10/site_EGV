const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
async function main() {
  const manifest = JSON.parse(fs.readFileSync("/transfer/transfer-manifest.json", "utf8"));
  for (const [name, expected] of Object.entries(manifest.counts)) {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) throw new Error("Invalid table identifier.");
    const rows = await db.$queryRawUnsafe(`SELECT count(*)::int AS total FROM public."${name}"`);
    if (rows[0].total !== expected) throw new Error("Imported row count does not match the private snapshot.");
  }
  for (const file of manifest.files) {
    const target = path.resolve("/uploads", file.path);
    const relative = path.relative("/uploads", target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || fs.lstatSync(target).isSymbolicLink()) throw new Error("Invalid upload path.");
    const hash = crypto.createHash("sha256");
    for await (const chunk of fs.createReadStream(target)) hash.update(chunk);
    if (hash.digest("hex") !== file.sha256 || fs.statSync(target).size !== file.bytes) throw new Error("Imported upload checksum mismatch.");
  }
  console.log(JSON.stringify({ importedTablesVerified: Object.keys(manifest.counts).length, uploadFilesVerified: manifest.files.length, allChecksumsMatch: true }));
}
main().catch(() => { console.error("Import verification failed; no personal records or paths were printed."); process.exitCode = 1; }).finally(() => db.$disconnect());
