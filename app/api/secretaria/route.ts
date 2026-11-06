import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { logAuditoria } from "@/lib/audit";
import { normalizeUploadAssetUrl } from "@/lib/content-url";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { secretariaServidorSchema } from "@/lib/validators";
import type { z } from "zod";
import { hasContentPermission, contentHeaders } from "@/lib/content-access";

type SecretariaServidorInput = z.infer<typeof secretariaServidorSchema>;

export async function GET() {
  const servidores = await db.secretariaServidor.findMany({
    where: await hasContentPermission(Permissions.PAGES_WRITE) ? undefined : { ativo: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }]
  });

  return NextResponse.json(servidores, { headers: contentHeaders });
}

export async function POST(request: Request) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = secretariaServidorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const servidor = await db.secretariaServidor.create({
    data: normalizeSecretariaData(parsed.data)
  });

  await logAuditoria({
    acao: "CRIAR",
    entidade: "secretaria_servidor",
    registroId: servidor.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(servidor, { status: 201 });
}

function normalizeSecretariaData(data: SecretariaServidorInput) {
  return {
    nome: data.nome.trim(),
    cargo: data.cargo.trim(),
    setor: data.setor.trim(),
    descricao: cleanOptional(data.descricao),
    fotoUrl: normalizeUploadAssetUrl(data.fotoUrl) || null,
    email: cleanOptional(data.email),
    telefone: cleanOptional(data.telefone),
    ordem: normalizeOrder(data.ordem),
    ativo: data.ativo ?? true
  };
}

function cleanOptional(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function normalizeOrder(value?: number) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}
