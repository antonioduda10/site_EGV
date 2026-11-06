import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

const MB = 1024 * 1024;
const images = ["image/jpeg", "image/png", "image/webp"];
const documents = [...images.filter((mime) => mime !== "image/webp"), "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const media = [...images, "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4", "video/mp4", "video/webm", "video/ogg", "video/quicktime"];

export const uploadPolicies = {
  noticias: { mimes: images, maxBytes: 5 * MB },
  eventos: { mimes: images, maxBytes: 5 * MB },
  paginas: { mimes: images, maxBytes: 5 * MB },
  secretaria: { mimes: images, maxBytes: 5 * MB },
  banners: { mimes: images, maxBytes: 5 * MB },
  config: { mimes: images, maxBytes: 5 * MB },
  "config/avisos": { mimes: images, maxBytes: 5 * MB },
  documentos: { mimes: documents, maxBytes: 10 * MB },
  midia: { mimes: media, maxBytes: 100 * MB }
} as const;

export type UploadFolder = keyof typeof uploadPolicies;

export class UploadValidationError extends Error {
  readonly status = 400;
}

const extensions: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "audio/mpeg": [".mp3"], "audio/wav": [".wav"], "audio/ogg": [".ogg", ".oga", ".opus"],
  "audio/webm": [".webm"], "audio/mp4": [".m4a", ".mp4"],
  "video/mp4": [".mp4"], "video/webm": [".webm"], "video/ogg": [".ogv", ".ogg"], "video/quicktime": [".mov"]
};

function normalizeMime(value: string) {
  value = value.split(";")[0].trim();
  if (value === "audio/mp3") return "audio/mpeg";
  if (["audio/vnd.wave", "audio/x-wav"].includes(value)) return "audio/wav";
  if (value === "audio/opus") return "audio/ogg";
  return value;
}

export async function verifiedStoredMime(bytes: Buffer, extension: string): Promise<string | null> {
  const detected = await fileTypeFromBuffer(bytes).catch(() => undefined);
  if (!detected) return null;
  const mime = normalizeMime(detected.mime);
  return extensions[mime]?.includes(extension.toLowerCase()) ? mime : null;
}

export async function validateUpload(file: File, folder: string) {
  if (!Object.hasOwn(uploadPolicies, folder)) throw new UploadValidationError("Destino de upload inválido.");
  const policy = uploadPolicies[folder as UploadFolder];
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.name !== "string" || !file.name || /[\x00-\x1f]/.test(file.name)) {
    throw new UploadValidationError("Arquivo inválido.");
  }
  const mime = normalizeMime(file.type.toLowerCase());
  const extension = path.extname(file.name).toLowerCase();
  if (!(policy.mimes as readonly string[]).includes(mime) || !extensions[mime]?.includes(extension)) {
    throw new UploadValidationError("Tipo ou extensão de arquivo não permitido.");
  }
  const maxBytes = mime.startsWith("image/") ? Math.min(policy.maxBytes, 5 * MB) : policy.maxBytes;
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
    throw new UploadValidationError(`Arquivo deve ter conteúdo e não ultrapassar ${maxBytes / MB} MB.`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== file.size || bytes.length > maxBytes) throw new UploadValidationError("Tamanho de arquivo inválido.");
  if (await verifiedStoredMime(bytes, extension) !== mime) throw new UploadValidationError("O conteúdo do arquivo não corresponde ao tipo informado.");
  return { bytes, mime, extension };
}
