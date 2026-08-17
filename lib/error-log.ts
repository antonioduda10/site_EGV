import fs from "fs/promises";
import path from "path";

export type ErrorLogInput = {
  source?: string;
  action?: string;
  method?: string;
  path?: string;
  status?: number;
  message?: string;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  detalhes?: Record<string, unknown>;
};

export type ErrorLogEntry = ErrorLogInput & {
  id: string;
  dataHora: string;
};

const errorLogDir = path.resolve(process.env.ERROR_LOG_DIR ?? "logs");

export async function logErrorEvent(input: ErrorLogInput) {
  const now = new Date();
  const entry: ErrorLogEntry = {
    id: createLogId(now),
    dataHora: now.toISOString(),
    source: sanitizeString(input.source, 60) ?? "dashboard",
    action: sanitizeString(input.action, 120),
    method: sanitizeString(input.method, 16),
    path: sanitizeString(input.path, 300),
    status: input.status,
    message: sanitizeString(input.message, 800) ?? "Erro sem mensagem",
    usuarioId: sanitizeString(input.usuarioId, 120),
    usuarioNome: sanitizeString(input.usuarioNome, 180),
    detalhes: sanitizeDetails(input.detalhes)
  };

  await fs.mkdir(errorLogDir, { recursive: true });
  await fs.appendFile(getErrorLogFile(now), `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export async function readErrorLogEntries(limit = 80) {
  try {
    const files = await fs.readdir(errorLogDir);
    const logFiles = files
      .filter((file) => /^errors-\d{4}-\d{2}-\d{2}\.log$/.test(file))
      .sort()
      .reverse()
      .slice(0, 30);

    const entries: ErrorLogEntry[] = [];
    for (const file of logFiles) {
      const content = await fs.readFile(path.join(errorLogDir, file), "utf8");
      for (const line of content.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const parsed = parseEntry(line);
        if (parsed) entries.push(parsed);
      }
    }

    return entries
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}

function getErrorLogFile(date: Date) {
  return path.join(errorLogDir, `errors-${dateKey(date)}.log`);
}

function createLogId(date: Date) {
  return `${date.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseEntry(line: string): ErrorLogEntry | null {
  try {
    const parsed = JSON.parse(line) as Partial<ErrorLogEntry>;
    if (!parsed.id || !parsed.dataHora) return null;
    return {
      id: String(parsed.id),
      dataHora: String(parsed.dataHora),
      source: sanitizeString(parsed.source, 60),
      action: sanitizeString(parsed.action, 120),
      method: sanitizeString(parsed.method, 16),
      path: sanitizeString(parsed.path, 300),
      status: typeof parsed.status === "number" ? parsed.status : undefined,
      message: sanitizeString(parsed.message, 800),
      usuarioId: sanitizeString(parsed.usuarioId, 120),
      usuarioNome: sanitizeString(parsed.usuarioNome, 180),
      detalhes: sanitizeDetails(parsed.detalhes)
    };
  } catch {
    return null;
  }
}

function sanitizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function sanitizeDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, detail] of Object.entries(value)) {
    if (typeof detail === "string") output[key] = sanitizeString(detail, 500);
    if (typeof detail === "number" || typeof detail === "boolean") output[key] = detail;
  }
  return Object.keys(output).length ? output : undefined;
}
