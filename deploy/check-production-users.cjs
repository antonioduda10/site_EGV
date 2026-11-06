const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient({ log: [] });
async function main() {
  const rows = await db.usuario.findMany({ where: { status: "ATIVO" }, select: { senhaHash: true } });
  let weak = 0;
  for (const row of rows) {
    if (row.senhaHash.startsWith("egv-bcrypt-sha384-v1:")) continue;
    for (const candidate of ["123456", "12345678", "password", "admin"]) {
      if (await bcrypt.compare(candidate, row.senhaHash)) { weak++; break; }
    }
  }
  console.log(JSON.stringify({ activeAccounts: rows.length, knownWeakLegacyPasswords: weak }));
  if (weak) process.exitCode = 1;
}
main().catch(() => { console.error("Unable to check legacy credential readiness; no credentials were displayed."); process.exitCode = 1; }).finally(() => db.$disconnect());
