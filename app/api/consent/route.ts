import { NextResponse } from "next/server";
import { consentSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const hash = crypto.createHash("sha256").update(request.headers.get("user-agent") ?? "").digest("hex");
  await db.cookieConsent.create({
    data: {
      identificadorAnonimo: hash,
      essenciais: parsed.data.essenciais,
      analiticos: parsed.data.analiticos,
      marketing: parsed.data.marketing,
      userAgent: request.headers.get("user-agent") ?? null,
      usuarioId: session?.user?.id ?? null
    }
  });

  return NextResponse.json({ ok: true });
}
