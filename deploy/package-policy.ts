export function safeDeploymentPath(relative: string) {
  if (relative === "prisma/seed.ts" || relative.startsWith("tools/development/")) return false;
  const parts = relative.split("/");
  if (!relative || relative.includes("\\") || relative.startsWith("/")
    || parts.some((part) => !part || part === "." || part === ".."
      || /^(?:node_modules|\.venv|__pycache__|\.git|\.next.*|coverage|test-results|playwright-report|secrets|backups)$/.test(part))) return false;
  const name = parts[parts.length - 1];
  if ((name.startsWith(".env") || /\.env(?:\..*)?$/.test(name))
    && name !== ".env.example" && !name.endsWith(".env.example")) return false;
  if (/\.(?:log|backup|dump|key|pem|p12|pfx|keystore|sqlite3?|db|zip|gz|pyc)$/i.test(name)
    || /(?:credentials.*\.json|^cookies.*\.json|^storage-?state.*\.json|restic-password|^id_(?:rsa|ed25519))/i.test(name)) return false;
  if (name.endsWith(".sql") && !relative.startsWith("prisma/migrations/")) return false;
  return true;
}
