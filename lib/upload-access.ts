import path from "node:path";
import sanitizeHtml from "sanitize-html";
import { db } from "./db";
import { hasContentPermission } from "./content-access";
import { Permissions } from "./permissions";
import { publicNewsWhere } from "./publication";
import { getUploadRoot, resolvePathInsideUploads } from "./upload-path";
import { getHomeAlertsJson } from "./home-alerts-config";
import { parseHomeAlerts } from "./home-alerts";

function sameUpload(value: string | null | undefined, target: string) {
  try {
    const resolved = resolvePathInsideUploads(value ?? "");
    return process.platform === "win32" ? resolved.toLowerCase() === target.toLowerCase() : resolved === target;
  } catch { return false; }
}

function richUsesUpload(html: string, target: string) {
  let found = false;
  sanitizeHtml(html, { transformTags: { img: (tagName, attribs) => {
    if (sameUpload(attribs.src, target)) found = true;
    return { tagName, attribs };
  } } });
  return found;
}

export async function canReadUpload(target: string): Promise<boolean> {
  const filename = path.basename(target);
  const relative = path.relative(getUploadRoot(), target).replace(/\\/g, "/");
  const folder = relative.split("/")[0];
  const legacy = !relative.includes("/");
  // Check documents first even if a legacy record points at a different upload folder.
  const docs = await db.arquivoDocumento.findMany({ where: { caminho: { endsWith: filename } }, select: { caminho: true, status: true } });
  const matchingDocs = docs.filter((doc) => sameUpload(doc.caminho, target));
  if (matchingDocs.length) return matchingDocs.every((doc) => doc.status === "ATIVO") || await hasContentPermission(Permissions.DOCS_WRITE);
  if (folder === "documentos") return hasContentPermission(Permissions.DOCS_WRITE);

  if (folder === "noticias" || legacy) {
    const authorized = await hasContentPermission(Permissions.NEWS_READ, Permissions.NEWS_WRITE, Permissions.NEWS_APPROVE);
    if (authorized && !legacy) return true;
    const rows = await db.noticia.findMany({ where: { AND: [authorized ? {} : publicNewsWhere(), { OR: [{ imagemCapa: { endsWith: filename } }, { conteudo: { contains: filename } }] }] }, select: { imagemCapa: true, conteudo: true } });
    if (rows.some((row) => sameUpload(row.imagemCapa, target) || richUsesUpload(row.conteudo, target))) return true;
  }
  if (folder === "eventos" || legacy) {
    const authorized = await hasContentPermission(Permissions.EVENTS_WRITE);
    if (authorized && !legacy) return true;
    const rows = await db.evento.findMany({ where: { status: authorized ? undefined : "PUBLICADO", conteudo: { contains: filename } }, select: { conteudo: true } });
    if (rows.some((row) => richUsesUpload(row.conteudo, target))) return true;
  }
  if (folder === "paginas" || legacy) {
    const authorized = await hasContentPermission(Permissions.PAGES_WRITE);
    if (authorized && !legacy) return true;
    const rows = await db.paginaInstitucional.findMany({ where: { visivel: authorized ? undefined : true, conteudo: { contains: filename } }, select: { conteudo: true } });
    if (rows.some((row) => richUsesUpload(row.conteudo, target))) return true;
  }
  if (folder === "banners" || legacy) {
    const authorized = await hasContentPermission(Permissions.BANNERS_WRITE);
    if (authorized && !legacy) return true;
    const rows = await db.banner.findMany({ where: { ativo: authorized ? undefined : true, imagem: { endsWith: filename } }, select: { imagem: true } });
    if (rows.some((row) => sameUpload(row.imagem, target))) return true;
  }
  if (folder === "secretaria" || legacy) {
    const authorized = await hasContentPermission(Permissions.PAGES_WRITE);
    if (authorized && !legacy) return true;
    const rows = await db.secretariaServidor.findMany({ where: { ativo: authorized ? undefined : true, fotoUrl: { endsWith: filename } }, select: { fotoUrl: true } });
    if (rows.some((row) => sameUpload(row.fotoUrl, target))) return true;
  }
  if (folder === "midia" || legacy) {
    if (!legacy && await hasContentPermission(Permissions.MEDIA_WRITE)) return true;
    const rows = await db.midia.findMany({ where: { caminho: { endsWith: filename } }, select: { caminho: true } });
    if (rows.some((row) => sameUpload(row.caminho, target))) return true;
  }
  const noticeImage = relative.startsWith("config/avisos/");
  if (noticeImage || legacy) {
    const authorized = await hasContentPermission(Permissions.ALERTS_WRITE);
    if (authorized && noticeImage) return true;
    const alerts = parseHomeAlerts(await getHomeAlertsJson());
    if (alerts.some((alert) => (authorized || alert.ativo !== false) && sameUpload(alert.imagemUrl, target))) return true;
    if (noticeImage) return false;
  }
  if (folder === "config" || legacy) {
    const authorized = await hasContentPermission(Permissions.CONFIG_WRITE);
    if (authorized && !legacy) return true;
    const config = await db.configuracaoSite.findFirst({ select: { logoUrl: true, politicaPrivacidade: true, cookies: true, termos: true } });
    if (config && (sameUpload(config.logoUrl, target) || [config.politicaPrivacidade, config.cookies, config.termos].some((html) => richUsesUpload(html ?? "", target)))) return true;
  }
  return false;
}
