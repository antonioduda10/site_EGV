import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id || session.invalidated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const usuario = await db.usuario.findUnique({
    where: { id: session.user.id },
    include: {
      perfis: { include: { perfil: true } },
      permissoes: true
    }
  });

  if (!usuario) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const roles = usuario.perfis.map((item) => item.perfil.nome).sort();
  const manualPermissions = usuario.permissoes.map((item) => item.permissao).sort();
  const stateKey = JSON.stringify({
    superAdmin: Boolean(usuario.superAdmin),
    roles,
    manualPermissions
  });

  return NextResponse.json({ ok: true, stateKey });
}
