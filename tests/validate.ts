import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = "docs/incremento-II/evidencias";
const checks = [
  { name: "testes", command: "npm test", script: "vitest/vitest.mjs", args: ["run", "--reporter=default", "--reporter=json", "--outputFile=test-results/vitest.json"] },
  { name: "cobertura", command: "npm run test:coverage", script: "vitest/vitest.mjs", args: ["run", "--coverage"] },
  { name: "lint", command: "npm run lint", script: "next/dist/bin/next", args: ["lint"] },
  { name: "typescript", command: "npx tsc --noEmit --incremental false", script: "typescript/bin/tsc", args: ["--noEmit", "--incremental", "false"] },
  { name: "build", command: "npm run build", script: "next/dist/bin/next", args: ["build"] }
];

async function main() {
  await mkdir(directory, { recursive: true });
  await mkdir("test-results", { recursive: true });
  const results = [];
  for (const check of checks) {
    console.log(`\nValidando: ${check.command}`);
    const startedAt = new Date().toISOString();
    let output = "";
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, [path.resolve("node_modules", check.script), ...check.args], {
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" }, stdio: ["ignore", "pipe", "pipe"]
      });
      for (const stream of [child.stdout, child.stderr]) {
        stream.on("data", (chunk: Buffer) => { output += chunk.toString(); process.stdout.write(chunk); });
      }
      child.on("error", reject);
      child.on("exit", (code) => resolve(code ?? 1));
    });
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");
    await writeFile(`${directory}/${check.name}.txt`, cleanOutput);
    results.push({ command: check.command, exitCode, startedAt, finishedAt: new Date().toISOString(), log: `${check.name}.txt` });
    await writeFile(`${directory}/validacao.json`, JSON.stringify(results, null, 2));
    if (exitCode !== 0) { process.exitCode = exitCode; return; }
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Erro na validacao"); process.exitCode = 1; });
