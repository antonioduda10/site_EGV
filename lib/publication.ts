import type { Prisma } from "@prisma/client";

export function publicNewsWhere(now = new Date()): Prisma.NoticiaWhereInput {
  return { status: "PUBLICADO", OR: [{ dataPublicacao: null }, { dataPublicacao: { lte: now } }] };
}

export function isNewsPublic(record: { status: string; dataPublicacao?: Date | string | null }, now = new Date()) {
  return record.status === "PUBLICADO" && (!record.dataPublicacao || new Date(record.dataPublicacao) <= now);
}
