import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Base de uploads isolada para validar o caminho final.
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

// Mapeia extensões para Content-Type ao servir arquivos.
const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".ogv": "video/ogg"
};

export async function GET(_: Request, { params }: { params: { path: string[] } }) {
  const segments = params.path || [];
  // Resolve o caminho e impede traversal fora da pasta de uploads.
  const filePath = path.resolve(uploadDir, ...segments);

  const relativePath = path.relative(uploadDir, filePath);
  if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
