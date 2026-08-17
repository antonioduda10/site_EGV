import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hashPassword } from "@/lib/password";

const schema = z.object({ token: z.string(), senha: z.string().min(6) });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const token = await db.passwordResetToken.findUnique({
    where: { token: parsed.data.token }
  });

  if (!token || token.expiraEm < new Date()) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const senhaHash = await hashPassword(parsed.data.senha);
  await db.usuario.update({
    where: { id: token.usuarioId },
    data: { senhaHash }
  });

  await db.passwordResetToken.delete({ where: { token: parsed.data.token } });

  return NextResponse.json({ ok: true });
}
