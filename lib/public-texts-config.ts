import { db } from "@/lib/db";

type PublicTextsRow = {
  textosPublicosJson: string | null;
};

export async function getPublicTextsJson() {
  try {
    const rows = await db.$queryRaw<PublicTextsRow[]>`
      SELECT "textosPublicosJson"
      FROM "ConfiguracaoSite"
      ORDER BY "atualizadoEm" DESC
      LIMIT 1
    `;

    return rows[0]?.textosPublicosJson ?? null;
  } catch {
    return null;
  }
}

export async function savePublicTextsJson(configId: string, value: string | null) {
  try {
    await db.$executeRaw`
      UPDATE "ConfiguracaoSite"
      SET "textosPublicosJson" = ${value}
      WHERE "id" = ${configId}
    `;

    return true;
  } catch {
    return false;
  }
}
