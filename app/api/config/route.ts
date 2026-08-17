import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { getPublicTextsJson, savePublicTextsJson } from "@/lib/public-texts-config";
import { getHomeAlertsJson, saveHomeAlertsJson } from "@/lib/home-alerts-config";

export async function GET() {
  const config = await db.configuracaoSite.findFirst({
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
  return NextResponse.json(config ? { ...config, textosPublicosJson, avisosHomeJson } : null);
}

export async function POST(request: Request) {
  const { allowed } = await requirePermission(Permissions.CONFIG_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const existing = await db.configuracaoSite.findFirst({ select: { id: true } });

  const data = {
    logoUrl: body.logoUrl ?? null,
    corPrimaria: body.corPrimaria ?? null,
    corSecundaria: body.corSecundaria ?? null,
    politicaPrivacidade: body.politicaPrivacidade ? rewriteUploadUrlsInHtml(body.politicaPrivacidade) : null,
    cookies: body.cookies ? rewriteUploadUrlsInHtml(body.cookies) : null,
    termos: body.termos ? rewriteUploadUrlsInHtml(body.termos) : null,
    botaoHistoriaLink: body.botaoHistoriaLink ?? null,
    botaoHistoriaNovaAba: Boolean(body.botaoHistoriaNovaAba),
    menuJson: body.menuJson ?? null,
    acessoRapidoJson: body.acessoRapidoJson ?? null,
    rodapeJson: body.rodapeJson ?? null
  };

  const config = existing
    ? await db.configuracaoSite.update({ where: { id: existing.id }, data })
    : await db.configuracaoSite.create({ data });
  await Promise.all([
    savePublicTextsJson(config.id, body.textosPublicosJson ?? null),
    saveHomeAlertsJson(config.id, body.avisosHomeJson ?? null)
  ]);

  return NextResponse.json({
    ...config,
    textosPublicosJson: body.textosPublicosJson ?? null,
    avisosHomeJson: body.avisosHomeJson ?? null
  });
}
