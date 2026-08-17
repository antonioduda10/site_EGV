import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await db.usuario.findUnique({
    where: { email: parsed.data.email }
  });

  if (!user) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.senha, user.senhaHash);
  if (!valid) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, id: user.id });
}
