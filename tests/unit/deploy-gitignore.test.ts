import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function ignored(paths: string[]) {
  const result = spawnSync("git", ["check-ignore", "--no-index", "--stdin", "-z"], {
    input: paths.join("\0") + "\0",
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0 && result.status !== 1) throw new Error("Git ignore validation failed.");
  return result.stdout.split("\0").filter(Boolean).sort();
}

describe("Protecao dos arquivos operacionais no Git", () => {
  it("exclui ambientes, credenciais, chaves, dumps e dados de runtime", () => {
    const paths = [
      ".env", ".env.production", "environment.env", "deploy/r2.env", "private.key", "ssh/id_ed25519",
      "certificate.pem", "credentials.json", "tests/cookies.json", "tests/storage-state.json",
      "r2-restic-password", "database.dump", "backup.sql", "backup.sql.gz", "database.sqlite3",
      "uploads/foto.png", "backups/private.txt", "secrets/private.txt", ".next-production-check/server.js",
      "docs/evidencias/dados-privados.json"
    ];
    expect(ignored(paths)).toEqual([...paths].sort());
  });

  it("mantem exemplos, migrations e o codigo das rotas de uploads disponiveis", () => {
    expect(ignored([
      ".env.example", "deploy/production.env.example", "deploy/r2.env.example",
      "prisma/migrations/20260522005000_prepare_sugestao_contato_index/migration.sql",
      "app/api/uploads/[...path]/route.ts", "deploy/r2-backup.py", "DEPLOY_HOSTINGER.md", "docs/MODULO_AVISOS.md"
    ])).toEqual([]);
  });

  it("nao possui ambientes privados, chaves, dumps ou uploads rastreados", () => {
    const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", windowsHide: true }).split("\0").filter(Boolean);
    const unsafe = paths.filter((name) => (
      /(^|\/)(?:\.env(?:\..*)?|[^/]+\.env)$/.test(name) && !name.endsWith(".env.example")
    ) || /^(?:uploads|node_modules|\.venv|\.next[^/]*|coverage|test-results|backups|secrets)\//.test(name)
      || /\.(?:pem|key|p12|pfx|dump|backup|sqlite3?|db|log)$/i.test(name));
    expect(unsafe).toEqual([]);
  });
});
