import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { safePackagePath, buildSafePackage } from "@/lib/source-package";
import { logPath, redactLogDetails, redactLogText } from "@/lib/log-redaction";

describe("AULA12 empacotamento e redacao", () => {
  it.each([".env", ".env.local", ".env.production", "node_modules/a.js", ".next-build/a.js", "coverage/a.json", "uploads/foto.png", "logs/error.txt", "app/private.key", "tests/storage-state.json", "tests/cookies.json", "prisma/seed.ts", "prisma/migrations/a.sql", "../fora.ts", "C:\\fora.ts", "docs/aula12-seguranca/evidencias/linha-base/testes.txt"])("exclui %s", (name) => {
    expect(safePackagePath(name)).toBe(false);
  });
  it.each([".env.example", "README.md", "app/page.tsx", "prisma/schema.prisma", "docs/aula12-seguranca/RELATORIO_SEGURANCA.md", "docs/aula12-seguranca/evidencias/01.png"])("inclui %s", (name) => {
    expect(safePackagePath(name)).toBe(true);
  });
  it("ZIP real contem codigo e placeholder, nao segredos nem dependencias", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "egv-package-test-"));
    try {
      await mkdir(path.join(root, "app"));
      await writeFile(path.join(root, "app/page.tsx"), "codigo de teste");
      await writeFile(path.join(root, ".env"), "SEGREDO_FICTICIO=nao-exportar");
      await writeFile(path.join(root, ".env.example"), "SEGREDO=PLACEHOLDER");
      await writeFile(path.join(root, "README.md"), "Senha: exemplo-ficticio\nDocumentacao");
      const result = await buildSafePackage(root);
      const files = unzipSync(result.archive);
      expect(Object.keys(files).sort()).toEqual([".env.example", "README.md", "app/page.tsx"]);
      expect(strFromU8(files["README.md"])).not.toContain("exemplo-ficticio");
      expect(strFromU8(files["app/page.tsx"])).toBe("codigo de teste");
    } finally {
      // This exact OS-created temporary directory belongs exclusively to this test.
      if (path.dirname(root) === tmpdir() && path.basename(root).startsWith("egv-package-test-")) await rm(root, { recursive: true, force: true });
    }
  });
  it("remove campos sensiveis e preserva informacao operacional", () => {
    expect(redactLogDetails({ senha: "ficticia", senhaHash: "ficticio", token: "ficticio", cookie: "ficticio", email: "teste@example.invalid", method: "GET", status: 403, retry: false })).toEqual({ method: "GET", status: 403, retry: false });
    expect(redactLogDetails(null)).toBeUndefined();
    expect(redactLogDetails([])).toBeUndefined();
    expect(redactLogDetails({ senha: "ficticia" })).toBeUndefined();
  });
  it("retira conexoes e parametros de tokens dos logs", () => {
    const text = redactLogText("postgresql://fake:fake@localhost/fake senha=exemplo token=exemplo");
    expect(text).not.toContain("fake:");
    expect(text).not.toContain("exemplo");
    expect(logPath("https://example.invalid/pagina?token=ficticio#segredo")).toBe("/pagina");
    expect(logPath()).toBeUndefined();
    expect(logPath("http://[")).toBeUndefined();
  });
});
