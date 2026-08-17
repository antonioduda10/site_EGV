import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAuditoria } from "@/lib/audit";
import { normalizeUploadAssetUrl } from "@/lib/content-url";
import { deleteFile } from "@/lib/uploads";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { secretariaServidorSchema } from "@/lib/validators";
import type { z } from "zod";

type SecretariaServidorInput = z.infer<typeof secretariaServidorSchema>;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const servidor = await db.secretariaServidor.findUnique({ where: { id: params.id } });
  if (!servidor) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(servidor);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = secretariaServidorSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const servidor = await db.secretariaServidor.update({
    where: { id: params.id },
    data: normalizeSecretariaPatch(parsed.data)
  });

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "secretaria_servidor",
    registroId: servidor.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(servidor);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const servidor = await db.secretariaServidor.findUnique({ where: { id: params.id } });
  if (!servidor) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await db.secretariaServidor.delete({ where: { id: params.id } });
  if (servidor.fotoUrl) {
    await deleteFile(servidor.fotoUrl);
  }

  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "secretaria_servidor",
    registroId: params.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}

function normalizeSecretariaPatch(data: Partial<SecretariaServidorInput>) {
  return {
    nome: data.nome !== undefined ? data.nome.trim() : undefined,
    cargo: data.cargo !== undefined ? data.cargo.trim() : undefined,
    setor: data.setor !== undefined ? data.setor.trim() : undefined,
    descricao: data.descricao !== undefined ? cleanOptional(data.descricao) : undefined,
    fotoUrl: data.fotoUrl !== undefined ? normalizeUploadAssetUrl(data.fotoUrl) || null : undefined,
    email: data.email !== undefined ? cleanOptional(data.email) : undefined,
    telefone: data.telefone !== undefined ? cleanOptional(data.telefone) : undefined,
    ordem: data.ordem !== undefined ? normalizeOrder(data.ordem) : undefined,
    ativo: data.ativo
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
