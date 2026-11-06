import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAuditoria } from "@/lib/audit";
import fs from "fs/promises";
import path from "path";
import { resolvePathInsideUploads, assertRealUploadPath } from "@/lib/upload-path";
import { hasContentPermission, contentHeaders } from "@/lib/content-access";
import { Permissions } from "@/lib/permissions";
import { verifiedStoredMime } from "@/lib/upload-policy";

// Diretório base para localizar arquivos salvos.

// Fallback de extensao quando o caminho nao traz sufixo.
const mimeToExt: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "image/jpeg": ".jpg",
  "image/png": ".png"
};

// Normaliza nome para evitar caracteres problemáticos no download.
function safeDownloadName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const doc = await db.arquivoDocumento.findUnique({ where: { id: params.id } });
  if (!doc || (doc.status !== "ATIVO" && !await hasContentPermission(Permissions.DOCS_WRITE))) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  // Aceita caminhos antigos e converte para caminho real.
  let file: Buffer;
  try {
    const filePath = await assertRealUploadPath(resolvePathInsideUploads(doc.caminho));
    file = await fs.readFile(filePath);
  } catch { return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 }); }
  const verifiedType = await verifiedStoredMime(file, path.extname(doc.caminho));
  if (!verifiedType || verifiedType !== doc.tipo || !Object.hasOwn(mimeToExt, verifiedType)) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  // Auditoria de download (sem usuario por ser publico).
  await logAuditoria({
    acao: "DOWNLOAD",
    entidade: "documento",
    registroId: doc.id
  });
  const extFromPath = path.extname(doc.caminho || "");
  const extFromMime = mimeToExt[doc.tipo] ?? "";
  const ext = extFromPath || extFromMime;
  const baseName = doc.nome?.replace(/["\\/\r\n]+/g, " ").trim() || "documento";
  const safeBaseName = safeDownloadName(baseName) || "documento";
  const filename = `${safeBaseName}${ext}`;

  return new NextResponse(file, {
    headers: {
      ...contentHeaders,
      "X-Content-Type-Options": "nosniff",
      "Content-Type": verifiedType,
      "Content-Disposition": `attachment; filename=\"${filename}\"; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}
