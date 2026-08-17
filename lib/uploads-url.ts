export function toPublicUrl(storedPath?: string | null) {
  if (!storedPath) return "";
  if (storedPath.startsWith("/api/uploads/")) return storedPath;
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    try {
      const parsed = new URL(storedPath);
      if (parsed.pathname.startsWith("/api/uploads/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return storedPath;
    }
    return storedPath;
  }

  const normalized = storedPath.replace(/\\/g, "/");
  if (normalized.startsWith("uploads/")) {
    return `/api/uploads/${normalized.replace(/^uploads\//, "")}`;
  }
  const marker = "/uploads/";
  const index = normalized.lastIndexOf(marker);
  if (index !== -1) {
    const relative = normalized.slice(index + marker.length);
    return `/api/uploads/${relative}`;
  }

  return storedPath;
}
