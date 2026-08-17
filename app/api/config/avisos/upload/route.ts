import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { uploadFile } from "@/lib/uploads";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const { allowed } = await requirePermission(Permissions.CONFIG_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;

  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo invalido" }, { status: 400 });
  }

  if (!allowedTypes.includes(arquivo.type)) {
    return NextResponse.json({ error: "Tipo de arquivo invalido (use JPG, PNG ou WebP)" }, { status: 400 });
  }

  const url = await uploadFile(arquivo, "config/avisos");
  return NextResponse.json({ url }, { status: 201 });
}
