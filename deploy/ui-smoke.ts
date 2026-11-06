import { chromium, type Browser } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";

async function main() {
  const httpsOrigin = process.env.PORTAL_SMOKE_BASE_URL;
  if (httpsOrigin && httpsOrigin !== "https://escolagetuliovargas.com.br") throw new Error("Unapproved HTTPS verification origin.");
  // Capture only the synthetic test account in memory; never print or persist its credentials.
  const state = JSON.parse(execFileSync("ssh", ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "root@179.66.135.203", "cat /opt/portal-egv/shared/smoke/smoke-state.json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as { email: string; password: string };
  const tunnel = httpsOrigin ? undefined : spawn("ssh", ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ExitOnForwardFailure=yes", "-N", "-L", "127.0.0.1:3301:127.0.0.1:3000", "root@179.66.135.203"], { windowsHide: true, stdio: "ignore" });
  const base = httpsOrigin || "http://127.0.0.1:3301";
  let browser: Browser | undefined;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { ready = (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(10000) })).ok; } catch { /* Service not ready yet. */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error("Verification origin unavailable.");
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(`${base}/login`);
    await page.getByLabel("Email", { exact: true }).fill(state.email);
    await page.getByLabel("Senha", { exact: true }).fill(state.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/dashboard");
    if (httpsOrigin) {
      const sessionCookies = (await page.context().cookies()).filter((cookie) => cookie.name.includes("session-token"));
      if (!sessionCookies.length || sessionCookies.some((cookie) => !cookie.secure || !cookie.httpOnly)) throw new Error("Session cookie is not protected.");
    }
    const adminPaths = ["/dashboard", "/dashboard/noticias", "/dashboard/eventos", "/dashboard/documentos", "/dashboard/paginas", "/dashboard/banners", "/dashboard/galeria/fotos", "/dashboard/galeria/videos", "/dashboard/contatos", "/dashboard/usuarios", "/dashboard/secretaria", "/dashboard/config", "/dashboard/relatorios"];
    for (const path of adminPaths) {
      const response = await page.goto(`${base}${path}`);
      if (response?.status() !== 200 || !await page.locator("#conteudo h1").first().isVisible()) throw new Error("Administrative screen unavailable.");
    }
    const publicPaths = ["/", "/noticias", "/eventos", "/documentos", "/galeria", "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato", "/cookies", "/politica-privacidade", "/termos"];
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of publicPaths) {
        const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
        if (response?.status() !== 200) throw new Error("Public screen unavailable.");
        await page.waitForTimeout(500);
        const valid = await page.evaluate(() => ({
          fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0 && image.getAttribute("src")).length
        }));
        if (!valid.fits || valid.brokenImages) throw new Error("Public layout or image failed validation.");
      }
    }
    await page.goto(`${base}/dashboard`);
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.waitForURL(`${base}/login`);
    const session = await (await page.context().request.get(`${base}/api/auth/session`)).json();
    if (session.user?.id) throw new Error("Logout did not clear the session.");
    await page.goto(`${base}/dashboard`);
    await page.waitForURL(`${base}/login`);
    console.log(JSON.stringify({ origin: base, browserLogin: true, secureCookies: Boolean(httpsOrigin), adminScreens: adminPaths.length, publicScreens: publicPaths.length, viewports: 2, brokenImages: 0, horizontalOverflow: false, logout: true, protectedDashboardAfterLogout: true, passwordsPrinted: false }));
  } finally {
    await browser?.close();
    tunnel?.kill();
  }
}
main().catch(() => { console.error("Browser deployment check failed; no credentials, cookies or page content were printed."); process.exitCode = 1; });
