import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { usuarioUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { logAuditoria } from "@/lib/audit";
import { isProtectedSuperAdmin } from "@/lib/super-master";
import { Permissions } from "@/lib/permissions";
import { can } from "@/lib/rbac";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const canManageUsers = can(
    (session.user.roles ?? []) as never,
    Permissions.USERS_WRITE as never,
    (session.user.permissions ?? []) as never,
    session.user.superAdmin ?? false
  );
  if (!canManageUsers) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const usuario = await db.usuario.findUnique({ where: { id: params.id } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const isSelf = session.user.id === usuario.id;

  if (isProtectedSuperAdmin(usuario) && !isSelf) {
    return NextResponse.json({ error: "Super administrador não pode ser alterado por terceiros" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = usuarioUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    nome: parsed.data.nome,
    email: parsed.data.email,
    status: parsed.data.status
  };

  let perfilSelecionadoId: string | null = null;
  if (parsed.data.perfil) {
    const perfil = await db.perfil.findUnique({ where: { nome: parsed.data.perfil } });
    if (!perfil) {
      return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    }
    perfilSelecionadoId = perfil.id;
  }

  if (parsed.data.senha) {
    data.senhaHash = await hashPassword(parsed.data.senha);
  }

  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      const usuarioAtualizado = await tx.usuario.update({
        where: { id: usuario.id },
        data
      });

      if (perfilSelecionadoId) {
        await tx.usuarioPerfil.deleteMany({ where: { usuarioId: usuario.id } });
        await tx.usuarioPerfil.create({
          data: {
            usuarioId: usuario.id,
            perfilId: perfilSelecionadoId
          }
        });
      }

      return usuarioAtualizado;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno ao atualizar usuário" }, { status: 500 });
  }

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "usuario",
    registroId: usuario.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const canManageUsers = can(
    (session.user.roles ?? []) as never,
    Permissions.USERS_WRITE as never,
    (session.user.permissions ?? []) as never,
    session.user.superAdmin ?? false
  );
  if (!canManageUsers) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const usuario = await db.usuario.findUnique({ where: { id: params.id } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (session.user.id === usuario.id) {
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });
  }

  if (isProtectedSuperAdmin(usuario)) {
    return NextResponse.json({ error: "Super administrador não pode ser excluído" }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      // Libera vínculos que poderiam bloquear a exclusão do usuário.
      await tx.noticia.updateMany({
        where: { autorId: usuario.id },
        data: { autorId: null }
      });

      await tx.usuarioPerfil.deleteMany({ where: { usuarioId: usuario.id } });
      await tx.usuarioPermissao.deleteMany({ where: { usuarioId: usuario.id } });
      await tx.passwordResetToken.deleteMany({ where: { usuarioId: usuario.id } });

      // A tabela de sessão ativa é opcional (criada em runtime), então limpamos via SQL sem falhar o fluxo.
      try {
        await tx.$executeRaw`
          DELETE FROM "SessaoAtiva"
          WHERE "usuarioId" = ${usuario.id}
        `;
      } catch {
        // Ignora caso a tabela não exista no ambiente atual.
      }

      await tx.usuario.delete({ where: { id: usuario.id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Não foi possível excluir: usuário possui vínculos ativos no sistema." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Erro interno ao excluir usuário" }, { status: 500 });
  }

  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "usuario",
    registroId: usuario.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
