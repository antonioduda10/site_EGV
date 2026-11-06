import { expect, test } from "@playwright/test";

const origin = "https://escolagetuliovargas.com.br";
const paths = [
  "/", "/noticias", "/eventos", "/documentos", "/galeria", "/galeria/fotos",
  "/galeria/videos", "/secretaria", "/contato", "/politica-privacidade", "/cookies", "/termos",
  "/noticias/projeto-leitura-teste", "/p/escola-teste"
];

test("SEO-BROWSER-01 XML valido inclui publicacoes mas nao rascunhos ou paginas invisiveis", async ({ page, request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/xml");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return {
      error: Boolean(document.querySelector("parsererror")),
      namespace: document.documentElement.namespaceURI,
      urls: [...document.querySelectorAll("url > loc")].map((node) => node.textContent),
      dates: [...document.querySelectorAll("lastmod")].map((node) => node.textContent)
    };
  }, await response.text());
  expect(result.error).toBe(false);
  expect(result.namespace).toBe("http://www.sitemaps.org/schemas/sitemap/0.9");
  for (const path of paths) expect(result.urls).toContain(new URL(path, origin).toString());
  expect(result.urls).not.toContain(`${origin}/noticias/rascunho-aula12`);
  expect(result.urls).not.toContain(`${origin}/p/pagina-reservada-aula12`);
  expect(result.urls.some((url) => url && /^\/(api|dashboard|login|recuperar)(\/|$)/.test(new URL(url).pathname))).toBe(false);
  expect(result.urls.some((url) => url && new URL(url).origin !== origin)).toBe(false);
  expect(new Set(result.urls).size).toBe(result.urls.length);
  expect(result.dates.length).toBeGreaterThan(0);
  expect(result.dates.every((date) => date && Number.isFinite(Date.parse(date)))).toBe(true);
});

test("SEO-BROWSER-02 robots publico preserva recursos e todas as paginas possuem canonical indexavel", async ({ page, request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const content = await response.text();
  for (const rule of ["Allow: /", "Allow: /api/uploads/", "Disallow: /dashboard", "Disallow: /api/", `Sitemap: ${origin}/sitemap.xml`]) expect(content).toContain(rule);
  expect(content).not.toMatch(/Disallow:\s*\/(?:_next|uploads)/);
  for (const path of paths) {
    const pageResponse = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(pageResponse?.status(), path).toBe(200);
    const canonical = await page.locator('head link[rel="canonical"]').getAttribute("href");
    expect(canonical, path).toBeTruthy();
    expect(new URL(canonical!).toString(), path).toBe(new URL(path, origin).toString());
    const robots = await page.locator('head meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("content")).join(" "));
    expect(robots, path).not.toMatch(/\b(?:noindex|none)\b/i);
    expect(pageResponse?.headers()["x-robots-tag"] ?? "", path).not.toMatch(/\b(?:noindex|none)\b/i);
  }
});

test("SEO-BROWSER-03 noindex limitado as telas de autenticacao e painel", async ({ page }) => {
  for (const path of ["/login", "/recuperar"]) {
    await page.goto(path);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
