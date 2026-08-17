import path from "path";
import fs from "fs/promises";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
const uploadDirResolved = path.resolve(uploadDir);

export async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export function safeFilename(original: string) {
  const cleaned = original.toLowerCase().replace(/[^a-z0-9.-]+/gi, "-");
  const stamp = Date.now();
  return `${stamp}-${cleaned}`;
}

export function uploadPath(filename: string) {
  return path.join(uploadDir, filename);
}

export async function uploadFile(file: File, folder?: string) {
  await ensureUploadDir();
  const filename = safeFilename(file.name);
  const finalPath = folder ? path.join(uploadDir, folder) : uploadDir;
  await fs.mkdir(finalPath, { recursive: true });
  const filepath = path.join(finalPath, filename);
  const bytes = await file.arrayBuffer();
  await fs.writeFile(filepath, Buffer.from(bytes));
  const publicPath = folder ? `${folder}/${filename}` : filename;
  return `/api/uploads/${publicPath.replace(/\\/g, "/")}`;
}

export async function deleteFile(filepath: string) {
  if (!filepath) return;
  try {
    const normalized = filepath.replace(/\\/g, "/");
    let targetPath = filepath;

    if (normalized.startsWith("/api/uploads/")) {
      const relative = normalized.replace("/api/uploads/", "");
      targetPath = path.resolve(uploadDirResolved, relative);
    } else if (normalized.includes("/uploads/")) {
      const [, relative] = normalized.split("/uploads/");
      if (relative) {
        targetPath = path.resolve(uploadDirResolved, relative);
      }
    }

    await fs.unlink(targetPath);
  } catch {
    // ignora erro se arquivo não existir
  }
}
