import { describe, expect, it, vi } from "vitest";
import {
  parseHomeAlerts,
  parseManagedHomeAlerts,
  parseHomeDisplaySettings,
  serializeHomeAlertsConfig,
} from "@/lib/home-alerts";
import {
  homeAlertInputSchema,
  homeAlertPatchSchema,
  homeAlertSettingsSchema,
  isHomeAlertsSameOrigin,
} from "@/lib/home-alerts-validation";
import {
  grantLegacyAlertPermissions,
  legacyAlertPermissionPlan,
} from "@/lib/alerts-permission";
import { can, getPermissionsForRoles } from "@/lib/rbac";
import { Permissions as P } from "@/lib/permissions";

const alert = {
  titulo: "Reuniao escolar",
  descricao: "Encontro da comunidade",
  ativo: true,
  imagemUrl: "/api/uploads/config/avisos/teste.png",
  href: "/eventos",
};

describe("Compatibilidade dos avisos e permissoes", () => {
  it.each([
    JSON.stringify([alert]),
    JSON.stringify({ alerts: [alert] }),
    JSON.stringify({ avisos: [alert] }),
    JSON.stringify({ itens: [alert] }),
  ])("le formatos anteriores sem exigir escrita ou migration", (value) => {
    expect(parseHomeAlerts(value)).toEqual([alert]);
    expect(parseManagedHomeAlerts(value)).toEqual([
      { ...alert, id: "legacy-1" },
    ]);
    expect(parseManagedHomeAlerts(value)[0]).not.toHaveProperty("criadoEm");
  });
  it("mantem ids, datas confiaveis, ordem e intervalo dos banners ao salvar", () => {
    const date = "2026-11-09T10:00:00.000Z";
    const alerts = [
      { ...alert, id: "first", criadoEm: date, atualizadoEm: date },
      { ...alert, id: "second", ativo: false },
    ];
    const value = serializeHomeAlertsConfig(alerts, {
      alertAnimationEnabled: false,
      alertAnimationSpeed: "slow",
      bannerIntervalMs: 9000,
    });
    expect(parseManagedHomeAlerts(value)).toEqual(alerts);
    expect(parseHomeDisplaySettings(value).bannerIntervalMs).toBe(9000);
  });
  it("nao inventa datas para registros antigos ou aceita datas corrompidas", () => {
    const [record] = parseManagedHomeAlerts(
      JSON.stringify([
        { ...alert, criadoEm: "ontem", atualizadoEm: "2026-99-99T00:00:00Z" },
      ]),
    );
    expect(record).not.toHaveProperty("criadoEm");
    expect(record).not.toHaveProperty("atualizadoEm");
  });
  it("atribui identificadores distintos mesmo quando registros antigos possuem id repetido", () => {
    const alerts = parseManagedHomeAlerts(
      JSON.stringify([
        { ...alert, id: "legacy-2" },
        { ...alert, id: "legacy-2" },
        alert,
      ]),
    );
    expect(new Set(alerts.map((item) => item.id)).size).toBe(3);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.invalid",
    "\\example.invalid",
  ])("rejeita protocolos perigosos em links e imagens: %s", (value) => {
    expect(
      homeAlertInputSchema.safeParse({ ...alert, href: value }).success,
    ).toBe(false);
    expect(
      homeAlertInputSchema.safeParse({ ...alert, imagemUrl: value }).success,
    ).toBe(false);
  });
  it("valida campos, status e impede alterar ids/datas pelo payload", () => {
    for (const input of [
      { ...alert, titulo: "", descricao: "" },
      { ...alert, ativo: "true" },
      { ...alert, id: "override" },
      { ...alert, criadoEm: "2026-11-09" },
    ])
      expect(homeAlertInputSchema.safeParse(input).success).toBe(false);
    expect(homeAlertPatchSchema.safeParse({ ativo: false }).success).toBe(true);
    expect(homeAlertPatchSchema.safeParse({ mover: "subir" }).success).toBe(
      true,
    );
    expect(
      homeAlertSettingsSchema.safeParse({
        alertAnimationEnabled: true,
        alertAnimationSpeed: "normal",
        bannerIntervalMs: 3000,
      }).success,
    ).toBe(false);
  });
  it("preserva o formato legitimo anterior com somente descricao", () => {
    expect(
      homeAlertInputSchema.safeParse({
        titulo: "",
        descricao: "Comunicado sem titulo",
      }).success,
    ).toBe(true);
    expect(
      homeAlertInputSchema.safeParse({ titulo: "", descricao: "" }).success,
    ).toBe(false);
  });
  it("nega operacao de outra origem e aceita mesma origem ou comando autenticado sem Origin", () => {
    expect(
      isHomeAlertsSameOrigin(
        new Request("http://localhost/api/avisos", {
          headers: { origin: "https://other.example.invalid" },
        }),
      ),
    ).toBe(false);
    expect(
      isHomeAlertsSameOrigin(
        new Request("http://localhost/api/avisos", {
          headers: { origin: "http://localhost" },
        }),
      ),
    ).toBe(true);
    expect(
      isHomeAlertsSameOrigin(new Request("http://localhost/api/avisos")),
    ).toBe(true);
  });
  it("Admin, superadministrador e perfis que ja gerenciavam configuracoes mantem acesso", () => {
    for (const role of ["Admin", "Direção", "Secretaria"] as const)
      expect(getPermissionsForRoles([role])).toContain(P.ALERTS_WRITE);
    expect(can([], P.ALERTS_WRITE, [P.INTERNAL_NO_PERMISSIONS], true)).toBe(
      true,
    );
  });
  it("permissao especifica e independente de configuracoes e listas manuais continuam autoritativas", () => {
    expect(can([], P.ALERTS_WRITE, [P.ALERTS_WRITE])).toBe(true);
    expect(can([], P.CONFIG_WRITE, [P.ALERTS_WRITE])).toBe(false);
    expect(can(["Admin"], P.ALERTS_WRITE, [P.CONFIG_WRITE])).toBe(false);
    expect(can(["Admin"], P.ALERTS_WRITE, [P.INTERNAL_NO_PERMISSIONS])).toBe(
      false,
    );
    expect(can(["Docente"], P.ALERTS_WRITE)).toBe(false);
  });
  it("compatibilidade acrescenta apenas a permissao equivalente nas listas manuais e e idempotente", async () => {
    const rows = [
      { usuarioId: "config-user", permissao: P.CONFIG_WRITE },
      { usuarioId: "already", permissao: P.CONFIG_WRITE },
      { usuarioId: "already", permissao: P.ALERTS_WRITE },
    ];
    const store = {
      usuarioPermissao: {
        findMany: vi.fn().mockImplementation(async () => [...rows]),
        createMany: vi.fn().mockImplementation(async ({ data }) => {
          rows.push(...data);
          return { count: data.length };
        }),
      },
    };
    expect(await legacyAlertPermissionPlan(store)).toEqual(["config-user"]);
    expect(await grantLegacyAlertPermissions(store)).toEqual({ count: 1 });
    expect(store.usuarioPermissao.createMany).toHaveBeenCalledWith({
      data: [{ usuarioId: "config-user", permissao: P.ALERTS_WRITE }],
      skipDuplicates: true,
    });
    expect(await grantLegacyAlertPermissions(store)).toEqual({ count: 0 });
    expect(store.usuarioPermissao.createMany).toHaveBeenCalledTimes(1);
    expect(rows.filter((row) => row.permissao === P.CONFIG_WRITE)).toHaveLength(
      2,
    );
  });
});
