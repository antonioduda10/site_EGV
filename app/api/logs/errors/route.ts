import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { logErrorEvent } from "@/lib/error-log";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.invalidated || !session.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const entry = await logErrorEvent({
    source: "dashboard",
    action: asString(body.action),
    method: asString(body.method),
    path: normalizePath(asString(body.path) ?? asString(body.url)),
    status: asNumber(body.status),
    message: "Falha registrada no painel",
    usuarioId: session.user.id,
    usuarioNome: undefined,
    detalhes: {
      page: normalizePath(asString(body.page)),
      type: "HTTP_ERROR"
    }
  });

  return NextResponse.json({ ok: true, id: entry.id });
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizePath(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, "http://localhost");
    return url.pathname;
  } catch {
    return undefined;
  }
}
