import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { updateHomeAlertsConfig } from "@/lib/home-alerts-config";
import {
  homeAlertSettingsSchema,
  isHomeAlertsSameOrigin,
} from "@/lib/home-alerts-validation";
import { withApiErrors } from "@/lib/api-errors";
import { contentHeaders } from "@/lib/content-access";
import { logAuditoria } from "@/lib/audit";

export const POST = withApiErrors(async (request: Request) => {
  const { allowed, session } = await requirePermission(
    Permissions.ALERTS_WRITE,
  );
  if (!allowed || !isHomeAlertsSameOrigin(request))
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const input = homeAlertSettingsSchema.safeParse(await request.json());
  if (!input.success)
    return NextResponse.json(
      { error: "Configuracao de animacao invalida." },
      { status: 400 },
    );
  const current = await updateHomeAlertsConfig((config) => ({
    ...config,
    settings: { ...config.settings, ...input.data },
  }));
  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "Avisos",
    usuarioId: session?.user.id,
    detalhes: input.data,
  }).catch(() => undefined);
  return NextResponse.json(
    { settings: current.settings },
    { headers: contentHeaders },
  );
}, "avisos.animacao");
