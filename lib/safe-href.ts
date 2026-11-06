export function safeHref(value: unknown, fallback = "#"): string {
  if (typeof value !== "string") return fallback;
  const href = value.trim();
  if (!href || /[\x00-\x20\x7f\\]/.test(href) || href.startsWith("//")) return fallback;
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? href : fallback;
  } catch { return !href.includes(":") ? href : fallback; }
}
