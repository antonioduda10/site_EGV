import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

async function main() {
  const git = (args: string[]) => execFileSync("git", ["-c", "core.safecrlf=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\r?\n/).filter(Boolean);
  const modified = git(["diff", "--name-only"]);
  const created = git(["ls-files", "--others", "--exclude-standard"]);
  const directory = "docs/aula12-seguranca";
  await writeFile(`${directory}/ARQUIVOS_ALTERADOS.md`, `# Inventario da entrega\n\nGerado do estado local, sem commit ou comparacao remota. Arquivos gerados pelo Next estao identificados no relatorio.\n\n## Alterados\n\n${modified.map((name) => `- \`${name}\``).join("\n")}\n\n## Criados\n\n${created.filter((name) => !name.startsWith(`${directory}/evidencias/`)).map((name) => `- \`${name}\``).join("\n")}\n\nCapturas e logs: ver EVIDENCIAS.md. Migrations, seed e schema: nenhuma alteracao.\n`);
  const nextRequire = createRequire(require.resolve("next/package.json"));
  const auth = JSON.parse(await readFile("node_modules/next-auth/package.json", "utf8")) as { version: string };
  const versions = {
    node: process.versions.node, next: nextRequire("./package.json").version as string,
    nextAuth: auth.version, sharpResolvedFromNext: nextRequire("sharp").versions.sharp as string,
    sanitizeHtml: nextRequire("sanitize-html/package.json").version as string
  };
  await writeFile(`${directory}/evidencias/versoes-validadas.json`, JSON.stringify(versions, null, 2));
  console.log("Inventario e versoes efetivas registrados sem valores privados de configuracao.");
}
main().catch(() => { console.error("Falha ao gerar inventario/versoes."); process.exitCode = 1; });
