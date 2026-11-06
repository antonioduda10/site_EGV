const sensitiveKey = /senha|password|hash|secret|token|cookie|authorization|database.?url|cpf|telefone|email|response|payload/i;

export function redactLogText(value: string) {
  return value
    .replace(/(?:postgres(?:ql)?|mysql):\/\/[^\s"'<>]+/gi, "[conexao omitida]")
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, "[hash omitido]")
    .replace(/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*){2,4}/g, "[token omitido]")
    .replace(/((?:password|senha|secret|token|cookie|authorization|database_url)\s*[=:]\s*)[^\s,;]+/gi, "$1[omitido]");
}

export function redactLogDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, detail] of Object.entries(value)) {
    if (sensitiveKey.test(key)) continue;
    if (typeof detail === "number" || typeof detail === "boolean") result[key] = detail;
    else if (typeof detail === "string") result[key] = redactLogText(detail).slice(0, 500);
  }
  return Object.keys(result).length ? result : undefined;
}

export function logPath(value?: string) {
  if (!value) return undefined;
  try { return new URL(value, "http://localhost").pathname.slice(0, 300); }
  catch { return undefined; }
}
