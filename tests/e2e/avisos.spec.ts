import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.EGV_EVIDENCE_DIR || "test-results/avisos";
type Notice = {
  id: string;
  titulo: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
  imagemUrl?: string;
};

async function login(
  page: Page,
  email = process.env.E2E_EMAIL!,
  password = process.env.E2E_PASSWORD!,
) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function notices(page: Page): Promise<Notice[]> {
  const response = await page.request.get("/api/avisos");
  expect(response.status()).toBe(200);
  return (await response.json()).alerts;
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "egv-consent",
      JSON.stringify({ essenciais: true, analiticos: false, marketing: false }),
    ),
  );
});

test("AVISOS-01 administrador cria, edita, publica, ordena e exclui; Config e home preservadas", async ({
  page,
  request,
}) => {
  await login(page);
  const original = await notices(page);
  const createdIds: string[] = [];
  try {
    await page.goto("/dashboard/avisos");
    await expect(
      page.getByRole("heading", { name: "Avisos da página inicial" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Menu do painel", exact: true })
        .getByRole("link", { name: "Avisos", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator('tr[data-alert-id="legacy-1"]')).toContainText(
      "Não registrada",
    );
    const windowScrollBeforeEditor = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Novo aviso", exact: true }).focus();
    await page.keyboard.press("Enter");
    const form = page.getByRole("form", { name: "Novo aviso", exact: true });
    await expect(form).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(
      windowScrollBeforeEditor,
    );
    await form
      .getByLabel("Título do aviso")
      .fill("Aviso E2E criado pela interface");
    await form
      .getByLabel("Descrição", { exact: true })
      .fill("Reuniao ficticia para verificar a comunicacao escolar.");
    await form.getByLabel("Link opcional").fill("/eventos");
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
      "base64",
    );
    await form.getByLabel("Imagem do aviso", { exact: true }).setInputFiles({
      name: "aviso-teste.png",
      mimeType: "image/png",
      buffer: pixel,
    });
    await expect(page.getByRole("status")).toContainText("Imagem enviada");
    await mkdir(base, { recursive: true });
    await page.screenshot({
      path: `${base}/avisos-formulario.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.route("**/api/avisos", async (route) => {
      if (route.request().method() === "POST")
        await new Promise((resolve) => setTimeout(resolve, 350));
      await route.continue();
    });
    await form.getByRole("button", { name: "Salvar aviso" }).click();
    await expect(
      form.getByRole("button", { name: "Salvando..." }),
    ).toBeDisabled();
    await expect(page.getByRole("status")).toHaveText("Aviso salvo.");
    const created = (await notices(page)).find(
      (alert) => alert.titulo === "Aviso E2E criado pela interface",
    )!;
    createdIds.push(created.id);
    expect(created.criadoEm).toBeTruthy();
    expect((await request.get(created.imagemUrl!)).status()).toBe(200);
    const row = page.locator(`tr[data-alert-id="${created.id}"]`);
    await expect(row).not.toContainText("Não registrada");
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    const editForm = page.getByRole("form", {
      name: "Editar aviso",
      exact: true,
    });
    await editForm.getByLabel("Título do aviso").fill("Aviso E2E revisado");
    await editForm.getByRole("button", { name: "Salvar aviso" }).click();
    await expect(row).toContainText("Aviso E2E revisado");
    await page.route(
      `**/api/avisos/${created.id}`,
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 350));
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha controlada de teste." }),
        });
      },
      { times: 1 },
    );
    await row.getByRole("checkbox").uncheck();
    await expect(row.getByRole("checkbox")).toBeChecked();
    await expect(
      page.getByRole("alert").filter({ hasText: "Falha controlada de teste." }),
    ).toHaveText("Falha controlada de teste.");
    expect(
      (await notices(page)).find((item) => item.id === created.id)?.ativo,
    ).toBe(true);
    await row.getByRole("checkbox").uncheck();
    await expect(row).toContainText("Oculto");
    expect((await request.get(created.imagemUrl!)).status()).toBe(404);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Aviso E2E revisado", exact: true }),
    ).toHaveCount(0);
    await page.goto("/dashboard/avisos");
    await row.getByRole("checkbox").check();
    await expect(row).toContainText("Ativo");
    const second = await page.request.post("/api/avisos", {
      data: {
        titulo: "Segundo aviso ativo E2E",
        descricao: "Outro comunicado ficticio.",
        ativo: true,
      },
    });
    expect(second.status()).toBe(201);
    const secondId = (await second.json()).alert.id;
    createdIds.push(secondId);
    await page.reload();
    await page
      .locator(`tr[data-alert-id="${secondId}"]`)
      .getByRole("button", { name: "Subir aviso Segundo aviso ativo E2E" })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "Ordem dos avisos atualizada.",
    );
    const ordered = await notices(page);
    expect(ordered.findIndex((item) => item.id === secondId)).toBeLessThan(
      ordered.findIndex((item) => item.id === created.id),
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Aviso E2E revisado", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Segundo aviso ativo E2E",
        exact: true,
      }),
    ).toBeVisible();
    const headings = await page.locator("article h3").allTextContents();
    expect(headings.indexOf("Segundo aviso ativo E2E")).toBeLessThan(
      headings.indexOf("Aviso E2E revisado"),
    );
    await page.goto("/dashboard/avisos");
    const animation = page.getByRole("form", { name: "Animação dos avisos" });
    await animation.getByRole("checkbox").uncheck();
    await animation.getByRole("button", { name: "Salvar animação" }).click();
    await expect(page.getByRole("status")).toHaveText("Animação atualizada.");
    const before = await (await page.request.get("/api/avisos")).json();
    const currentConfig = await (await page.request.get("/api/config")).json();
    expect(
      (
        await page.request.post("/api/config", {
          data: { ...currentConfig, avisosHomeJson: "[]" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await (await page.request.get("/api/avisos")).json()).alerts,
    ).toEqual(before.alerts);
    await page.goto("/dashboard/config");
    await expect(
      page.getByRole("heading", { name: "Avisos importantes", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "Ativar animação discreta" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Salvar alterações", exact: true }),
    ).toBeVisible();
    await page.goto("/dashboard/avisos");
    page.once("dialog", (dialog) => dialog.dismiss());
    await row.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(row).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(row).toHaveCount(0);
    expect((await request.get(created.imagemUrl!)).status()).toBe(404);
    const axe = await new AxeBuilder({ page }).include("#conteudo").analyze();
    expect(
      axe.violations.filter(
        (item) => item.impact === "critical" || item.impact === "serious",
      ),
    ).toEqual([]);
    await mkdir(base, { recursive: true });
    for (const width of [375, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, 0);
        document.querySelectorAll<HTMLElement>(".lg\\:overflow-y-auto").forEach((pane) => { pane.style.scrollBehavior = "auto"; pane.scrollTop = 0; });
      });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
      await page.screenshot({
        path: `${base}/avisos-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await page
      .getByRole("button", { name: "Ativar tema escuro", exact: true })
      .first()
      .click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkAxe = await new AxeBuilder({ page })
      .include("#conteudo")
      .analyze();
    expect(
      darkAxe.violations.filter(
        (item) => item.impact === "critical" || item.impact === "serious",
      ),
    ).toEqual([]);
    await page.screenshot({
      path: `${base}/avisos-escuro.png`,
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    for (const id of createdIds) await page.request.delete(`/api/avisos/${id}`);
    for (const alert of original)
      await page.request.patch(`/api/avisos/${alert.id}`, {
        data: { ativo: alert.ativo },
      });
    await page.request.post("/api/avisos/settings", {
      data: { alertAnimationEnabled: true, alertAnimationSpeed: "normal" },
    });
  }
});

test("AVISOS-05 aviso com somente descricao conserva o conteudo publico sem heading vazio", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.post("/api/avisos", {
    data: {
      titulo: "",
      descricao: "Comunicado ficticio sem titulo, preservado na home.",
      ativo: true,
    },
  });
  expect(response.status()).toBe(201);
  const notice = (await response.json()).alert;
  try {
    await page.goto("/");
    await expect(
      page.getByText("Comunicado ficticio sem titulo, preservado na home.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("#conteudo article h3:empty")).toHaveCount(0);
  } finally {
    await page.request.delete(`/api/avisos/${notice.id}`);
  }
});

test("AVISOS-02 usuarios especificos, menus mobile, rota e APIs respeitam a nova permissao", async ({
  page,
  browser,
}) => {
  await login(page);
  const password = randomBytes(24).toString("hex");
  const ids: string[] = [];
  const contexts = [];
  try {
    for (const enabled of [false, true]) {
      const email = `avisos-${enabled}-${Date.now()}@example.invalid`;
      const response = await page.request.post("/api/usuarios", {
        data: {
          nome: enabled
            ? "Editor de avisos ficticio"
            : "Editor de configuracoes ficticio",
          email,
          senha: password,
          perfil: "Docente",
        },
      });
      expect(response.status()).toBe(201);
      const user = await response.json();
      ids.push(user.id);
      expect(
        (
          await page.request.post(`/api/usuarios/${user.id}/permissoes`, {
            data: {
              permissions: [
                "DASHBOARD_READ",
                enabled ? "ALERTS_WRITE" : "CONFIG_WRITE",
              ],
            },
          })
        ).status(),
      ).toBe(200);
      const context = await browser.newContext();
      contexts.push(context);
      const editor = await context.newPage();
      await login(editor, email, password);
      await editor.goto("/dashboard/avisos");
      if (!enabled) {
        await expect(
          editor.getByText("Sem permissão para acessar.", { exact: true }),
        ).toBeVisible();
        await expect(
          editor
            .getByRole("navigation", { name: "Menu do painel", exact: true })
            .getByRole("link", { name: "Avisos", exact: true }),
        ).toHaveCount(0);
        for (const [url, method, data] of [
          ["/api/avisos", "GET", undefined],
          ["/api/avisos", "POST", { titulo: "Recusado" }],
          ["/api/avisos/legacy-1", "PATCH", { ativo: false }],
          ["/api/avisos/legacy-1", "DELETE", undefined],
          ["/api/avisos/settings", "POST", {}],
          ["/api/avisos/upload", "POST", undefined],
          ["/api/config/avisos/upload", "POST", undefined],
        ] as const) {
          expect(
            (await editor.request.fetch(url, { method, data })).status(),
            `${method} ${url}`,
          ).toBe(403);
        }
      } else {
        await expect(
          editor.getByRole("heading", { name: "Avisos da página inicial" }),
        ).toBeVisible();
        expect((await editor.request.get("/api/avisos")).status()).toBe(200);
        expect(
          (await editor.request.post("/api/config", { data: {} })).status(),
        ).toBe(403);
        const created = await editor.request.post("/api/avisos", {
          data: { titulo: "Aviso do editor autorizado", ativo: true },
        });
        expect(created.status()).toBe(201);
        const id = (await created.json()).alert.id;
        expect(
          (
            await editor.request.patch(`/api/avisos/${id}`, {
              data: { ativo: false },
            })
          ).status(),
        ).toBe(200);
        expect(
          (await editor.request.delete(`/api/avisos/${id}`)).status(),
        ).toBe(200);
        await editor.setViewportSize({ width: 375, height: 850 });
        await editor.getByLabel("Abrir menu do painel").click();
        const menu = editor.getByRole("navigation", {
          name: "Menu mobile do painel",
        });
        await menu.getByRole("link", { name: "Avisos", exact: true }).click();
        await expect(menu).not.toBeVisible();
      }
      await page.goto("/dashboard/usuarios");
      const row = page.getByRole("row").filter({ hasText: email });
      const permission = row.getByRole("checkbox", {
        name: "Gerenciar avisos",
        exact: true,
      });
      if (enabled) await expect(permission).toBeChecked();
      else await expect(permission).not.toBeChecked();
      if (enabled) {
        await permission.uncheck();
        await row
          .getByRole("button", { name: "Salvar permissões", exact: true })
          .click();
        await expect(
          row.getByText("Permissões salvas.", { exact: true }),
        ).toBeVisible();
        await editor.reload();
        await expect(
          editor.getByText("Sem permissão para acessar.", { exact: true }),
        ).toBeVisible();
        expect((await editor.request.get("/api/avisos")).status()).toBe(403);
      }
    }
  } finally {
    for (const context of contexts) await context.close();
    for (const id of ids) await page.request.delete(`/api/usuarios/${id}`);
  }
});

test("AVISOS-03 atualizacoes simultaneas preservam avisos e tempo dos banners", async ({
  page,
}) => {
  await login(page);
  const ids: string[] = [];
  const previous = await (await page.request.get("/api/avisos")).json();
  try {
    const [first, second, banner] = await Promise.all([
      page.request.post("/api/avisos", {
        data: { titulo: "Concorrencia A de teste", ativo: true },
      }),
      page.request.post("/api/avisos", {
        data: { titulo: "Concorrencia B de teste", ativo: true },
      }),
      page.request.post("/api/banners/settings", {
        data: { bannerIntervalMs: 12000 },
      }),
    ]);
    for (const response of [first, second]) {
      expect(response.status()).toBe(201);
      ids.push((await response.json()).alert.id);
    }
    expect(banner.status()).toBe(200);
    const state = await (await page.request.get("/api/avisos")).json();
    expect(state.alerts).toHaveLength(previous.alerts.length + 2);
    expect(state.settings.bannerIntervalMs).toBe(12000);
    await page.reload();
    expect((await notices(page)).map((item) => item.id)).toEqual(
      state.alerts.map((item: Notice) => item.id),
    );
  } finally {
    for (const id of ids) await page.request.delete(`/api/avisos/${id}`);
    await page.request.post("/api/banners/settings", {
      data: { bannerIntervalMs: previous.settings.bannerIntervalMs },
    });
  }
});

test("AVISOS-04 sem avisos ativos a home oculta a secao e visitante nao administra", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/avisos")).status()).toBe(403);
  await login(page);
  const original = await notices(page);
  try {
    for (const item of original)
      expect(
        (
          await page.request.patch(`/api/avisos/${item.id}`, {
            data: { ativo: false },
          })
        ).status(),
      ).toBe(200);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Avisos importantes", exact: true }),
    ).toHaveCount(0);
    const config = await (await request.get("/api/config")).json();
    expect(JSON.parse(config.avisosHomeJson).alerts).toEqual([]);
  } finally {
    for (const item of original)
      await page.request.patch(`/api/avisos/${item.id}`, {
        data: { ativo: item.ativo },
      });
  }
});
