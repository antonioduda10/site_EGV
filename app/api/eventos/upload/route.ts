import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { uploadFile } from "@/lib/uploads";
import { logAuditoria } from "@/lib/audit";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const { allowed, session } = await requirePermission(Permissions.EVENTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo invalido" }, { status: 400 });
  }

  if (!allowedTypes.includes(arquivo.type)) {
    return NextResponse.json({ error: "Tipo de arquivo invalido" }, { status: 400 });
  }

  const url = await uploadFile(arquivo, "eventos");

  await logAuditoria({
    acao: "UPLOAD",
    entidade: "evento_imagem",
    registroId: "-",
    usuarioId: session.user.id
  });

  return NextResponse.json({ url }, { status: 201 });
}
