import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function ensureActiveSessionTable() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SessaoAtiva" (
        "usuarioId" TEXT NOT NULL,
        "sessaoVersao" INTEGER NOT NULL DEFAULT 1,
        "ultimoPingEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SessaoAtiva_pkey" PRIMARY KEY ("usuarioId"),
        CONSTRAINT "SessaoAtiva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SessaoAtiva_ultimoPingEm_idx" ON "SessaoAtiva"("ultimoPingEm");
    `);
  } catch {
    // Sem tabela de presença, o ping segue apenas para validação de sessão.
  }
}

async function getSessionVersion(userId: string) {
  try {
    const rows = await db.$queryRaw<Array<{ sessaoVersao: number }>>`
      SELECT COALESCE("sessaoVersao", 1) AS "sessaoVersao"
      FROM "Usuario"
      WHERE "id" = ${userId}
      LIMIT 1
    `;
    return rows[0]?.sessaoVersao ?? 1;
  } catch {
    return 1;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id || session.invalidated) {
    return NextResponse.json({ ok: false, invalidated: true, authenticated: false });
  }

  const sessionVersion = await getSessionVersion(session.user.id);

  try {
    await ensureActiveSessionTable();
    await db.$executeRaw`
      INSERT INTO "SessaoAtiva" ("usuarioId", "sessaoVersao", "ultimoPingEm")
      VALUES (${session.user.id}, ${sessionVersion}, NOW())
      ON CONFLICT ("usuarioId")
      DO UPDATE SET
        "sessaoVersao" = EXCLUDED."sessaoVersao",
        "ultimoPingEm" = NOW()
    `;
  } catch {
    // Não bloqueia a navegação caso a tabela não exista.
  }

  return NextResponse.json({ ok: true, invalidated: false, authenticated: true });
}
