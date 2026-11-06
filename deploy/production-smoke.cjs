const fs = require("node:fs");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = process.env.PORTAL_SMOKE_BASE_URL || "http://app:3000";
if (!["http://app:3000", "https://escolagetuliovargas.com.br"].includes(base)) throw new Error("Unapproved verification origin.");
const stateFile = "/state/smoke-state.json";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJXkAAAAASUVORK5CYII=", "base64");
const check = (condition) => { if (!condition) throw new Error("Deployment assertion failed."); };
const cookies = new Map();
let phase = "initializing";
let lastResponseStatus;
async function request(path, init = {}, authenticated = true) {
  const headers = new Headers(init.headers);
  if (authenticated && cookies.size) headers.set("cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
  const response = await fetch(base + path, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
  lastResponseStatus = response.status;
  if (authenticated) for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return response;
}
const json = (method, body) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
async function login(state) {
  phase = "login";
  const csrf = await (await request("/api/auth/csrf")).json();
  const response = await request("/api/auth/callback/credentials", { method: "POST", body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: state.email, password: state.password, callbackUrl: "/dashboard", json: "true" }) });
  check(response.status === 200);
  const session = await (await request("/api/auth/session")).json();
  check(session.user?.id === state.userId && !session.invalidated);
}
async function logout() {
  phase = "logout";
  const csrf = await (await request("/api/auth/csrf")).json();
  check((await request("/api/auth/signout", { method: "POST", body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: "/login", json: "true" }) })).status === 200);
  check(!(await (await request("/api/auth/session")).json()).user?.id);
  cookies.clear();
}
const save = (state) => fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
async function prepare() {
  phase = "prepare";
  check(!fs.existsSync(stateFile));
  const token = crypto.randomBytes(12).toString("hex");
  const state = { email: `deployment-check-${token}@example.invalid`, password: crypto.randomBytes(24).toString("hex"), token };
  const perfil = await db.perfil.findUnique({ where: { nome: "Admin" } });
  check(perfil);
  const user = await db.usuario.create({ data: { nome: "Verificacao temporaria de implantacao", email: state.email, senhaHash: await bcrypt.hash(state.password, 10), perfis: { create: { perfilId: perfil.id } } }, select: { id: true } });
  state.userId = user.id;
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600, flag: "wx" });
  await login(state);
  phase = "public-pages";
  const paths = ["/", "/noticias", "/eventos", "/documentos", "/galeria", "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato", "/cookies", "/termos", "/politica-privacidade"];
  const [publishedNews, pages, events] = await Promise.all([
    db.noticia.findMany({ where: { status: "PUBLICADO", OR: [{ dataPublicacao: null }, { dataPublicacao: { lte: new Date() } }] }, select: { slug: true } }),
    db.paginaInstitucional.findMany({ where: { visivel: true }, select: { slug: true } }),
    db.evento.findMany({ where: { status: "PUBLICADO" }, select: { id: true } })
  ]);
  paths.push(...publishedNews.map((n) => `/noticias/${n.slug}`), ...pages.map((p) => `/p/${p.slug}`), ...events.map((e) => `/eventos/${e.id}`));
  for (const path of paths) check((await request(path, {}, false)).status === 200);
  const alias = await request("/galeria/midias", {}, false);
  check([307, 308].includes(alias.status) && alias.headers.get("location")?.endsWith("/galeria/videos"));
  check((await request("/dashboard")).status === 200);
  phase = "users";
  const users = await (await request("/api/usuarios")).json();
  check(Array.isArray(users) && users.every((row) => !Object.hasOwn(row, "senhaHash")));
  const limitedPassword = crypto.randomBytes(24).toString("hex");
  const limitedEmail = `deployment-limited-${token}@example.invalid`;
  const limited = await request("/api/usuarios", json("POST", { nome: "Conta ficticia de verificacao", email: limitedEmail, senha: limitedPassword, perfil: "Docente" }));
  check(limited.status === 201);
  const limitedUser = await limited.json();
  state.limitedUserId = limitedUser.id;
  save(state);
  check(!Object.hasOwn(limitedUser, "senhaHash"));
  const limitedUpdated = await request(`/api/usuarios/${limitedUser.id}`, json("PATCH", { nome: "Conta ficticia revisada" }));
  check(limitedUpdated.status === 200 && !Object.hasOwn(await limitedUpdated.json(), "senhaHash"));
  await logout();
  await login({ userId: limitedUser.id, email: limitedEmail, password: limitedPassword });
  phase = "rbac";
  check((await request("/api/usuarios")).status === 403);
  check((await request("/api/noticias", json("POST", { titulo: "Bloqueio de permissao ficticio" }))).status === 403);
  await logout();
  await login(state);
  phase = "news-publication";
  const created = await request("/api/noticias", json("POST", { titulo: `Implantacao smoke ${token}`, resumo: "Registro ficticio temporario para verificar a implantacao.", conteudo: '<p>Conteudo legitimo de verificacao.</p><script>window.fake=true</script>' }));
  check(created.status === 201);
  const news = await created.json();
  state.newsId = news.id;
  check(news.status === "RASCUNHO" && !news.conteudo.includes("<script"));
  save(state);
  check((await request(`/api/noticias/${news.id}`, {}, false)).status === 404);
  check((await request(`/api/noticias/${news.id}`, json("PATCH", { titulo: `Implantacao smoke revisada ${token}` }))).status === 200);
  check((await request(`/api/noticias/${news.id}/enviar-aprovacao`, { method: "POST" })).status === 200);
  check((await request(`/api/noticias/${news.id}/aprovar`, { method: "POST" })).status === 200);
  check((await request(`/api/noticias/${news.id}`, {}, false)).status === 200);
  check((await request(`/noticias/${news.slug}`, {}, false)).status === 200);
  phase = "upload";
  const form = new FormData();
  form.set("nome", `Verificacao de persistencia ${token}`);
  form.set("categoria", "Verificacao temporaria");
  form.set("ano", "2026");
  form.set("arquivo", new File([png], "verificacao.png", { type: "image/png" }));
  const uploaded = await request("/api/documentos", { method: "POST", body: form });
  check(uploaded.status === 201);
  const doc = await uploaded.json();
  state.docId = doc.id;
  state.uploadUrl = doc.caminho;
  save(state);
  check((await request(`/api/documentos/${doc.id}`, json("PATCH", { nome: `Persistencia revisada ${token}`, categoria: "Verificacao temporaria", ano: 2026, ordem: 0 }))).status === 200);
  const file = await request(doc.caminho, {}, false);
  check(file.status === 200 && Buffer.from(await file.arrayBuffer()).equals(png));
  await logout();
  console.log(JSON.stringify({ origin: base, authenticated: true, publicPages: paths.length, galleryAlias: true, dashboard: true, userDtoSafe: true, userCreateEdit: true, rbacDenied: true, newsCrudAndPublication: true, uploadAndRead: true, logout: true, preparedForRestart: true }));
}
async function verifyAndCleanup(verifyPersistence) {
  phase = "verify-state";
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  check(/^deployment-check-[a-f0-9]{24}@example\.invalid$/.test(state.email));
  const owned = await db.usuario.findFirst({ where: { id: state.userId, email: state.email } });
  check(owned);
  await login(state);
  if (verifyPersistence) {
    phase = "persistence";
    check(await db.noticia.findFirst({ where: { id: state.newsId, autorId: state.userId, status: "PUBLICADO" } }));
    const file = await request(state.uploadUrl, {}, false);
    check(file.status === 200 && Buffer.from(await file.arrayBuffer()).equals(png));
    check((await request(`/api/documentos/${state.docId}/download`, {}, false)).status === 200);
  }
  phase = "cleanup";
  if (state.docId) {
    const doc = await db.arquivoDocumento.findUnique({ where: { id: state.docId } });
    if (doc) {
      check(doc.caminho === state.uploadUrl && doc.nome.includes(state.token));
      check((await request(`/api/documentos/${state.docId}`, { method: "DELETE" })).status === 200);
    }
    check((await request(state.uploadUrl, {}, false)).status === 404);
  }
  if (state.newsId && await db.noticia.findFirst({ where: { id: state.newsId, autorId: state.userId } })) check((await request(`/api/noticias/${state.newsId}`, { method: "DELETE" })).status === 200);
  if (state.limitedUserId) {
    const limited = await db.usuario.findUnique({ where: { id: state.limitedUserId }, select: { email: true } });
    if (limited) {
      check(limited.email === `deployment-limited-${state.token}@example.invalid`);
      check((await request(`/api/usuarios/${state.limitedUserId}`, { method: "DELETE" })).status === 200);
    }
  }
  await logout();
  await db.$transaction(async (tx) => {
    await tx.logAuditoria.deleteMany({ where: { OR: [{ usuarioResponsavelId: state.userId }, { idRegistroAfetado: { in: [state.newsId, state.docId, state.limitedUserId].filter(Boolean) } }] } });
    await tx.usuarioPerfil.deleteMany({ where: { usuarioId: state.userId } });
    await tx.usuario.delete({ where: { id: state.userId } });
  });
  fs.unlinkSync(stateFile);
  console.log(JSON.stringify({ restartPreservedDatabase: verifyPersistence, restartPreservedUpload: verifyPersistence, reauthentication: true, logout: true, temporaryRecordsCleaned: true }));
}
const mode = process.argv[2];
(mode === "prepare" ? prepare() : ["verify", "cleanup"].includes(mode) ? verifyAndCleanup(mode === "verify") : Promise.reject(new Error("Invalid mode"))).catch(() => { console.error(JSON.stringify({ deploymentCheckFailed: true, phase, lastResponseStatus, privateStateRetained: true })); process.exitCode = 1; }).finally(() => db.$disconnect());
