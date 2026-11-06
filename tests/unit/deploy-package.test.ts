import { describe, expect, it } from "vitest";
import { safeDeploymentPath } from "@/deploy/package-policy";

describe("Pacote de producao sem arquivos privados", () => {
  it.each([
    "deploy/r2.env", "deploy/environment.env", "app/.env.production", "deploy/r2-restic-password",
    "public/private.pem", "deploy/credentials.json", "deploy/cookies.json", "deploy/storage-state.json",
    "public/database.dump", "app/backup.sql", "app/node_modules/a.js", "../outside.ts", "/absolute.ts",
    "deploy/__pycache__/r2-backup.cpython-312.pyc", "deploy/private.pyc"
  ])("nao envia %s", (name) => {
    expect(safeDeploymentPath(name)).toBe(false);
  });
  it.each([
    "deploy/r2.env.example", "deploy/production.env.example", "app/api/uploads/[...path]/route.ts",
    "prisma/migrations/20260522005000_prepare_sugestao_contato_index/migration.sql", "deploy/r2-backup.py"
  ])("preserva %s", (name) => {
    expect(safeDeploymentPath(name)).toBe(true);
  });
});
