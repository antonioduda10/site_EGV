import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET, POST } from "@/app/api/avisos/route";
import { PATCH, DELETE } from "@/app/api/avisos/[id]/route";
import { POST as settings } from "@/app/api/avisos/settings/route";
import { POST as upload } from "@/app/api/avisos/upload/route";
import { POST as legacyUpload } from "@/app/api/config/avisos/upload/route";
import { GET as getConfig, POST as saveConfig } from "@/app/api/config/route";
import { POST as bannerSettings } from "@/app/api/banners/settings/route";
import { uploadFile } from "@/lib/uploads";
import {
  parseHomeAlerts,
  parseHomeDisplaySettings,
  serializeHomeAlertsConfig,
} from "@/lib/home-alerts";
import { Permissions as P } from "@/lib/permissions";
import { dbMock } from "../mocks/db";
import { jsonRequest, testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/uploads", () => ({ uploadFile: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

const record = {
  id: "first",
  titulo: "Reuniao de teste",
  descricao: "Conteudo ficticio",
  href: "/eventos",
  imagemUrl: "",
  ativo: true,
};
const second = {
  ...record,
  id: "second",
  titulo: "Feriado de teste",
  ativo: false,
};
const input = {
  titulo: "Novo aviso de teste",
  descricao: "Mensagem ficticia",
  href: "/noticias",
  imagemUrl: "",
  ativo: true,
};
const context = (id = "first") => ({ params: { id } });
let stored: string | null;
let hasConfig: boolean;

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(testSession);
  stored = serializeHomeAlertsConfig([record, second], {
    alertAnimationEnabled: true,
    alertAnimationSpeed: "normal",
    bannerIntervalMs: 8000,
  });
  hasConfig = true;
  dbMock.$transaction.mockImplementation(async (callback) => callback(dbMock));
  dbMock.$queryRaw.mockImplementation(async () =>
    hasConfig ? [{ avisosHomeJson: stored, textosPublicosJson: null }] : [],
  );
  dbMock.$executeRaw.mockResolvedValue(1);
  dbMock.configuracaoSite.findFirst.mockImplementation(async () =>
    hasConfig ? { id: "config-test", avisosHomeJson: stored } : null,
  );
  dbMock.configuracaoSite.update.mockImplementation(async ({ data }) => {
    if (Object.hasOwn(data, "avisosHomeJson")) stored = data.avisosHomeJson;
    return { id: "config-test", ...data, avisosHomeJson: stored };
  });
  dbMock.configuracaoSite.create.mockImplementation(async ({ data }) => {
    hasConfig = true;
    stored = data.avisosHomeJson;
    return { id: "config-test", ...data };
  });
  vi.mocked(uploadFile).mockReset();
});

function only(...permissions: string[]) {
  vi.mocked(getServerSession).mockResolvedValue({
    ...testSession,
    user: { ...testSession.user, roles: ["Docente"], permissions },
  });
}

describe("API administrativa de avisos", () => {
  it.each(["Admin", "permissao especifica", "superadministrador"])(
    "edicao por %s funciona pelo Host real com bind interno diferente",
    async (role) => {
      vi.stubEnv("NEXTAUTH_URL", "https://auth.example.invalid");
      if (role === "permissao especifica") only(P.ALERTS_WRITE);
      if (role === "superadministrador")
        vi.mocked(getServerSession).mockResolvedValue({
          ...testSession,
          user: {
            ...testSession.user,
            roles: [],
            permissions: [P.INTERNAL_NO_PERMISSIONS],
            superAdmin: true,
          },
        });
      const request = new Request("http://0.0.0.0:3000/api/avisos/first", {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...input,
          titulo: "Edicao autorizada pelo navegador",
        }),
      });
      expect((await PATCH(request, context())).status).toBe(200);
      expect(parseHomeAlerts(stored)[0].titulo).toBe(
        "Edicao autorizada pelo navegador",
      );
      expect(parseHomeAlerts(stored)[1]).toEqual(second);
    },
  );

  it("Host correto nao dispensa permissao e X-Forwarded-Host nao permite uma origem externa", async () => {
    const makeRequest = (origin: string) =>
      new Request("http://0.0.0.0:3000/api/avisos/first", {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin,
          "x-forwarded-host": "external.example.invalid",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
    only(P.CONFIG_WRITE);
    expect(
      (await PATCH(makeRequest("http://localhost:3000"), context())).status,
    ).toBe(403);
    only(P.ALERTS_WRITE);
    expect(
      (await PATCH(makeRequest("https://external.example.invalid"), context()))
        .status,
    ).toBe(403);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("administrador lista todos os avisos com resposta privada sem cache", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).alerts).toHaveLength(2);
  });

  it.each([
    "sem sessao",
    "Docente",
    "somente configuracoes",
    "Admin com lista manual restrita",
    "sessao revogada",
  ])("nega todas as operacoes diretamente: %s", async (mode) => {
    if (mode === "sem sessao")
      vi.mocked(getServerSession).mockResolvedValue(null);
    else if (mode === "sessao revogada")
      vi.mocked(getServerSession).mockResolvedValue({
        ...testSession,
        invalidated: true,
      });
    else if (mode === "Admin com lista manual restrita")
      vi.mocked(getServerSession).mockResolvedValue({
        ...testSession,
        user: { ...testSession.user, permissions: [P.CONFIG_WRITE] },
      });
    else only(...(mode === "somente configuracoes" ? [P.CONFIG_WRITE] : []));
    const req = jsonRequest("/api/avisos", input);
    expect((await GET()).status).toBe(403);
    expect((await POST(req)).status).toBe(403);
    expect(
      (await PATCH(jsonRequest("/api/avisos/first", input, "PATCH"), context()))
        .status,
    ).toBe(403);
    expect(
      (
        await DELETE(
          new Request("http://localhost/api/avisos/first", {
            method: "DELETE",
          }),
          context(),
        )
      ).status,
    ).toBe(403);
    expect(
      (await settings(jsonRequest("/api/avisos/settings", {}))).status,
    ).toBe(403);
    expect(
      (
        await upload(
          new Request("http://localhost/api/avisos/upload", { method: "POST" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await legacyUpload(
          new Request("http://localhost/api/config/avisos/upload", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(403);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("permissao especifica permite criar sem conceder configuracoes, preservando avisos e banners", async () => {
    only(P.ALERTS_WRITE);
    const response = await POST(jsonRequest("/api/avisos", input));
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.alert).toMatchObject(input);
    expect(json.alert.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(Number.isFinite(Date.parse(json.alert.criadoEm))).toBe(true);
    expect(json.alert.atualizadoEm).toBe(json.alert.criadoEm);
    expect(json.alerts.slice(0, 2)).toEqual([record, second]);
    expect(parseHomeDisplaySettings(stored).bannerIntervalMs).toBe(8000);
    expect((await saveConfig(jsonRequest("/api/config", {}))).status).toBe(403);
    expect(dbMock.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entidadeAfetada: "Aviso",
          acao: "CRIAR",
        }),
      }),
    );
  });

  it("edita apenas o aviso escolhido sem perder criacao, vizinhos ou configuracoes", async () => {
    const createdAt = "2026-10-01T10:00:00.000Z";
    stored = serializeHomeAlertsConfig(
      [{ ...record, criadoEm: createdAt }, second],
      parseHomeDisplaySettings(stored),
    );
    only(P.ALERTS_WRITE);
    const response = await PATCH(
      jsonRequest(
        "/api/avisos/first",
        { ...input, titulo: "Aviso revisado" },
        "PATCH",
      ),
      context(),
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.alert).toMatchObject({
      id: "first",
      titulo: "Aviso revisado",
      criadoEm: createdAt,
    });
    expect(Number.isFinite(Date.parse(result.alert.atualizadoEm))).toBe(true);
    expect(result.alerts[1]).toEqual(second);
    expect(parseHomeDisplaySettings(stored).bannerIntervalMs).toBe(8000);
  });

  it.each([true, false])(
    "ativa/desativa explicitamente sem apagar conteudo: %s",
    async (ativo) => {
      only(P.ALERTS_WRITE);
      expect(
        (
          await PATCH(
            jsonRequest("/api/avisos/first", { ativo }, "PATCH"),
            context(),
          )
        ).status,
      ).toBe(200);
      expect(parseHomeAlerts(stored)[0]).toMatchObject({ ...record, ativo });
    },
  );

  it("ordena por setas e conserva identificadores estaveis apos converter o formato antigo", async () => {
    stored = JSON.stringify([
      { ...record, id: undefined },
      { ...second, id: undefined },
    ]);
    const list = await (await GET()).json();
    expect(list.alerts.map((item: { id: string }) => item.id)).toEqual([
      "legacy-1",
      "legacy-2",
    ]);
    expect(
      (
        await PATCH(
          jsonRequest("/api/avisos/legacy-2", { mover: "subir" }, "PATCH"),
          context("legacy-2"),
        )
      ).status,
    ).toBe(200);
    expect(parseHomeAlerts(stored).map((item) => item.id)).toEqual([
      "legacy-2",
      "legacy-1",
    ]);
    expect(
      (
        await PATCH(
          jsonRequest("/api/avisos/legacy-2", { mover: "descer" }, "PATCH"),
          context("legacy-2"),
        )
      ).status,
    ).toBe(200);
    expect(parseHomeAlerts(stored).map((item) => item.id)).toEqual([
      "legacy-1",
      "legacy-2",
    ]);
  });

  it("exclui somente o registro escolhido e nao tenta apagar arquivos compartilhados", async () => {
    only(P.ALERTS_WRITE);
    const response = await DELETE(
      new Request("http://localhost/api/avisos/first", { method: "DELETE" }),
      context(),
    );
    expect(response.status).toBe(200);
    expect(parseHomeAlerts(stored)).toEqual([second]);
    expect(parseHomeDisplaySettings(stored).bannerIntervalMs).toBe(8000);
  });

  it("suporta varios avisos ativos sem limitar a um unico destaque", async () => {
    await POST(jsonRequest("/api/avisos", input));
    await PATCH(
      jsonRequest("/api/avisos/second", { ativo: true }, "PATCH"),
      context("second"),
    );
    expect(parseHomeAlerts(stored).filter((alert) => alert.ativo)).toHaveLength(
      3,
    );
  });

  it.each([
    "{",
    JSON.stringify({ alerts: "invalid" }),
    JSON.stringify([null, record]),
  ])(
    "nao sobrescreve armazenamento corrompido ou descarta registros silenciosamente",
    async (value) => {
      stored = value;
      expect((await POST(jsonRequest("/api/avisos", input))).status).toBe(409);
      expect(stored).toBe(value);
      expect(dbMock.configuracaoSite.update).not.toHaveBeenCalled();
    },
  );

  it("cria configuracao apenas quando nao existe, sem executar seed", async () => {
    hasConfig = false;
    stored = null;
    expect((await POST(jsonRequest("/api/avisos", input))).status).toBe(201);
    expect(parseHomeAlerts(stored)).toHaveLength(1);
    expect(dbMock.configuracaoSite.create).toHaveBeenCalledTimes(1);
    expect(dbMock.usuario.create).not.toHaveBeenCalled();
  });

  it("rejeita payloads invalidos, atributos internos e identificadores invalidos", async () => {
    for (const body of [
      { ...input, titulo: "", descricao: "" },
      { ...input, href: "javascript:alert(1)" },
      { ...input, imagemUrl: "data:text/html,test" },
      { ...input, criadoEm: "2026-01-01" },
      { ...input, ativo: "true" },
    ]) {
      expect((await POST(jsonRequest("/api/avisos", body))).status).toBe(400);
    }
    expect(
      (
        await PATCH(
          jsonRequest("/api/avisos/first", { mover: "invalido" }, "PATCH"),
          context(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await DELETE(
          new Request("http://localhost/api/avisos/test", { method: "DELETE" }),
          context("../other"),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          new Request("http://localhost/api/avisos", {
            method: "POST",
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
  it("mantem a criacao legitima com descricao sem exigir um titulo inexistente no modelo antigo", async () => {
    const response = await POST(
      jsonRequest("/api/avisos", {
        titulo: "",
        descricao: "Comunicado somente em texto",
        ativo: true,
      }),
    );
    expect(response.status).toBe(201);
    expect((await response.json()).alert).toMatchObject({
      titulo: "",
      descricao: "Comunicado somente em texto",
    });
  });

  it("retorna 404 ao editar ou excluir registro inexistente", async () => {
    expect(
      (
        await PATCH(
          jsonRequest("/api/avisos/missing", input, "PATCH"),
          context("missing"),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await DELETE(
          new Request("http://localhost/api/avisos/missing", {
            method: "DELETE",
          }),
          context("missing"),
        )
      ).status,
    ).toBe(404);
    expect(dbMock.configuracaoSite.update).not.toHaveBeenCalled();
  });

  it("recusa operacoes autenticadas de outra origem", async () => {
    const request = new Request("http://localhost/api/avisos", {
      method: "POST",
      headers: {
        origin: "https://external.example.invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    expect((await POST(request)).status).toBe(403);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("upload novo e alias antigo exigem Avisos e reutilizam a politica central", async () => {
    only(P.ALERTS_WRITE);
    vi.mocked(uploadFile).mockResolvedValue(
      "/api/uploads/config/avisos/fake.png",
    );
    for (const action of [upload, legacyUpload]) {
      const body = new FormData();
      body.set(
        "arquivo",
        new File(["test"], "test.png", { type: "image/png" }),
      );
      expect(
        (
          await action(
            new Request("http://localhost/api/avisos/upload", {
              method: "POST",
              body,
            }),
          )
        ).status,
      ).toBe(201);
    }
    expect(uploadFile).toHaveBeenCalledWith(expect.any(File), "config/avisos");
  });
});

describe("Regressoes de configuracoes e banner", () => {
  it("salvar configuracoes ignora copia antiga ou maliciosa de avisos e preserva bytes do JSON", async () => {
    only(P.CONFIG_WRITE);
    const before = stored;
    expect(
      (
        await saveConfig(
          jsonRequest("/api/config", {
            avisosHomeJson: "[]",
            corPrimaria: "#123456",
          }),
        )
      ).status,
    ).toBe(200);
    expect(stored).toBe(before);
    expect(dbMock.configuracaoSite.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avisosHomeJson: expect.anything() }),
      }),
    );
  });
  it("resposta publica e usuario apenas Config nao recebem avisos inativos", async () => {
    for (const session of [
      null,
      {
        ...testSession,
        user: { ...testSession.user, permissions: [P.CONFIG_WRITE] },
      },
    ]) {
      vi.mocked(getServerSession).mockResolvedValue(session);
      const config = await (await getConfig()).json();
      expect(parseHomeAlerts(config.avisosHomeJson)).toEqual([record]);
    }
  });
  it("trocar tempo dos banners nao altera avisos, status, datas ou animacao", async () => {
    only(P.BANNERS_WRITE);
    expect(
      (
        await bannerSettings(
          jsonRequest("/api/banners/settings", {
            bannerIntervalMs: 11000,
            alerts: [],
          }),
        )
      ).status,
    ).toBe(200);
    expect(parseHomeAlerts(stored)).toEqual([record, second]);
    expect(parseHomeDisplaySettings(stored)).toEqual({
      bannerIntervalMs: 11000,
      alertAnimationEnabled: true,
      alertAnimationSpeed: "normal",
    });
  });
  it("animacao exige Avisos e nao permite alterar intervalo dos banners", async () => {
    only(P.ALERTS_WRITE);
    expect(
      (
        await settings(
          jsonRequest("/api/avisos/settings", {
            alertAnimationEnabled: false,
            alertAnimationSpeed: "slow",
          }),
        )
      ).status,
    ).toBe(200);
    expect(parseHomeDisplaySettings(stored)).toEqual({
      bannerIntervalMs: 8000,
      alertAnimationEnabled: false,
      alertAnimationSpeed: "slow",
    });
    expect(parseHomeAlerts(stored)).toEqual([record, second]);
    expect(
      (
        await settings(
          jsonRequest("/api/avisos/settings", {
            alertAnimationEnabled: true,
            alertAnimationSpeed: "fast",
            bannerIntervalMs: 15000,
          }),
        )
      ).status,
    ).toBe(400);
  });
});
