const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
class MigrationSafetyError extends Error {}

async function main() {
  const exists = await db.$queryRaw`SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present`;
  const applied = exists[0].present ? await db.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations` : [];
  const tables = await db.$queryRaw`SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '_prisma_migrations'`;
  if (!applied.length && tables[0].total) throw new MigrationSafetyError("Existing database without migration history: manual baseline required.");
  const pristine = !tables[0].total;
  const directory = path.join(process.cwd(), "prisma/migrations");
  const compatibility = JSON.parse(fs.readFileSync(path.join(__dirname, "migration-compatibility.json"), "utf8"));
  let pending = 0;
  for (const name of fs.readdirSync(directory).sort()) {
    const filename = path.join(directory, name, "migration.sql");
    if (!fs.existsSync(filename)) continue;
    const sql = fs.readFileSync(filename, "utf8");
    const row = applied.find((item) => item.migration_name === name && !item.rolled_back_at);
    if (row) {
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      const equivalentLineEndings = [sql.replace(/\r\n/g, "\n"), sql.replace(/\r?\n/g, "\r\n")].some((value) => crypto.createHash("sha256").update(value).digest("hex") === row.checksum);
      const sourceChecksums = [sql, sql.replace(/\r\n/g, "\n"), sql.replace(/\r?\n/g, "\r\n")].map((value) => crypto.createHash("sha256").update(value).digest("hex"));
      const approved = compatibility.some((item) => item.migration === name && item.recordedChecksum === row.checksum && sourceChecksums.includes(item.sourceChecksum));
      if (!row.finished_at || (row.checksum !== checksum && !equivalentLineEndings && !approved)) throw new MigrationSafetyError("Migration history differs from source; deployment stopped.");
      if (approved) console.log(`Reviewed historical compatibility exception: ${name}; original database history preserved.`);
    } else {
      pending++;
      if (!pristine && /\b(?:DROP\s+(?:TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM)\b/i.test(sql)) throw new MigrationSafetyError("Pending destructive migration requires manual review and a verified backup.");
    }
  }
  console.log(`Migration history checked; ${pending} pending migration(s).`);
}
main().catch((error) => { console.error(error instanceof MigrationSafetyError ? error.message : "Unable to verify migration history; no database details were logged."); process.exitCode = 1; }).finally(() => db.$disconnect());
