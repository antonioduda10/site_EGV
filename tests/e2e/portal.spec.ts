import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { encode } from "next-auth/jwt";
import { SESSION_IDLE_TIMEOUT_MS } from "../../lib/session-policy";

const evidenceDir = "docs/incremento-II/evidencias";
const routes = ["/", "/noticias", "/eventos", "/documentos", "/galeria", "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato", "/login"];
const adminRoutes = ["/dashboard", "/dashboard/noticias", "/dashboard/eventos", "/dashboard/documentos", "/dashboard/paginas", "/dashboard/banners", "/dashboard/galeria/fotos", "/dashboard/galeria/videos", "/dashboard/usuarios", "/dashboard/config", "/dashboard/secretaria", "/dashboard/contatos", "/dashboard/relatorios"];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
}

async function noOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
}

async function screenshot(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images, async (image) => {
      image.loading = "eager";
      await image.decode().catch(() => undefined);
    }));
  });
  await page.screenshot({ path: `${evidenceDir}/${name}`, fullPage: true, animations: "disabled" });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-consent-initialized")) {
      localStorage.setItem("egv-consent", JSON.stringify({ essenciais: true, analiticos: false, marketing: false }));
      sessionStorage.setItem("e2e-consent-initialized", "true");
    }
  });
});

for (const width of [375, 768, 1366]) {
  test(`PUBLIC-${width} paginas publicas sem overflow e com conteudo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("#conteudo h1").first(), route).toBeVisible();
      await noOverflow(page);
      if (route === "/" && width === 1366) await screenshot(page, "01-home-desktop.png");
      if (route === "/" && width === 375) await screenshot(page, "02-home-mobile.png");
      if (route === "/documentos" && width === 375) await screenshot(page, "03-tela-publica-mobile.png");
      if (route === "/login" && width === 1366) await screenshot(page, "04-login.png");
    }
  });
  test(`ADMIN-${width} listagens e formularios sem overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    for (const route of adminRoutes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("#conteudo h1").first(), route).toBeVisible();
      await expect(page.getByText("Sem permissão para acessar.", { exact: true })).toHaveCount(0);
      await noOverflow(page);
      if (route === "/dashboard" && width === 1366) await screenshot(page, "05-dashboard.png");
      if (route === "/dashboard/documentos" && width === 1366) await screenshot(page, "06-tela-administrativa.png");
      if (route === "/dashboard/documentos") {
        await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
        const table = page.getByRole("table");
        await expect(table).toBeVisible();
        const scrollable = await table.evaluate((element) => {
          const parent = element.parentElement!;
          return parent.scrollWidth > parent.clientWidth && getComputedStyle(parent).overflowX === "auto";
        });
        if (width < 1366) expect(scrollable).toBe(true);
      }
    }
  });
}

test("FLOW-01 painel exige login e API protegida nega acesso", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  const response = await request.post("/api/noticias", { data: {} });
  expect(response.status()).toBe(403);
  expect(await response.json()).toHaveProperty("error");
});

test("FLOW-02 menu publico mobile fecha apos navegar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByLabel("Abrir menu", { exact: true }).click();
  await page.locator("header details").getByRole("link", { name: "Notícias", exact: true }).click();
  await expect(page).toHaveURL(/\/noticias$/);
  await expect(page.getByLabel("Abrir menu", { exact: true })).toBeVisible();
  await expect(page.locator("header details")).not.toHaveAttribute("open", "");
});

test("FLOW-03 tema persiste apos reload e Tab revela skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeInViewport();
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("FLOW-04 menu administrativo mobile e sidebar fixa", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await page.getByLabel("Abrir menu do painel").click();
  await page.getByRole("navigation", { name: "Menu mobile do painel" }).getByRole("link", { name: "Documentos", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/documentos$/);
  await expect(page.getByRole("navigation", { name: "Menu mobile do painel" })).not.toBeVisible();
  await page.setViewportSize({ width: 1366, height: 900 });
  const menu = page.getByRole("navigation", { name: "Menu do painel", exact: true });
  const before = await menu.boundingBox();
  await page.locator(".lg\\:overflow-y-auto").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const after = await menu.boundingBox();
  expect(after?.y).toBeCloseTo(before!.y, 0);
  await expect(menu).toBeInViewport();
});

test("FLOW-05 paginas legais, slug, download e conteudo dinamico", async ({ page, request }) => {
  for (const route of ["/politica-privacidade", "/cookies", "/termos", "/p/escola-teste", "/noticias/projeto-leitura-teste"]) {
    expect((await page.goto(route))?.status(), route).toBe(200);
  }
  const docs = await request.get("/api/documentos");
  const records = await docs.json() as { id: string }[];
  const download = await request.get(`/api/documentos/${records[0].id}/download`);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  await page.goto("/noticias");
  await expect(page.getByRole("heading", { name: "Projeto de leitura da escola" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Nossa História", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/escola-teste$/);
});

test("CRUD-01 noticias com PostgreSQL isolado e fluxo de aprovacao", async ({ page }) => {
  await login(page);
  const created = await page.request.post("/api/noticias", { data: {
    titulo: "Noticia criada pelo teste E2E", resumo: "Resumo ficticio para o fluxo completo.",
    conteudo: "Conteudo ficticio para testar criacao, edicao e publicacao."
  } });
  expect(created.status()).toBe(201);
  const record = await created.json() as { id: string; slug: string; status: string };
  expect(record.status).toBe("RASCUNHO");
  expect((await page.request.patch(`/api/noticias/${record.id}`, { data: { titulo: "Noticia revisada pelo teste E2E" } })).status()).toBe(200);
  expect((await page.request.post(`/api/noticias/${record.id}/enviar-aprovacao`)).status()).toBe(200);
  expect((await page.request.post(`/api/noticias/${record.id}/aprovar`)).status()).toBe(200);
  await page.goto(`/noticias/${record.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "Noticia revisada pelo teste E2E" })).toBeVisible();
  expect((await page.request.delete(`/api/noticias/${record.id}`)).status()).toBe(200);
  expect((await page.request.get(`/api/noticias/${record.id}`)).status()).toBe(404);
});

test("CRUD-02 documentos com upload e exclusao apenas em diretorio temporario", async ({ page }) => {
  await login(page);
  const created = await page.request.post("/api/documentos", { multipart: {
    nome: "Documento criado pelo E2E", categoria: "Testes", ano: "2026", descricao: "Arquivo ficticio",
    arquivo: { name: "e2e.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") }
  } });
  expect(created.status()).toBe(201);
  const record = await created.json() as { id: string; caminho: string };
  expect((await page.request.patch(`/api/documentos/${record.id}`, { data: { nome: "Documento revisado pelo E2E", categoria: "Testes", ano: 2026, ordem: 2 } })).status()).toBe(200);
  expect((await page.request.get(`/api/documentos/${record.id}/download`)).status()).toBe(200);
  expect((await page.request.delete(`/api/documentos/${record.id}`)).status()).toBe(200);
  expect((await page.request.get(`/api/documentos/${record.id}/download`)).status()).toBe(404);
});

test("FLOW-06 login informa erros e campos invalidos", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Informe seu email.", { exact: true })).toBeVisible();
  await expect(page.getByText("Informe sua senha.", { exact: true })).toBeVisible();
});

test("FLOW-07 carrossel automatico sem botao de pausa e imagens de upload", async ({ page }) => {
  await login(page);
  const ids: string[] = [];
  for (const title of ["Banner de teste um", "Banner de teste dois"]) {
    const response = await page.request.post("/api/banners", { multipart: {
      titulo: title, descricao: "Ambiente de testes", ativo: "true", ordem: String(ids.length),
      imagem: { name: "teste.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJXkAAAAASUVORK5CYII=", "base64") }
    } });
    expect(response.status()).toBe(201);
    const record = await response.json() as { id: string; imagem: string };
    ids.push(record.id);
    expect((await page.request.get(record.imagem)).status()).toBe(200);
  }
  await page.goto("/");
  const next = page.getByRole("button", { name: "Próximo banner" });
  await next.focus();
  await expect(next).toHaveCSS("opacity", "1");
  await expect.poll(() => page.locator('img[alt^="Banner de teste"]').evaluate((image) => image instanceof HTMLImageElement ? image.naturalWidth : 0)).toBe(1);
  await expect(page.getByRole("button", { name: /Pausar banners|Reproduzir banners/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Ir para slide 1", exact: true }).click();
  await expect(page.getByAltText("Banner de teste dois", { exact: true })).toBeVisible({ timeout: 8000 });
  for (const id of ids) expect((await page.request.delete(`/api/banners/${id}`)).status()).toBe(200);
});

test("FLOW-08 configuracao altera texto dinamico sem novo build", async ({ page }) => {
  await login(page);
  const response = await page.request.get("/api/config");
  const config = await response.json() as Record<string, unknown>;
  try {
    const saved = await page.request.post("/api/config", { data: { ...config, textosPublicosJson: JSON.stringify({ home: { title: "Portal do ambiente de testes" } }) } });
    expect(saved.status()).toBe(200);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Portal do ambiente de testes" })).toBeVisible();
  } finally {
    expect((await page.request.post("/api/config", { data: config })).status()).toBe(200);
  }
});

test("A11Y-01 WCAG A/AA nas telas publicas e formulario administrativo", async ({ page }) => {
  const results: { path: string; violations: unknown[] }[] = [];
  for (const route of ["/", "/noticias", "/documentos", "/galeria", "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato", "/login"]) {
    await page.goto(route);
    const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    results.push({ path: route, violations: scan.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map((node) => node.target) })) });
  }
  await login(page);
  await page.goto("/dashboard/documentos");
  const scan = await new AxeBuilder({ page }).include("#conteudo").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  results.push({ path: "/dashboard/documentos", violations: scan.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map((node) => node.target) })) });
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.evaluate(() => { localStorage.setItem("egv-theme", "dark"); });
  for (const route of ["/", "/login", "/documentos"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkScan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    results.push({ path: `${route} (escuro)`, violations: darkScan.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map((node) => node.target) })) });
    if (route === "/") await screenshot(page, "09-home-escuro.png");
    if (route === "/login") await screenshot(page, "10-login-escuro.png");
  }
  await login(page);
  await page.goto("/dashboard/documentos");
  const adminDarkScan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  results.push({ path: "/dashboard/documentos (escuro)", violations: adminDarkScan.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map((node) => node.target) })) });
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("egv-consent"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Preferências de cookies" })).toBeVisible();
  const cookiesScan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  results.push({ path: "/ (cookies, escuro)", violations: cookiesScan.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map((node) => node.target) })) });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/acessibilidade.json`, JSON.stringify(results, null, 2));
  expect(results.filter((result) => result.violations.length).map((result) => result.path), "Detalhes em docs/incremento-II/evidencias/acessibilidade.json").toEqual([]);
});

test("SESSION-01 conserva login entre painel e paginas publicas e permite sair", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Login", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.locator("header").getByRole("link", { name: "Início", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("header").getByRole("link", { name: "Painel", exact: true })).toBeVisible();
  await page.reload();
  await page.locator("header").getByRole("link", { name: "Painel", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.post("/api/noticias", { data: {} })).status()).toBe(403);
});

test("SESSION-02 servidor bloqueia sessao com 30 minutos de inatividade", async ({ page }) => {
  await login(page);
  const session = await (await page.request.get("/api/auth/session")).json() as { user: { id: string } };
  const expired = await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { userId: session.user.id, sessionVersion: 1, lastActivityAt: Date.now() - SESSION_IDLE_TIMEOUT_MS } });
  await page.context().addCookies([{ name: "next-auth.session-token", value: expired, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const response = await page.request.get("/api/auth/session");
  expect(await response.json()).toMatchObject({ invalidated: true, invalidatedReason: "idle" });
  expect((await page.request.post("/api/noticias", { data: {} })).status()).toBe(403);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session-expired$/);
});

test("SESSION-03 usuario autorizado pode encerrar outra sessao", async ({ page, browser }) => {
  await login(page);
  const created = await page.request.post("/api/usuarios", { data: { nome: "Docente de teste", email: "docente-sessao@example.invalid", senha: process.env.E2E_PASSWORD!, perfil: "Docente" } });
  expect(created.status()).toBe(201);
  const target = await created.json() as { id: string };
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto("http://127.0.0.1:3100/login");
    await other.getByLabel("Email", { exact: true }).fill("docente-sessao@example.invalid");
    await other.getByLabel("Senha", { exact: true }).fill(process.env.E2E_PASSWORD!);
    await other.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(other).toHaveURL(/\/dashboard$/);
    expect((await page.request.post(`/api/usuarios/${target.id}/deslogar`)).status()).toBe(200);
    await other.reload();
    await expect(other).toHaveURL(/\/login(?:\?.*)?$/);
  } finally {
    await context.close();
    await page.request.delete(`/api/usuarios/${target.id}`);
  }
});

test("SESSION-04 interacao renova atividade mas consultas de sessao nao renovam", async ({ page }) => {
  await login(page);
  const session = await (await page.request.get("/api/auth/session")).json() as { user: { id: string } };
  const previousActivity = Date.now() - 2 * 60 * 1000;
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { userId: session.user.id, sessionVersion: 1, lastActivityAt: previousActivity } });
  await page.context().addCookies([{ name: "next-auth.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: "Painel", exact: true })).toBeVisible();
  // Wait for renewal before reading the cookie; concurrent session GETs also set cookies.
  await expect(async () => {
    const renewal = page.waitForResponse((response) => response.url().endsWith("/api/auth/session") && response.request().method() === "POST", { timeout: 3000 });
    await page.keyboard.press("Shift");
    const response = await renewal;
    await response.finished();
    expect(response.ok()).toBe(true);
    const activity = await response.json() as { lastActivityAt: number };
    expect(activity.lastActivityAt).toBeGreaterThan(previousActivity);
  }).toPass({ timeout: 15_000 });
  const renewed = await (await page.request.get("/api/auth/session")).json() as { lastActivityAt: number };
  expect(renewed.lastActivityAt).toBeGreaterThan(previousActivity);
  const unchanged = await (await page.request.get("/api/auth/session")).json() as { lastActivityAt: number };
  expect(unchanged.lastActivityAt).toBe(renewed.lastActivityAt);
});

test("NAV-01 links do rodape azuis com destaque ao passar o mouse", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("contentinfo").getByRole("link", { name: "Notícias", exact: true });
  await expect(link).toHaveCSS("color", "rgb(59, 130, 246)");
  await link.hover();
  await expect(link).toHaveCSS("color", "rgb(96, 165, 250)");
  await expect(link).toHaveCSS("text-decoration-line", "underline");
  await page.mouse.move(0, 0);
  await link.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS("color", "rgb(96, 165, 250)");
  await expect(link).toHaveCSS("text-decoration-line", "underline");
  await link.evaluate((element) => element.blur());
  await page.getByRole("contentinfo").screenshot({ path: `${evidenceDir}/11-rodape-links.png`, animations: "disabled" });
});

test("NAV-02 icones sociais com cores caracteristicas e links preservados", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const width of [1366, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const facebook = footer.getByRole("link", { name: "Facebook", exact: true });
    await expect(facebook).toHaveAttribute("href", "https://www.facebook.com/egv-teste");
    await expect(facebook).toHaveAttribute("target", "_blank");
    await expect(facebook.locator("svg")).toHaveCSS("background-color", "rgb(24, 119, 242)");
    await expect(facebook.locator("svg")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(facebook.locator("span").first()).toHaveAttribute("aria-hidden", "true");
    const instagram = footer.getByRole("link", { name: "Instagram", exact: true });
    await expect(instagram).not.toHaveAttribute("target", "_blank");
    await expect(instagram.locator("svg")).toHaveCSS("background-image", /linear-gradient/);
    await expect(footer.getByRole("link", { name: "YouTube", exact: true }).locator("svg")).toHaveCSS("color", "rgb(255, 0, 0)");
    await expect(footer.getByRole("link", { name: "LinkedIn", exact: true }).locator("svg")).toHaveCSS("background-color", "rgb(10, 102, 194)");
    const tiktok = footer.getByRole("link", { name: "TikTok", exact: true }).locator("svg");
    await expect(tiktok).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(tiktok.locator('path[fill="#25f4ee"]')).toHaveCount(1);
    await expect(tiktok.locator('path[fill="#fe2c55"]')).toHaveCount(1);
    await noOverflow(page);
    await footer.screenshot({ path: `${evidenceDir}/${width === 1366 ? "12-redes-sociais-desktop" : "13-redes-sociais-mobile"}.png`, animations: "disabled" });
  }
});
