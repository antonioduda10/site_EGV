import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Advisory = { title: string; url: string; range: string };
type Audit = {
  metadata?: { vulnerabilities?: Record<string, number> };
  vulnerabilities?: Record<string, { severity: string; isDirect: boolean; range: string; fixAvailable: unknown; via: (string | Advisory)[] }>;
};

async function main() {
  const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  const result = spawnSync(process.execPath, [npmCli, "audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  let audit: Audit;
  try { audit = JSON.parse(result.stdout) as Audit; }
  catch { throw new Error("A auditoria nao retornou JSON valido; nenhum detalhe de configuracao foi gravado."); }
  if (!audit.metadata?.vulnerabilities || !audit.vulnerabilities) throw new Error("Auditoria indisponivel; nao interpretar como ausencia de vulnerabilidades.");
  const summary = {
    timestamp: new Date().toISOString(), command: "npm audit --omit=dev --json", exitCode: result.status,
    counts: audit.metadata.vulnerabilities,
    packages: Object.entries(audit.vulnerabilities).map(([name, item]) => ({
      name, severity: item.severity, direct: item.isDirect, range: item.range, fix: item.fixAvailable,
      advisories: item.via.filter((via): via is Advisory => typeof via !== "string").map(({ title, url, range }) => ({ title, url, range }))
    }))
  };
  const directory = "docs/aula12-seguranca";
  await mkdir(`${directory}/evidencias`, { recursive: true });
  const filename = process.argv.includes("--before") ? "evidencias/npm-audit-antes.json" : "npm-audit-resumo.txt";
  await writeFile(`${directory}/${filename}`, JSON.stringify(summary, null, 2));
  console.log(`Auditoria sanitizada registrada; ocorrencias: ${summary.counts.total}.`);
}

main().catch(() => { console.error("Falha ao gerar resumo sanitizado da auditoria."); process.exitCode = 1; });
