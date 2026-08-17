import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./password";

let activeSessionTableReady = false;

async function ensureActiveSessionTable() {
  if (activeSessionTableReady) return;
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
    activeSessionTableReady = true;
  } catch {
    // Se não for possível preparar a tabela, apenas desativa o rastreio online.
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

async function touchActiveSession(userId: string, sessionVersion: number) {
  try {
    await ensureActiveSessionTable();
    await db.$executeRaw`
      INSERT INTO "SessaoAtiva" ("usuarioId", "sessaoVersao", "ultimoPingEm")
      VALUES (${userId}, ${sessionVersion}, NOW())
      ON CONFLICT ("usuarioId")
      DO UPDATE SET
        "sessaoVersao" = EXCLUDED."sessaoVersao",
        "ultimoPingEm" = NOW()
    `;
  } catch {
    // Se a tabela ainda não existir, não bloqueamos login.
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "credenciais",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.usuario.findUnique({
          where: { email: credentials.email }
        });
        if (!user) return null;
        const valid = await verifyPassword(credentials.password, user.senhaHash);
        if (!valid) return null;
        const dbSessionVersion = await getSessionVersion(user.id);
        await touchActiveSession(user.id, dbSessionVersion);
        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          sessionVersion: dbSessionVersion
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.name = user.name;
        token.email = user.email;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 1;
      }

      if (token.userId) {
        const user = await db.usuario.findUnique({
          where: { id: String(token.userId) },
          include: {
            perfis: { include: { perfil: true } },
            permissoes: true
          }
        });

        if (!user) {
          token.userId = null;
          token.roles = [];
          token.permissions = [];
          token.superAdmin = false;
          token.invalidated = true;
          return token;
        }

        const dbSessionVersion = await getSessionVersion(user.id);

        if ((token.sessionVersion as number | undefined) !== dbSessionVersion) {
          token.userId = null;
          token.roles = [];
          token.permissions = [];
          token.superAdmin = false;
          token.invalidated = true;
          return token;
        }

        token.roles = user?.perfis.map((p) => p.perfil.nome) ?? [];
        token.permissions = user?.permissoes.map((p) => p.permissao) ?? [];
        token.userId = user?.id ?? null;
        token.superAdmin = user?.superAdmin ?? false;
        token.sessionVersion = dbSessionVersion;
        token.invalidated = false;
        await touchActiveSession(user.id, dbSessionVersion);
      }
      return token;
    },
    async session({ session, token }) {
      session.invalidated = Boolean(token.invalidated);
      session.user.id = (token.userId as string | null) ?? "";
      session.user.roles = token.roles as string[];
      session.user.permissions = token.permissions as string[];
      session.user.superAdmin = token.superAdmin as boolean;
      session.user.email = token.email as string;
      session.user.name = token.name as string;
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};
