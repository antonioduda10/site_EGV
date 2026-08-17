import { db } from "@/lib/db";

type HomeAlertsRow = {
  avisosHomeJson: string | null;
};

export async function getHomeAlertsJson() {
  try {
    const rows = await db.$queryRaw<HomeAlertsRow[]>`
      SELECT "avisosHomeJson"
      FROM "ConfiguracaoSite"
      ORDER BY "atualizadoEm" DESC
      LIMIT 1
    `;

    return rows[0]?.avisosHomeJson ?? null;
  } catch {
    return null;
  }
}

export async function saveHomeAlertsJson(configId: string, value: string | null) {
  try {
    await db.$executeRaw`
      UPDATE "ConfiguracaoSite"
      SET "avisosHomeJson" = ${value}
      WHERE "id" = ${configId}
    `;

    return true;
  } catch {
    return false;
  }
}
