import { db } from "@/lib/db";

export function normalizeEventOrderValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export async function reorderEventosByPosition(targetId: string, requestedOrder: number) {
  const eventos = await db.evento.findMany({
    select: { id: true },
    orderBy: [{ ordem: "asc" }, { dataInicio: "asc" }, { id: "asc" }]
  });

  const target = eventos.find((evento) => evento.id === targetId);
  if (!target) return null;

  const outros = eventos.filter((evento) => evento.id !== targetId);
  const position = Math.min(normalizeEventOrderValue(requestedOrder), outros.length);
  const ordenados = [...outros.slice(0, position), target, ...outros.slice(position)];

  await db.$transaction(
    ordenados.map((evento, index) =>
      db.evento.update({
        where: { id: evento.id },
        data: { ordem: index }
      })
    )
  );

  return position;
}

export async function compactEventoOrdens() {
  const eventos = await db.evento.findMany({
    select: { id: true, ordem: true },
    orderBy: [{ ordem: "asc" }, { dataInicio: "asc" }, { id: "asc" }]
  });

  const updates = eventos.flatMap((evento, index) =>
    evento.ordem === index
      ? []
      : [
          db.evento.update({
            where: { id: evento.id },
            data: { ordem: index }
          })
        ]
  );

  if (updates.length > 0) {
    await db.$transaction(updates);
  }
}
