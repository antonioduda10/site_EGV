import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { uploadFile } from "@/lib/uploads";
import { logAuditoria } from "@/lib/audit";

// Tipos permitidos para upload de documentos.
const allowedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png"
];

export async function GET() {
  const documentos = await db.arquivoDocumento.findMany({
    orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }]
  });
  return NextResponse.json(documentos);
}

export async function POST(request: Request) {
  // Protege upload por permissao.
  const { allowed, session } = await requirePermission(Permissions.DOCS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Le formulario multipart com dados e arquivo.
  const formData = await request.formData();
  const nome = String(formData.get("nome") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const ano = Number(formData.get("ano") ?? 0);
  const descricao = String(formData.get("descricao") ?? "");
  const ordem = Number(formData.get("ordem") ?? 0);
  const arquivo = formData.get("arquivo") as File | null;

  if (!nome || !categoria || !ano || !arquivo) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Valida tipo para evitar uploads indevidos.
  if (!allowedTypes.includes(arquivo.type)) {
    return NextResponse.json({ error: "Tipo de arquivo inválido" }, { status: 400 });
  }

  // Limite simples de tamanho para upload.
  if (arquivo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo excede 10MB" }, { status: 400 });
  }

  const filepath = await uploadFile(arquivo, "documentos");

  // Mantem historico de versoes por nome/categoria/ano.
  const lastVersion = await db.arquivoDocumento.findFirst({
    where: { nome, categoria, ano },
    orderBy: { versao: "desc" }
  });

  const documento = await db.arquivoDocumento.create({
    data: {
      nome,
      categoria,
      ano,
      descricao,
      ordem: Number.isFinite(ordem) ? ordem : 0,
      caminho: filepath,
      tipo: arquivo.type,
      tamanho: arquivo.size,
      versao: lastVersion ? lastVersion.versao + 1 : 1,
      status: "ATIVO"
    }
  });

  // Registra auditoria do upload.
  await logAuditoria({
    acao: "UPLOAD",
    entidade: "documento",
    registroId: documento.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(documento, { status: 201 });
}
