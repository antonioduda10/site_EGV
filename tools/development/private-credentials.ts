import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function developmentPassword() {
  return randomBytes(32).toString("base64url");
}

export function writePrivateCredentials(records: unknown[], purpose: string) {
  const base = process.platform === "win32" ? path.join(os.homedir(), "AppData", "Local") : path.join(os.homedir(), ".local", "share");
  const directory = path.join(base, "PortalEGV", "development");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (lstatSync(directory).isSymbolicLink()) throw new Error("Diretorio privado invalido.");
  if (process.platform === "win32") {
    const sid = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
    if (!/^S-1-[0-9-]+$/.test(sid)) throw new Error("Usuario local nao identificado.");
    execFileSync("icacls.exe", [directory, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"], { stdio: "ignore", windowsHide: true });
  } else chmodSync(directory, 0o700);
  const filename = path.join(directory, `local-credentials-${randomUUID()}.json`);
  writeFileSync(filename, JSON.stringify({ environment: "development-only", purpose, state: "prepared", createdAt: new Date().toISOString(), records }, null, 2), { mode: 0o600, flag: "wx" });
  return filename;
}

export function markCredentialsApplied(filename: string) {
  const record = JSON.parse(readFileSync(filename, "utf8"));
  record.state = "applied";
  writeFileSync(filename, JSON.stringify(record, null, 2), { mode: 0o600 });
}
