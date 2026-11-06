import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { usuarioSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { logAuditoria } from "@/lib/audit";
import { safeUserSelect } from "@/lib/safe-user";
import { withApiErrors } from "@/lib/api-errors";

export async function GET() {
  const { allowed, session } = await requirePermission(Permissions.USERS_READ);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const isSuperAdmin = session?.user?.superAdmin ?? false;
  const usuarios = await db.usuario.findMany({
    where: isSuperAdmin
      ? undefined
      : {
          NOT: {
            OR: [{ superAdmin: true }, { email: "admin@egv.edu.br" }]
          }
        },
    select: safeUserSelect
  });
  return NextResponse.json(usuarios);
}

export const POST = withApiErrors(async (request: Request) => {
  const { allowed, session } = await requirePermission(Permissions.USERS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = usuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const perfil = await db.perfil.findUnique({ where: { nome: parsed.data.perfil } });
  if (!perfil) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }

  let usuario;
  try {
    const senhaHash = await hashPassword(parsed.data.senha);
    usuario = await db.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: { nome: parsed.data.nome, email: parsed.data.email, senhaHash },
        select: safeUserSelect
      });
      await tx.usuarioPerfil.create({ data: { usuarioId: created.id, perfilId: perfil.id } });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }
    throw error;
  }

  await logAuditoria({
    acao: "CRIAR",
    entidade: "usuario",
    registroId: usuario.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(usuario, { status: 201 });
}, "usuarios.criar");
