import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { uploadFile, deleteFile } from "@/lib/uploads";

// Tipos de imagem permitidos para banners.
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function GET() {
  const banners = await db.banner.findMany({
    orderBy: { ordem: "asc" }
  });
  return NextResponse.json(banners);
}

export async function POST(request: Request) {
  // Protege criacao por permissao de paginas.
  const { allowed, session } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Le formulario multipart com dados e imagem.
  const formData = await request.formData();
  const titulo = formData.get("titulo") as string;
  const descricao = formData.get("descricao") as string;
  const link = formData.get("link") as string;
  const ordem = parseInt(formData.get("ordem") as string) || 0;
  const ativo = formData.get("ativo") === "true";
  const imagem = formData.get("imagem") as File;

  if (!titulo || !imagem) {
    return NextResponse.json({ error: "Título e imagem são obrigatórios" }, { status: 400 });
  }

  // Valida tipo da imagem enviada.
  if (!allowedTypes.includes(imagem.type)) {
    return NextResponse.json({ error: "Tipo de imagem inválido (use JPG, PNG ou WebP)" }, { status: 400 });
  }

  // Salva em pasta dedicada de banners.
  const imagemPath = await uploadFile(imagem, "banners");

  const banner = await db.banner.create({
    data: {
      titulo,
      descricao,
      imagem: imagemPath,
      link,
      ordem,
      ativo
    }
  });

  return NextResponse.json(banner, { status: 201 });
}
