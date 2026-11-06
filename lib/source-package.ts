import fs from "node:fs/promises";
import path from "node:path";
import { zipSync, type Zippable } from "fflate";

const roots = new Set(["app", "components", "lib", "public", "types", "tests", "tools"]);
const rootFiles = new Set(["README.md", "package.json", "package-lock.json", "tsconfig.json", "next-env.d.ts", "next.config.mjs", "tailwind.config.ts", "postcss.config.js", "postcss.config.mjs", "vitest.config.mts", "playwright.config.ts", ".gitignore", ".eslintrc.json", ".env.example", ".nvmrc"]);
const blockedDirectories = new Set(["node_modules", ".git", ".venv", "__pycache__", "coverage", "test-results", "playwright-report", "entrega-segura"]);

export function safePackagePath(value: string, directory = false) {
  const relative = value.replace(/\\/g, "/");
  const parts = relative.split("/");
  if (path.isAbsolute(value) || path.win32.isAbsolute(value) || parts.some((part) => !part || part === ".." || blockedDirectories.has(part) || part.startsWith(".next"))) return false;
  const basename = parts[parts.length - 1];
  if (/^\.env(?:\.|$)/i.test(basename) && relative !== ".env.example") return false;
  if (/\.(?:log|db|sqlite\d?|backup|dump|pem|key|pfx|p12|har|zip|gz|bak)$/i.test(basename)) return false;
  if (/(?:cookies?|tokens?|secrets?|credentials?|storage[-_]?state|auth[-_]?state)\.(?:json|txt|ya?ml)$/i.test(basename)) return false;
  if (roots.has(parts[0])) return true;
  if (relative === "prisma") return directory;
  if (relative === "prisma/schema.prisma") return true;
  if (relative === "docs" || relative === "docs/aula12-seguranca") return directory;
  if (relative.startsWith("docs/aula12-seguranca/")) {
    if (relative.includes("/linha-base/")) return false;
    return directory || /\.(?:md|png)$/.test(relative) || relative.endsWith("/npm-audit-resumo.txt");
  }
  return rootFiles.has(relative);
}

export async function buildSafePackage(root: string) {
  const entries: Zippable = {};
  async function visit(directory: string) {
    for (const item of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, item.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      // Filter before opening a file, and never follow symlinks into a private directory.
      if (!safePackagePath(relative, item.isDirectory()) || item.isSymbolicLink()) continue;
      if (item.isDirectory()) await visit(absolute);
      else if (item.isFile()) {
        let bytes = await fs.readFile(absolute);
        if (relative === "README.md") {
          const sanitized = bytes.toString("utf8").replace(/^([ \t]*[-*]?[ \t]*Senha[^:\r\n]*:).*$/gim, "$1 configure localmente; valor nao incluido no pacote.");
          bytes = Buffer.from(sanitized);
        }
        entries[relative] = bytes;
      }
    }
  }
  await visit(path.resolve(root));
  const manifest = Object.keys(entries).sort();
  return { archive: zipSync(entries, { level: 6 }), manifest };
}
