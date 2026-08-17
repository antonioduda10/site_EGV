import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await db.usuario.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = crypto.randomUUID();
    await db.passwordResetToken.create({
      data: {
        token,
        usuarioId: user.id,
        expiraEm: new Date(Date.now() + 1000 * 60 * 60)
      }
    });
  }

  return NextResponse.json({ ok: true });
}
