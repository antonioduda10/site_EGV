import { NextResponse } from "next/server";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import {
  HomeAlertsError,
  updateHomeAlertsConfig,
} from "@/lib/home-alerts-config";
import {
  homeAlertIdSchema,
  homeAlertPatchSchema,
  isHomeAlertsSameOrigin,
} from "@/lib/home-alerts-validation";
import { withApiErrors } from "@/lib/api-errors";
import { contentHeaders } from "@/lib/content-access";
import { logAuditoria } from "@/lib/audit";
import type { ManagedHomeAlert } from "@/lib/home-alerts";

type Context = { params: { id: string } };

export const PATCH = withApiErrors(
  async (request: Request, { params }: Context) => {
    const { allowed, session } = await requirePermission(
      Permissions.ALERTS_WRITE,
    );
    if (!allowed || !isHomeAlertsSameOrigin(request))
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    const input = homeAlertPatchSchema.safeParse(await request.json());
    if (!homeAlertIdSchema.safeParse(params.id).success || !input.success)
      return NextResponse.json(
        { error: "Dados do aviso invalidos." },
        { status: 400 },
      );
    let changed: ManagedHomeAlert | undefined;
    const result = await updateHomeAlertsConfig((current) => {
      const alerts = [...current.alerts];
      const index = alerts.findIndex((alert) => alert.id === params.id);
      if (index < 0) throw new HomeAlertsError("Aviso nao encontrado.", 404);
      const now = new Date().toISOString();
      if ("mover" in input.data) {
        const target = index + (input.data.mover === "subir" ? -1 : 1);
        if (target >= 0 && target < alerts.length) {
          [alerts[index], alerts[target]] = [
            { ...alerts[target], atualizadoEm: now },
            { ...alerts[index], atualizadoEm: now },
          ];
        }
        changed = alerts.find((alert) => alert.id === params.id);
      } else {
        changed = { ...alerts[index], ...input.data, atualizadoEm: now };
        alerts[index] = changed;
      }
      return { ...current, alerts };
    });
    await logAuditoria({
      acao: "ATUALIZAR",
      entidade: "Aviso",
      registroId: params.id,
      usuarioId: session?.user.id,
    }).catch(() => undefined);
    return NextResponse.json(
      { alert: changed, alerts: result.alerts },
      { headers: contentHeaders },
    );
  },
  "avisos.editar",
);

export const DELETE = withApiErrors(
  async (request: Request, { params }: Context) => {
    const { allowed, session } = await requirePermission(
      Permissions.ALERTS_WRITE,
    );
    if (!allowed || !isHomeAlertsSameOrigin(request))
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    if (!homeAlertIdSchema.safeParse(params.id).success)
      return NextResponse.json(
        { error: "Identificador invalido." },
        { status: 400 },
      );
    const result = await updateHomeAlertsConfig((current) => {
      if (!current.alerts.some((alert) => alert.id === params.id))
        throw new HomeAlertsError("Aviso nao encontrado.", 404);
      return {
        ...current,
        alerts: current.alerts.filter((alert) => alert.id !== params.id),
      };
    });
    await logAuditoria({
      acao: "EXCLUIR",
      entidade: "Aviso",
      registroId: params.id,
      usuarioId: session?.user.id,
    }).catch(() => undefined);
    return NextResponse.json(
      { ok: true, alerts: result.alerts },
      { headers: contentHeaders },
    );
  },
  "avisos.excluir",
);
