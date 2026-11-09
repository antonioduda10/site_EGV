import { NextResponse } from "next/server";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import {
  parseHomeDisplaySettings
} from "@/lib/home-alerts";
import { getHomeAlertsJson, updateHomeAlertsConfig } from "@/lib/home-alerts-config";
import { withApiErrors } from "@/lib/api-errors";

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

export const POST = withApiErrors(async (request: Request) => {
  const { allowed } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const bannerIntervalMs = normalizeBannerIntervalMs(body.bannerIntervalMs);
  await updateHomeAlertsConfig((current) => ({ ...current, settings: { ...current.settings, bannerIntervalMs } }));

  return NextResponse.json({ bannerIntervalMs });
}, "banners.tempo");
