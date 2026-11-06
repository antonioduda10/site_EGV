import path from "node:path";
import fs from "fs/promises";

export class UploadPathError extends Error {
  readonly status = 400;
  constructor() { super("Caminho de arquivo inválido."); }
}

export function getUploadRoot() { return path.resolve(process.env.UPLOAD_DIR ?? "./uploads"); }

function assertContained(root: string, target: string) {
  const relative = path.relative(root, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new UploadPathError();
}

export function resolvePathInsideUploads(value: string, root = getUploadRoot()): string {
  if (typeof value !== "string" || !value || /[\x00-\x1f]/.test(value)) throw new UploadPathError();
  let normalized = value.replace(/\\/g, "/");
  for (let i = 0; i < 3 && normalized.includes("%"); i++) {
    try { normalized = decodeURIComponent(normalized); } catch { throw new UploadPathError(); }
  }
  if (normalized.includes("%") || normalized.split("/").includes("..")) throw new UploadPathError();
  if (/^https?:\/\//i.test(normalized)) {
    const parsed = new URL(normalized);
    if (!parsed.pathname.startsWith("/api/uploads/")) throw new UploadPathError();
    normalized = parsed.pathname;
  }
  if (normalized.startsWith("/api/uploads/")) normalized = normalized.slice("/api/uploads/".length);
  else if (normalized.startsWith("uploads/")) normalized = normalized.slice("uploads/".length);
  else if (path.isAbsolute(normalized)) {
    assertContained(root, path.resolve(normalized));
    normalized = path.relative(root, normalized).replace(/\\/g, "/");
  }
  if (/[<>:"|?*\x00-\x1f]/.test(normalized) || path.win32.isAbsolute(normalized) || normalized.startsWith("/")) throw new UploadPathError();
  const target = path.resolve(root, normalized);
  assertContained(root, target);
  return target;
}

export async function assertRealUploadPath(target: string, parentOnly = false): Promise<string> {
  const root = getUploadRoot();
  assertContained(root, target);
  const rootReal = await fs.realpath(root);
  let checked = parentOnly ? path.dirname(target) : target;
  let real: string;
  for (;;) {
    try { real = await fs.realpath(checked); break; }
    catch (error) {
      if (!parentOnly || checked === root || !error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") throw error;
      checked = path.dirname(checked);
    }
  }
  if (real !== rootReal) assertContained(rootReal, real);
  return parentOnly ? target : real;
}
