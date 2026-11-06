import path from "path";
import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import { validateUpload } from "./upload-policy";
import { assertRealUploadPath, resolvePathInsideUploads } from "./upload-path";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

export async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export function safeFilename(original: string) {
  const cleaned = original.toLowerCase().replace(/[^a-z0-9.-]+/gi, "-");
  const stamp = Date.now();
  return `${stamp}-${cleaned}`;
}

export function uploadPath(filename: string) {
  return resolvePathInsideUploads(filename);
}

export async function uploadFile(file: File, folder?: string) {
  const destination = folder ?? "midia";
  const { bytes, extension } = await validateUpload(file, destination);
  await ensureUploadDir();
  const filename = `${randomUUID()}${extension}`;
  const filepath = resolvePathInsideUploads(`${destination}/${filename}`);
  const finalPath = path.dirname(filepath);
  await assertRealUploadPath(filepath, true);
  await fs.mkdir(finalPath, { recursive: true });
  await assertRealUploadPath(filepath, true);
  await fs.writeFile(filepath, bytes, { flag: "wx" });
  const publicPath = `${destination}/${filename}`;
  return `/api/uploads/${publicPath.replace(/\\/g, "/")}`;
}

export async function deleteFile(filepath: string) {
  if (!filepath) return;
  try {
    const targetPath = await assertRealUploadPath(resolvePathInsideUploads(filepath));
    await fs.unlink(targetPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
