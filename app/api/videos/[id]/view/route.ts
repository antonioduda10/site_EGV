import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const video = await db.videoGaleria.update({
    where: { id: params.id },
    data: { visualizacoes: { increment: 1 } }
  });

  return NextResponse.json({ visualizacoes: video.visualizacoes });
}
