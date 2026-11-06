import fs from "node:fs/promises";
import path from "node:path";
import { buildSafePackage } from "../../lib/source-package";

async function main() {
  const root = process.cwd();
  const destination = path.join(root, "entrega-segura");
  const existing = await fs.lstat(destination).catch(() => null);
  if (existing?.isSymbolicLink()) throw new Error("Destino de empacotamento invalido.");
  const { archive, manifest } = await buildSafePackage(root);
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, "portal-egv-codigo.zip"), archive);
  await fs.writeFile(path.join(destination, "manifesto.json"), JSON.stringify({ files: manifest, count: manifest.length }, null, 2));
  console.log(`Pacote seguro gerado em entrega-segura; ${manifest.length} arquivos permitidos. Segredos e dados de runtime nao foram incluidos.`);
}

main().catch(() => { console.error("Falha ao gerar pacote seguro; nenhum segredo foi registrado."); process.exitCode = 1; });
