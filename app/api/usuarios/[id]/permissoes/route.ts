import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permissions, type Permission } from "@/lib/permissions";
import { isProtectedSuperAdmin } from "@/lib/super-master";
import { can } from "@/lib/rbac";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const canManage = can(
    (session.user.roles ?? []) as never,
    Permissions.USERS_WRITE as never,
    (session.user.permissions ?? []) as never,
    session.user.superAdmin ?? false
  );
  if (!canManage) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const permissions = Array.isArray(body?.permissions) ? body.permissions : [];

  const usuario = await db.usuario.findUnique({ where: { id: params.id } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (isProtectedSuperAdmin(usuario)) {
    return NextResponse.json({ error: "Super administrador não pode ser alterado" }, { status: 400 });
  }

  const allowedPermissions = new Set<Permission>(Object.values(Permissions));
  const cleanPermissions = permissions.filter(
    (perm: unknown): perm is Permission =>
      typeof perm === "string" && allowedPermissions.has(perm as Permission)
  );

  await db.$transaction([
    db.usuarioPermissao.deleteMany({ where: { usuarioId: params.id } }),
    ...cleanPermissions.map((perm: Permission) =>
      db.usuarioPermissao.create({ data: { usuarioId: params.id, permissao: perm } })
    )
  ]);

  return NextResponse.json({ ok: true });
}
