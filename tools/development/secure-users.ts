import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashPassword, verifyPassword } from "../../lib/password";
import { requireLocalDatabase } from "./local-database";
import { developmentPassword, markCredentialsApplied, writePrivateCredentials } from "./private-credentials";

export function knownLegacyCandidates() {
  const { knownWeakCandidates } = require("../../deploy/check-production-users.cjs") as { knownWeakCandidates(): string[] };
  return new Set(knownWeakCandidates());
}

async function main() {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const { url } = requireLocalDatabase(process.env.DATABASE_URL);
  const candidates = knownLegacyCandidates();
  const pointer = path.join(os.tmpdir(), "portal-egv-legacy-seed-audit-latest.json");
  let legacyFile: string | undefined;
  if (existsSync(pointer)) {
    const candidate = JSON.parse(readFileSync(pointer, "utf8")).file;
    if (typeof candidate !== "string" || path.dirname(candidate) !== os.tmpdir()
      || !/^portal-egv-legacy-seed-audit-[a-f0-9-]+\.json$/.test(path.basename(candidate))) throw new Error("Entrada temporaria invalida.");
    legacyFile = candidate;
    const values: unknown = JSON.parse(readFileSync(candidate, "utf8"));
    if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) throw new Error("Entrada temporaria invalida.");
    for (const value of values) candidates.add(value);
  }
  const db = new PrismaClient({ log: [], datasources: { db: { url: url.toString() } } });
  try {
    const users = await db.usuario.findMany({ select: { id: true, email: true, senhaHash: true } });
    const weak = [];
    for (const user of users) {
      for (const candidate of candidates) if (await verifyPassword(candidate, user.senhaHash)) { weak.push(user); break; }
    }
    if (!process.argv.includes("--apply")) {
      console.log(JSON.stringify({ environment: "local-development", users: users.length, knownLegacyPasswords: weak.length, databaseWrites: false }));
      return;
    }
    if (!weak.length) {
      console.log(JSON.stringify({ environment: "local-development", rotatedUsers: 0, databaseWrites: false }));
      return;
    }
    const replacements = await Promise.all(weak.map(async (user) => {
      const password = developmentPassword();
      return { user, password, hash: await hashPassword(password) };
    }));
    const filename = writePrivateCredentials(replacements.map(({ user, password }) => ({ email: user.email, password })), "replace-known-legacy-local-user-passwords");
    await db.$transaction(async (tx) => {
      for (const { user, hash } of replacements) {
        const changed = await tx.usuario.updateMany({ where: { id: user.id, senhaHash: user.senhaHash }, data: { senhaHash: hash, sessaoVersao: { increment: 1 } } });
        if (changed.count !== 1) throw new Error("Uma conta mudou durante a operacao; transacao cancelada.");
        await tx.sessaoAtiva.deleteMany({ where: { usuarioId: user.id } });
        await tx.passwordResetToken.deleteMany({ where: { usuarioId: user.id } });
      }
    });
    markCredentialsApplied(filename);
    if (legacyFile) { unlinkSync(legacyFile); unlinkSync(pointer); }
    console.log(JSON.stringify({ environment: "local-development", rotatedUsers: replacements.length, localSessionsRevoked: true, credentialsFile: filename, productionAccessed: false, passwordsPrinted: false }));
  } finally { await db.$disconnect(); }
}

if (require.main === module) main().catch(() => {
  console.error("Auditoria/correcao local nao concluida. Nenhuma credencial ou detalhe de conexao foi exibido.");
  process.exitCode = 1;
});
