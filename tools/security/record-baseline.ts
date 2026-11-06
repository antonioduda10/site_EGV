import { mkdir, readFile, writeFile } from "node:fs/promises";

async function main() {
  const source = "docs/incremento-II/evidencias";
  const destination = "docs/aula12-seguranca/evidencias/linha-base";
  await mkdir(destination, { recursive: true });
  for (const name of ["validacao.json", "testes.txt", "cobertura.txt", "lint.txt", "typescript.txt", "build.txt"]) {
    const content = await readFile(`${source}/${name}`, "utf8");
    await writeFile(`${destination}/${name}`, content.split(process.cwd()).join("<projeto>").split(process.cwd().replace(/\\/g, "/")).join("<projeto>"));
  }
  await writeFile(`${destination}/e2e.txt`, "E2E anterior bloqueado: o servidor temporario nao iniciou porque nao havia build de producao utilizavel em .next-build. Nenhum teste de navegador foi declarado aprovado. O schema temporario foi removido. A unica alteracao previa de fixture retirou telefone/endereco reais do rodape das capturas.\n");
  console.log("Linha de base registrada sem valores de configuracao ou dados pessoais.");
}

main().catch(() => { console.error("Falha ao registrar linha de base."); process.exitCode = 1; });
