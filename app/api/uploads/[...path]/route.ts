import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { resolvePathInsideUploads, assertRealUploadPath } from "@/lib/upload-path";
import { canReadUpload } from "@/lib/upload-access";
import { verifiedStoredMime } from "@/lib/upload-policy";

export async function GET(_: Request, { params }: { params: { path: string[] } }) {
  const segments = params.path || [];
  // Resolve o caminho e impede traversal fora da pasta de uploads.
  let filePath: string;
  try { filePath = resolvePathInsideUploads(segments.join("/")); }
  catch {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  try {
    if (!await canReadUpload(filePath)) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    const checkedPath = await assertRealUploadPath(filePath);
    const file = await fs.readFile(checkedPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = await verifiedStoredMime(file, ext);
    if (!contentType) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(!/^(?:image|audio|video)\//.test(contentType) ? { "Content-Disposition": "attachment" } : {})
      }
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
