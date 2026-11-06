import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const directory = process.env.EGV_EVIDENCE_DIR || "docs/aula12-seguranca/evidencias";
async function login(page: Page, legacy = false) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env[legacy ? "SEC_LEGACY_EMAIL" : "E2E_EMAIL"]!);
  await page.getByLabel("Senha", { exact: true }).fill(process.env[legacy ? "SEC_LEGACY_PASSWORD" : "E2E_PASSWORD"]!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function capture(page: Page, name: string) {
  await mkdir(directory, { recursive: true });
  for (const input of await page.locator('input[type="password"]').all()) await input.fill("");
  await page.screenshot({ path: `${directory}/${name}`, fullPage: true, animations: "disabled" });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("egv-consent", JSON.stringify({ essenciais: true, analiticos: false, marketing: false })));
});

test("SEC-BROWSER-01 politica visivel e senha curta bloqueada no formulario e APIs", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/usuarios");
  await expect(page.locator("#nova-senha-regra")).toContainText("15");
  await capture(page, "01-formulario-usuario-politica-senha.png");
  await page.getByLabel("Nome do novo usuário").fill("Pessoa ficticia Aula 12");
  await page.getByLabel("Email do novo usuário").fill("ficticio@example.invalid");
  await page.getByLabel("Senha do novo usuário").fill("curta");
  await page.getByLabel("Perfil do novo usuário").selectOption("Aluno");
  const form = page.locator("form").filter({ has: page.getByLabel("Nome do novo usuário") });
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("15");
  await capture(page, "02-senha-curta-bloqueada.png");
  const rejected = await page.request.post("/api/usuarios", { data: { nome: "Teste", email: "recusado@example.invalid", senha: "curta", perfil: "Aluno" } });
  expect(rejected.status()).toBe(400);
});

test("SEC-BROWSER-02 todas as respostas de usuarios omitem credenciais e internos", async ({ page }) => {
  await login(page);
  const list = await (await page.request.get("/api/usuarios")).json() as Record<string, unknown>[];
  const assertSafe = (record: Record<string, unknown>) => {
    for (const key of ["senhaHash", "senha", "password", "passwordResetTokens", "sessaoVersao"]) expect(Object.keys(record)).not.toContain(key);
  };
  list.forEach(assertSafe);
  const created = await page.request.post("/api/usuarios", { data: { nome: "Pessoa ficticia", email: `temporario-${Date.now()}@example.invalid`, senha: randomBytes(18).toString("hex"), perfil: "Aluno" } });
  expect(created.status()).toBe(201);
  const user = await created.json() as Record<string, unknown>;
  assertSafe(user);
  try {
    const changed = await page.request.patch(`/api/usuarios/${user.id}`, { data: { nome: "Pessoa revisada" } });
    expect(changed.status()).toBe(200);
    assertSafe(await changed.json());
    expect((await page.request.patch(`/api/usuarios/${user.id}`, { data: { senha: "curta" } })).status()).toBe(400);
  } finally { expect((await page.request.delete(`/api/usuarios/${user.id}`)).status()).toBe(200); }
});

test("SEC-BROWSER-03 HTML antigo sanitizado na renderizacao e na gravacao", async ({ page }) => {
  await page.goto("/noticias/conteudo-seguro-aula12");
  await expect(page.getByRole("heading", { name: "Projeto de leitura", exact: true })).toBeVisible();
  await expect(page.locator("#conteudo strong")).toHaveText("destaque");
  expect(await page.evaluate(() => Object.hasOwn(window, "aula12Executed"))).toBe(false);
  expect(await page.locator('#conteudo [onerror], #conteudo a[href^="javascript:"]').count()).toBe(0);
  await capture(page, "03-conteudo-publico-sanitizado.png");
  await login(page);
  const response = await page.request.post("/api/noticias", { data: { titulo: "HTML de teste Aula 12", resumo: "Conteudo ficticio para validar sanitizacao no servidor.", conteudo: '<p>Texto legitimo preservado.</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">teste</a>' } });
  expect(response.status()).toBe(201);
  const record = await response.json() as { id: string; conteudo: string };
  try {
    expect(record.conteudo).toContain("Texto legitimo preservado");
    expect(/<script|onerror|javascript:/i.test(record.conteudo)).toBe(false);
  } finally { await page.request.delete(`/api/noticias/${record.id}`); }
});

test("SEC-BROWSER-04 visitante nao ve rascunho, pagina invisivel ou download inativo", async ({ page }) => {
  await page.goto("/noticias");
  await expect(page.getByText("Rascunho reservado Aula 12", { exact: true })).toHaveCount(0);
  await capture(page, "04-rascunho-nao-publicado.png");
  for (const url of [`/api/noticias/${process.env.SEC_DRAFT_ID}`, "/noticias/rascunho-aula12", `/api/paginas/${process.env.SEC_PAGE_ID}`, "/p/pagina-reservada-aula12", `/api/documentos/${process.env.SEC_DOC_ID}/download`, "/api/uploads/restrito-aula12.pdf"]) {
    expect((await page.request.get(url)).status(), url).toBe(404);
  }
  await login(page);
  expect((await page.request.get(`/api/noticias/${process.env.SEC_DRAFT_ID}`)).status()).toBe(200);
  expect((await page.request.get(`/api/documentos/${process.env.SEC_DOC_ID}/download`)).status()).toBe(200);
  await page.goto("/dashboard/noticias");
  await expect(page.getByText("Rascunho reservado Aula 12", { exact: true })).toBeVisible();
  await capture(page, "05-painel-conteudo-restrito.png");
});

test("SEC-BROWSER-05 conta legada autentica mas nao administra usuarios", async ({ page }) => {
  await login(page, true);
  expect((await page.request.post("/api/usuarios", { data: {} })).status()).toBe(403);
  await page.goto("/dashboard/usuarios");
  await expect(page.getByText("Sem permissão para acessar.", { exact: true })).toBeVisible();
  await capture(page, "06-controle-acesso.png");
});

test("SEC-BROWSER-06 reset exige politica, consome token uma vez e revoga sessao", async ({ page }) => {
  await login(page, true);
  const token = process.env.SEC_RESET_TOKEN;
  const refused = await page.request.post("/api/auth/reset", { data: { token, senha: "curta" } });
  expect(refused.status()).toBe(400);
  const senha = randomBytes(24).toString("hex");
  expect((await page.request.post("/api/auth/reset", { data: { token, senha } })).status()).toBe(200);
  expect((await page.request.post("/api/auth/reset", { data: { token, senha } })).status()).toBe(400);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session-invalidated$/);
});

test("SEC-BROWSER-07 upload falso e excesso recusados; headers e otimizador seguros", async ({ page }) => {
  await login(page);
  for (const buffer of [Buffer.from('<script>alert(1)</script>'), Buffer.alloc(5 * 1024 * 1024 + 1)]) {
    const response = await page.request.post("/api/noticias/upload", { multipart: { arquivo: { name: "fake.png", mimeType: "image/png", buffer } } });
    expect(response.status()).toBe(400);
  }
  const response = await page.request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect((await page.request.get("/_next/image?url=%2Fnoticias%2Fcapa-padrao.svg&w=640&q=75")).status()).toBe(404);
});
