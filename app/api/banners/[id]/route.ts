import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { uploadFile, deleteFile } from "@/lib/uploads";
import { hasContentPermission, contentHeaders } from "@/lib/content-access";
import { withApiErrors } from "@/lib/api-errors";

// Tipos de imagem permitidos para banners.
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const banner = await db.banner.findUnique({ where: { id: params.id } });
  if (!banner || (!banner.ativo && !await hasContentPermission(Permissions.BANNERS_WRITE))) {
    return NextResponse.json({ error: "Banner não encontrado" }, { status: 404 });
  }
  return NextResponse.json(banner, { headers: contentHeaders });
}

export const PATCH = withApiErrors(async (request: Request, { params }: { params: { id: string } }) => {
  // Protege edicao por permissao de paginas.
  const { allowed, session } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const banner = await db.banner.findUnique({ where: { id: params.id } });
  if (!banner) {
    return NextResponse.json({ error: "Banner não encontrado" }, { status: 404 });
  }

  // Le dados do formulario e imagem opcional.
  const formData = await request.formData();
  const titulo = formData.get("titulo") as string;
  const descricao = formData.get("descricao") as string;
  const link = formData.get("link") as string;
  const ordem = parseInt(formData.get("ordem") as string) || 0;
  const ativo = formData.get("ativo") === "true";
  const imagem = formData.get("imagem") as File;

  // Troca a imagem apenas se uma nova foi enviada.
  let imagemPath = banner.imagem;
  if (imagem && imagem.size > 0) {
    if (!allowedTypes.includes(imagem.type)) {
      return NextResponse.json({ error: "Tipo de imagem inválido (use JPG, PNG ou WebP)" }, { status: 400 });
    }
    imagemPath = await uploadFile(imagem, "banners");
  }

  const updated = await db.banner.update({
    where: { id: params.id },
    data: {
      titulo,
      descricao,
      imagem: imagemPath,
      link,
      ordem,
      ativo
    }
  });

  if (imagemPath !== banner.imagem) await deleteFile(banner.imagem);
  return NextResponse.json(updated);
}, "banners.editar");

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Exclusao exige permissao de paginas.
  const { allowed, session } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const banner = await db.banner.findUnique({ where: { id: params.id } });
  if (!banner) {
    return NextResponse.json({ error: "Banner não encontrado" }, { status: 404 });
  }

  // Remove arquivo antes de apagar o registro.
  await deleteFile(banner.imagem);
  await db.banner.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
