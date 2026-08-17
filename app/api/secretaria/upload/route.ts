import { NextResponse } from "next/server";
import { logAuditoria } from "@/lib/audit";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { uploadFile } from "@/lib/uploads";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }

  if (!allowedTypes.includes(arquivo.type)) {
    return NextResponse.json({ error: "Tipo de imagem inválido. Use JPG, PNG ou WebP." }, { status: 400 });
  }

  const url = await uploadFile(arquivo, "secretaria");

  await logAuditoria({
    acao: "UPLOAD",
    entidade: "secretaria_foto",
    registroId: "-",
    usuarioId: session.user.id
  });

  return NextResponse.json({ url }, { status: 201 });
}
