import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { usuarioSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { logAuditoria } from "@/lib/audit";

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
    include: { perfis: { include: { perfil: true } } }
  });
  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
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
    usuario = await db.usuario.create({
      data: {
        nome: parsed.data.nome,
        email: parsed.data.email,
        senhaHash: await hashPassword(parsed.data.senha)
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }
    throw error;
  }

  await db.usuarioPerfil.create({
    data: { usuarioId: usuario.id, perfilId: perfil.id }
  });

  await logAuditoria({
    acao: "CRIAR",
    entidade: "usuario",
    registroId: usuario.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(usuario, { status: 201 });
}
