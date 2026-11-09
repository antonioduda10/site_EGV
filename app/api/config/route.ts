import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { hasContentPermission, contentHeaders } from "@/lib/content-access";
import { parseHomeAlerts, parseHomeDisplaySettings, serializeHomeAlertsConfig } from "@/lib/home-alerts";
import { getPublicTextsJson, savePublicTextsJson } from "@/lib/public-texts-config";
import { getHomeAlertsJson } from "@/lib/home-alerts-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await db.configuracaoSite.findFirst({
    orderBy: { atualizadoEm: "desc" },
    select: {
      id: true,
      logoUrl: true,
      corPrimaria: true,
      corSecundaria: true,
      politicaPrivacidade: true,
      cookies: true,
      termos: true,
      botaoHistoriaLink: true,
      botaoHistoriaNovaAba: true,
      menuJson: true,
      acessoRapidoJson: true,
      rodapeJson: true,
      atualizadoEm: true
    }
  });
  const [textosPublicosJson, avisosHomeJson] = await Promise.all([
    getPublicTextsJson(),
    getHomeAlertsJson()
  ]);
  const canManage = await hasContentPermission(Permissions.ALERTS_WRITE);
  const publicAlerts = serializeHomeAlertsConfig(parseHomeAlerts(avisosHomeJson).filter((alert) => alert.ativo !== false), parseHomeDisplaySettings(avisosHomeJson));
  return NextResponse.json(config ? {
    ...config,
    politicaPrivacidade: sanitizeRichHtml(config.politicaPrivacidade),
    cookies: sanitizeRichHtml(config.cookies), termos: sanitizeRichHtml(config.termos),
    textosPublicosJson, avisosHomeJson: canManage ? avisosHomeJson : publicAlerts
  } : null, { headers: contentHeaders });
}

export async function POST(request: Request) {
  const { allowed } = await requirePermission(Permissions.CONFIG_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const existing = await db.configuracaoSite.findFirst({ select: { id: true }, orderBy: { atualizadoEm: "desc" } });

  const data = {
    logoUrl: body.logoUrl ?? null,
    corPrimaria: body.corPrimaria ?? null,
    corSecundaria: body.corSecundaria ?? null,
    politicaPrivacidade: body.politicaPrivacidade ? sanitizeRichHtml(body.politicaPrivacidade) : null,
    cookies: body.cookies ? sanitizeRichHtml(body.cookies) : null,
    termos: body.termos ? sanitizeRichHtml(body.termos) : null,
    botaoHistoriaLink: body.botaoHistoriaLink ?? null,
    botaoHistoriaNovaAba: Boolean(body.botaoHistoriaNovaAba),
    menuJson: body.menuJson ?? null,
    acessoRapidoJson: body.acessoRapidoJson ?? null,
    rodapeJson: body.rodapeJson ?? null
  };

  const config = existing
    ? await db.configuracaoSite.update({ where: { id: existing.id }, data })
    : await db.configuracaoSite.create({ data });
  await savePublicTextsJson(config.id, body.textosPublicosJson ?? null);

  // This endpoint no longer owns notices; ignore stale clients' copies of this JSON.
  const avisosHomeJson = await getHomeAlertsJson();
  const canManageAlerts = await hasContentPermission(Permissions.ALERTS_WRITE);
  const publicAlerts = serializeHomeAlertsConfig(parseHomeAlerts(avisosHomeJson).filter((alert) => alert.ativo !== false), parseHomeDisplaySettings(avisosHomeJson));

  return NextResponse.json({
    ...config,
    textosPublicosJson: body.textosPublicosJson ?? null,
    avisosHomeJson: canManageAlerts ? avisosHomeJson : publicAlerts
  });
}
