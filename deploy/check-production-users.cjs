const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { createHmac } = require("node:crypto");

async function matchesCandidate(candidate, hash) {
  const prefix = "egv-bcrypt-sha384-v1:";
  if (!hash.startsWith(prefix)) return bcrypt.compare(candidate, hash);
  const [salt, encoded] = hash.slice(prefix.length).split(":");
  if (!/^[a-f0-9]{32}$/.test(salt || "") || !encoded) return false;
  const digest = createHmac("sha384", Buffer.from(salt, "hex")).update(candidate, "utf8").digest("base64");
  return bcrypt.compare(digest, encoded);
}

// The known weak candidates below are a detection denylist, never account credentials to create or restore.
function knownWeakCandidates() { return ["123456", "12345678", "password", "admin"]; }

async function audit(db) {
  const rows = await db.usuario.findMany({ where: { status: "ATIVO" }, select: { senhaHash: true } });
  let weak = 0;
  for (const row of rows) {
    for (const candidate of knownWeakCandidates()) {
      if (await matchesCandidate(candidate, row.senhaHash)) { weak++; break; }
    }
  }
  console.log(JSON.stringify({ activeAccounts: rows.length, knownWeakLegacyPasswords: weak }));
  if (weak) process.exitCode = 1;
}
async function main() {
  const db = new PrismaClient({ log: [] });
  try { await audit(db); } finally { await db.$disconnect(); }
}

module.exports = { matchesCandidate, knownWeakCandidates, main };
if (require.main === module) main().catch(() => { console.error("Unable to check legacy credential readiness; no credentials were displayed."); process.exitCode = 1; });
