import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";

const PREFIX = "egv-bcrypt-sha384-v1:";

function prehash(password: string, salt: string) {
  // A per-record random salt prevents reuse of a digest leaked by a different system.
  // Base64 SHA-384 is 64 ASCII bytes, below bcrypt's 72-byte input limit.
  return createHmac("sha384", Buffer.from(salt, "hex")).update(password, "utf8").digest("base64");
}

export async function hashPassword(password: string) {
  const prehashSalt = randomBytes(16).toString("hex");
  const salt = await bcrypt.genSalt(10);
  return `${PREFIX}${prehashSalt}:${await bcrypt.hash(prehash(password, prehashSalt), salt)}`;
}

export async function verifyPassword(password: string, hash: string) {
  if (!hash.startsWith(PREFIX)) return bcrypt.compare(password, hash);
  const [salt, encoded] = hash.slice(PREFIX.length).split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !encoded) return false;
  return bcrypt.compare(prehash(password, salt), encoded);
}
