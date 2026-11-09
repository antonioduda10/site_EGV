import type { Prisma } from "@prisma/client";
import { hashPassword } from "../../lib/password";
import { developmentPassword, markCredentialsApplied, writePrivateCredentials } from "./private-credentials";

export const DEVELOPMENT_ADMIN_EMAIL = "admin-dev@example.invalid";

type SeedUsers = {
  usuario: {
    findUnique(args: { where: { email: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: { data: Prisma.UsuarioCreateInput; select: { id: true } }): Promise<{ id: string }>;
  };
};

type SeedResult = { id: string; created: false } | { id: string; created: true; credentialsFile: string };

export async function ensureDevelopmentAdmin(
  db: SeedUsers,
  store = (email: string, password: string) => writePrivateCredentials([{ email, password }], "initial-local-admin"),
  applied = markCredentialsApplied
): Promise<SeedResult> {
  const existing = await db.usuario.findUnique({ where: { email: DEVELOPMENT_ADMIN_EMAIL }, select: { id: true } });
  if (existing) return { ...existing, created: false };
  const password = developmentPassword();
  const filename = store(DEVELOPMENT_ADMIN_EMAIL, password);
  try {
    const created = await db.usuario.create({
      data: { nome: "Administrador de desenvolvimento", email: DEVELOPMENT_ADMIN_EMAIL, senhaHash: await hashPassword(password), status: "ATIVO", superAdmin: true, perfis: { create: { perfil: { connect: { nome: "Admin" } } } } },
      select: { id: true }
    });
    applied(filename);
    return { ...created, created: true, credentialsFile: filename };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const concurrent = await db.usuario.findUnique({ where: { email: DEVELOPMENT_ADMIN_EMAIL }, select: { id: true } });
      if (concurrent) return { ...concurrent, created: false };
    }
    throw new Error("Criacao local nao concluida. O arquivo privado preparado foi preservado para recuperacao.");
  }
}
