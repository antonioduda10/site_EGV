export function normalizeUploadAssetUrl(url?: string | null) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/api/uploads/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/api/uploads/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function rewriteUploadUrlsInHtml(html?: string | null) {
  const source = html ?? "";
  if (!source) return source;

  return source.replace(
    /(src|href)=("|')https?:\/\/[^"']*(\/api\/uploads\/[^"']*)("|')/gi,
    (_match, attr, quote, pathPart, endQuote) => {
      const normalizedPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
      return `${attr}=${quote}${normalizedPath}${endQuote}`;
    }
  );
}

export function extractFirstImageSrcFromHtml(html?: string | null) {
  const source = rewriteUploadUrlsInHtml(html ?? "");
  const quotedMatch = source.match(/<img\b[^>]*\bsrc=(["'])(.*?)\1/i);
  const unquotedMatch = quotedMatch ? null : source.match(/<img\b[^>]*\bsrc=([^\s>]+)/i);
  const src = quotedMatch?.[2] ?? unquotedMatch?.[1] ?? "";

  return normalizeUploadAssetUrl(src) || null;
}
