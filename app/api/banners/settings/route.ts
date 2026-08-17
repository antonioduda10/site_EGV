import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import {
  parseHomeAlerts,
  parseHomeDisplaySettings,
  serializeHomeAlertsConfig
} from "@/lib/home-alerts";
import { getHomeAlertsJson, saveHomeAlertsJson } from "@/lib/home-alerts-config";

function normalizeBannerIntervalMs(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return 5000;
  return Math.min(15000, Math.max(3000, Math.round(numericValue)));
}

export async function GET() {
  const { allowed } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const avisosHomeJson = await getHomeAlertsJson();
  const settings = parseHomeDisplaySettings(avisosHomeJson);

  return NextResponse.json({
    bannerIntervalMs: settings.bannerIntervalMs
  });
}

export async function POST(request: Request) {
  const { allowed } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const bannerIntervalMs = normalizeBannerIntervalMs(body.bannerIntervalMs);
  const avisosHomeJson = await getHomeAlertsJson();
  const alerts = parseHomeAlerts(avisosHomeJson);
  const currentSettings = parseHomeDisplaySettings(avisosHomeJson);
  const existing = await db.configuracaoSite.findFirst({
    select: { id: true },
    orderBy: { atualizadoEm: "desc" }
  });
  const config = existing ?? (await db.configuracaoSite.create({ data: {} }));

  const saved = await saveHomeAlertsJson(
    config.id,
    serializeHomeAlertsConfig(alerts, {
      ...currentSettings,
      bannerIntervalMs
    })
  );

  if (!saved) {
    return NextResponse.json({ error: "Erro ao salvar o tempo do carrossel." }, { status: 500 });
  }

  return NextResponse.json({ bannerIntervalMs });
}
