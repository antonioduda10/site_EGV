import { db } from "@/lib/db";
import { parseHomeAlerts, parseHomeDisplaySettings, parseManagedHomeAlerts, serializeHomeAlertsConfig, type HomeAlertsConfig } from "./home-alerts";

type HomeAlertsRow = {
  avisosHomeJson: string | null;
};

export class HomeAlertsError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) { super(message); }
}

function readConfig(value: string | null): HomeAlertsConfig {
  if (value) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") throw new Error();
      let alerts: unknown = parsed;
      if (!Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        alerts = record.alerts ?? record.avisos ?? record.itens;
        if (alerts !== undefined && !Array.isArray(alerts)) throw new Error();
      }
      if (Array.isArray(alerts) && parseHomeAlerts(value).length !== alerts.length) throw new Error();
    } catch {
      throw new HomeAlertsError("Os avisos existentes precisam ser revisados antes de salvar. Nenhum dado foi substituido.", 409);
    }
  }
  return { alerts: parseManagedHomeAlerts(value), settings: parseHomeDisplaySettings(value) };
}

export async function getManagedHomeAlertsConfig(): Promise<HomeAlertsConfig> {
  const rows = await db.$queryRaw<HomeAlertsRow[]>`
    SELECT "avisosHomeJson" FROM "ConfiguracaoSite" ORDER BY "atualizadoEm" DESC LIMIT 1
  `;
  return readConfig(rows[0]?.avisosHomeJson ?? null);
}

export async function updateHomeAlertsConfig(update: (current: HomeAlertsConfig) => HomeAlertsConfig) {
  return db.$transaction(async (tx) => {
    // Notices and banner timing share one JSON field; serialize their read-modify-write operations.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1924801201)::text`;
    const existing = await tx.configuracaoSite.findFirst({
      select: { id: true, avisosHomeJson: true }, orderBy: { atualizadoEm: "desc" }
    });
    const next = update(readConfig(existing?.avisosHomeJson ?? null));
    const value = serializeHomeAlertsConfig(next.alerts, next.settings);
    if (existing) await tx.configuracaoSite.update({ where: { id: existing.id }, data: { avisosHomeJson: value } });
    else await tx.configuracaoSite.create({ data: { avisosHomeJson: value } });
    return next;
  });
}

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
