import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { newPasswordSchema } from "@/lib/validators";
import { withApiErrors } from "@/lib/api-errors";

const schema = z.object({ token: z.string().min(1).max(256), senha: newPasswordSchema });

export const POST = withApiErrors(async (request: Request) => {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const reset = await db.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
    const now = new Date();
    if (!token || token.expiraEm <= now) return false;
    const claimed = await tx.passwordResetToken.deleteMany({ where: { token: parsed.data.token, expiraEm: { gt: now } } });
    if (claimed.count !== 1) return false;
    const senhaHash = await hashPassword(parsed.data.senha);
    await tx.usuario.update({ where: { id: token.usuarioId }, data: { senhaHash, sessaoVersao: { increment: 1 } }, select: { id: true } });
    await tx.passwordResetToken.deleteMany({ where: { usuarioId: token.usuarioId } });
    return true;
  });
  if (!reset) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

  return NextResponse.json({ ok: true });
}, "auth.reset");
