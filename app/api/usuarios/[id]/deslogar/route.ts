import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Permissions } from "@/lib/permissions";
import { can } from "@/lib/rbac";
import { isProtectedSuperAdmin } from "@/lib/super-master";
import { logAuditoria } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const canForceLogout = can(
    (session.user.roles ?? []) as never,
    Permissions.USERS_FORCE_LOGOUT as never,
    (session.user.permissions ?? []) as never,
    session.user.superAdmin ?? false
  );
  if (!canForceLogout) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const usuario = await db.usuario.findUnique({ where: { id: params.id } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (session.user.id === usuario.id) {
    return NextResponse.json({ error: "Não é permitido deslogar a própria sessão por esta ação" }, { status: 400 });
  }

  if (isProtectedSuperAdmin(usuario)) {
    return NextResponse.json({ error: "Super administrador não pode ser deslogado por terceiros" }, { status: 400 });
  }

  try {
    await db.$executeRaw`
      UPDATE "Usuario"
      SET "sessaoVersao" = COALESCE("sessaoVersao", 1) + 1
      WHERE "id" = ${usuario.id}
    `;
    await db.$executeRaw`
      DELETE FROM "SessaoAtiva"
      WHERE "usuarioId" = ${usuario.id}
    `;
  } catch {
    return NextResponse.json(
      {
        error:
          "Estrutura de sessão não disponível no banco. Rode as migrations e gere o Prisma Client (npm run prisma:migrate && npm run prisma:generate)."
      },
      { status: 500 }
    );
  }

  await logAuditoria({
    acao: "DESLOGAR",
    entidade: "usuario",
    registroId: usuario.id,
    usuarioId: session.user.id,
    detalhes: { motivo: "deslogar_forcado_admin" }
  });

  return NextResponse.json({ ok: true });
}
