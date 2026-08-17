import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const caminho = String(body?.caminho ?? "");
  if (!caminho) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await db.pageView.create({
    data: { caminho }
  });

  return NextResponse.json({ ok: true });
}
