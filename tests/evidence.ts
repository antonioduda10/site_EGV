import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

type Check = { command: string; exitCode: number; startedAt: string; finishedAt: string; log: string };
type UnitReport = {
  numTotalTests: number; numPassedTests: number; numFailedTests: number; success: boolean;
  testResults: { name: string; assertionResults: { title: string; status: string }[] }[];
};
type E2ESuite = { title: string; suites?: E2ESuite[]; specs?: { title: string; ok: boolean }[] };
type E2EReport = { stats: { expected: number; unexpected: number; skipped: number }; suites: E2ESuite[] };
type Coverage = { total: { lines: { pct: number }; statements: { pct: number }; branches: { pct: number }; functions: { pct: number } } };

const directory = "docs/incremento-II/evidencias";
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function flatten(suites: E2ESuite[]): { title: string; ok: boolean }[] {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...flatten(suite.suites ?? [])]);
}

function html(title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escape(title)}</title><style>
    *{box-sizing:border-box}body{margin:0;padding:48px;font:17px/1.5 Arial,sans-serif;color:#172033;background:#f4f7fb}
    main{max-width:1100px;margin:auto}h1{font-size:32px;margin:0 0 8px}h2{font-size:22px;margin:32px 0 12px}
    p{margin:8px 0;color:#334155}.metrics{display:flex;gap:24px;margin:28px 0}.metric{flex:1;background:white;border:1px solid #cbd5e1;border-radius:8px;padding:20px}
    strong{font-size:32px;color:#166534;display:block}table{width:100%;border-collapse:collapse;background:white}td,th{text-align:left;padding:14px;border-bottom:1px solid #cbd5e1}code{font:16px Consolas,monospace}.note{font-size:14px;margin-top:24px}
    </style><main><p>Portal EGV | Incremento II | Evidência de execução</p><h1>${escape(title)}</h1>${body}</main></html>`;
}

async function main() {
  const checks = JSON.parse(await readFile(`${directory}/validacao.json`, "utf8")) as Check[];
  const unit = JSON.parse(await readFile("test-results/vitest.json", "utf8")) as UnitReport;
  const e2e = JSON.parse(await readFile("test-results/e2e.json", "utf8")) as E2EReport;
  const coverage = JSON.parse(await readFile("coverage/coverage-summary.json", "utf8")) as Coverage;
  if (checks.length !== 5 || checks.some((check) => check.exitCode !== 0) || !unit.success || !unit.numTotalTests || unit.numFailedTests || unit.testResults.some((file) => file.assertionResults.some((result) => result.status !== "passed")) || e2e.stats.unexpected || e2e.stats.skipped) {
    throw new Error("As evidencias de aprovacao exigem todas as validacoes concluidas e sem falhas ou testes ignorados.");
  }
  const e2eCases = flatten(e2e.suites);
  if (!e2eCases.length || e2eCases.some((spec) => !spec.ok)) throw new Error("Relatorio E2E incompleto.");
  await mkdir(directory, { recursive: true });
  const summary = { unit: { passed: unit.numPassedTests, failed: unit.numFailedTests, total: unit.numTotalTests }, e2e: e2e.stats, coverage: coverage.total, checks };
  await writeFile(`${directory}/resumo-testes.json`, JSON.stringify(summary, null, 2));

  const rows: string[] = [];
  for (const file of unit.testResults) {
    const functionality = file.name.replace(/\\/g, "/").split("/").pop() ?? "Teste";
    for (const test of file.assertionResults) {
      rows.push(`| T-${String(rows.length + 1).padStart(3, "0")} | ${cell(functionality)} | ${cell(test.title)} | Assercoes ${test.status === "passed" ? "cumpridas" : "nao cumpridas"} | ${test.status === "passed" ? "Aprovado" : "Reprovado"} |`);
    }
  }
  for (const spec of e2eCases) rows.push(`| T-${String(rows.length + 1).padStart(3, "0")} | Navegador / PostgreSQL isolado | ${cell(spec.title)} | Assercoes cumpridas | Aprovado |`);
  await writeFile("docs/incremento-II/CASOS_TESTE.md", `# Casos de teste executados\n\nTabela gerada dos relatorios reais do Vitest e Playwright. Cada linha representa um caso; testes de responsividade percorrem varias rotas dentro do mesmo caso.\n\n| CASO DE TESTE | FUNCIONALIDADE | RESULTADO ESPERADO | RESULTADO OBTIDO | SITUACAO |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`);

  const testHtml = html("Testes automatizados aprovados", `<div class="metrics"><div class="metric"><strong>${unit.numPassedTests}</strong>testes de unidade e integração</div><div class="metric"><strong>${e2e.stats.expected}</strong>testes de navegador</div><div class="metric"><strong>0</strong>falhas</div></div><h2>Cobertura dos arquivos críticos selecionados</h2><table><tr><th>Linhas</th><th>Branches</th><th>Funções</th></tr><tr><td>${coverage.total.lines.pct}%</td><td>${coverage.total.branches.pct}%</td><td>${coverage.total.functions.pct}%</td></tr></table><p>Autenticação, RBAC, APIs de notícias/documentos, uploads e fluxos reais em ambiente isolado.</p><p class="note">Fonte: test-results/vitest.json, test-results/e2e.json e coverage/coverage-summary.json. Não é uma tela do portal nem uma simulação de terminal.</p>`);
  const validationHtml = html("Validação técnica", `<p>Comandos concluídos com código de saída zero.</p><table><tr><th>Comando</th><th>Resultado</th></tr>${checks.map((check) => `<tr><td><code>${escape(check.command)}</code></td><td>Aprovado (0)</td></tr>`).join("")}</table><p>O lint conserva 23 avisos preexistentes sobre imagens &lt;img&gt;. Os logs completos acompanham esta evidência.</p><p class="note">Fonte: docs/incremento-II/evidencias/validacao.json e logs dos comandos.</p>`);
  await writeFile(`${directory}/resumo-testes.html`, testHtml);
  await writeFile(`${directory}/resumo-validacao.html`, validationHtml);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    for (const [content, name] of [[testHtml, "07-testes-aprovados.png"], [validationHtml, "08-build-validacao.png"]]) {
      await page.setContent(content);
      await page.screenshot({ path: `${directory}/${name}`, fullPage: true });
    }
  } finally { await browser.close(); }
  console.log(`Evidencias geradas: ${unit.numPassedTests} testes Vitest e ${e2e.stats.expected} Playwright aprovados.`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Erro ao gerar evidencias"); process.exitCode = 1; });
