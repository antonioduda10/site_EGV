import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { contentHeaders } from "@/lib/content-access";
import {
  getManagedHomeAlertsConfig,
  updateHomeAlertsConfig,
} from "@/lib/home-alerts-config";
import {
  homeAlertInputSchema,
  isHomeAlertsSameOrigin,
} from "@/lib/home-alerts-validation";
import { withApiErrors } from "@/lib/api-errors";
import { logAuditoria } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApiErrors(async () => {
  const { allowed } = await requirePermission(Permissions.ALERTS_WRITE);
  if (!allowed)
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  return NextResponse.json(await getManagedHomeAlertsConfig(), {
    headers: contentHeaders,
  });
}, "avisos.listar");

export const POST = withApiErrors(async (request: Request) => {
  const { allowed, session } = await requirePermission(
    Permissions.ALERTS_WRITE,
  );
  if (!allowed || !isHomeAlertsSameOrigin(request))
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const input = homeAlertInputSchema.safeParse(await request.json());
  if (!input.success)
    return NextResponse.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );
  const now = new Date().toISOString();
  const alert = {
    ...input.data,
    id: randomUUID(),
    criadoEm: now,
    atualizadoEm: now,
  };
  const result = await updateHomeAlertsConfig((current) => ({
    ...current,
    alerts: [...current.alerts, alert],
  }));
  await logAuditoria({
    acao: "CRIAR",
    entidade: "Aviso",
    registroId: alert.id,
    usuarioId: session?.user.id,
  }).catch(() => undefined);
  return NextResponse.json(
    { alert, alerts: result.alerts },
    { status: 201, headers: contentHeaders },
  );
}, "avisos.criar");
