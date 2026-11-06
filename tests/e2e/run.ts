import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { hashPassword } from "../../lib/password";
import bcrypt from "bcryptjs";

function execute(script: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<number>((resolve, reject) => {
    // Prisma can print its datasource; setup output is deliberately not retained.
    const child = spawn(process.execPath, [script, ...args], { stdio: script.includes("prisma") ? "ignore" : "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL para um PostgreSQL local com permissao de criar schemas.");
  const sourceUrl = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(sourceUrl.protocol)) throw new Error("Os testes E2E exigem PostgreSQL.");
  const schema = `egv_e2e_${randomUUID().replace(/-/g, "")}`;
  if (!/^egv_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Schema de teste invalido.");
  const isolatedUrl = new URL(sourceUrl);
  isolatedUrl.searchParams.set("schema", schema);
  const admin = new PrismaClient({ datasources: { db: { url: sourceUrl.toString() } } });
  const isolated = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
  const temporaryFiles = await mkdtemp(path.join(tmpdir(), "egv-e2e-"));
  const password = randomBytes(24).toString("hex");
  const env: NodeJS.ProcessEnv = {
    ...process.env, DATABASE_URL: isolatedUrl.toString(),
    NEXTAUTH_URL: "http://127.0.0.1:3100", NEXTAUTH_SECRET: randomBytes(32).toString("hex"),
    UPLOAD_DIR: temporaryFiles, ERROR_LOG_DIR: path.join(temporaryFiles, "logs"),
    E2E_ISOLATED: "1", E2E_EMAIL: "admin-teste@example.invalid", E2E_PASSWORD: password
  };
  let created = false;
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    console.log("E2E: schema temporario criado; dados reais preservados.");
    const push = await execute(path.resolve("node_modules/prisma/build/index.js"), ["db", "push", "--skip-generate"], env);
    if (push !== 0) return push;
    const profile = await isolated.perfil.create({ data: { nome: "Admin" } });
    await isolated.perfil.create({ data: { nome: "Docente" } });
    const user = await isolated.usuario.create({ data: {
      nome: "Administrador de teste", email: env.E2E_EMAIL!, senhaHash: await hashPassword(password),
      perfis: { create: { perfilId: profile.id } }
    } });
    const links = [
      { href: "/", label: "Início" }, { href: "/noticias", label: "Notícias" },
      { href: "/eventos", label: "Eventos" }, { href: "/documentos", label: "Documentos" },
      { href: "/galeria", label: "Galeria" }, { href: "/secretaria", label: "Secretaria" },
      { href: "/contato", label: "Contato" }
    ];
    await isolated.configuracaoSite.create({ data: {
      menuJson: JSON.stringify(links),
      botaoHistoriaLink: "/p/escola-teste",
      rodapeJson: JSON.stringify({
        escola: { nome: "Escola do ambiente de testes", descricao: "Dados ficticios para validacao.", endereco: "Endereco ilustrativo", telefone: "", email: "" },
        atendimento: { horarios: "Segunda a sexta, das 7h às 18h", mostrarMapa: false },
        sociais: [
          { nome: "Facebook", href: "https://www.facebook.com/egv-teste", newTab: true },
          { nome: "Instagram", href: "https://www.instagram.com/egv-teste", newTab: false },
          { nome: "YouTube", href: "https://www.youtube.com/@egv-teste", newTab: true },
          { nome: "LinkedIn", href: "https://www.linkedin.com/company/egv-teste", newTab: true },
          { nome: "TikTok", href: "https://www.tiktok.com/@egv-teste", newTab: true }
        ]
      }),
      politicaPrivacidade: "<p>Política de privacidade do ambiente de testes.</p>",
      cookies: "<p>Preferências de cookies do ambiente de testes.</p>", termos: "<p>Termos de uso do ambiente de testes.</p>"
    } });
    await isolated.noticia.create({ data: {
      titulo: "Projeto de leitura da escola", resumo: "Estudantes participam de atividades de leitura na escola.",
      conteudo: "<p>Registro fictício de um projeto escolar para validar o portal sem utilizar dados pessoais.</p>",
      slug: "projeto-leitura-teste", status: "PUBLICADO", dataPublicacao: new Date(), autorId: user.id,
      imagemCapa: "/noticias/capa-padrao.svg"
    } });
    await isolated.evento.create({ data: {
      titulo: "Encontro da comunidade escolar", descricao: "Atividade fictícia de integração entre escola e comunidade.",
      conteudo: "<p>Evento do ambiente de testes automatizados.</p>", local: "Escola", dataInicio: new Date(Date.now() + 86_400_000)
    } });
    const documentBytes = Buffer.from("%PDF-1.4\n% documento de teste\n%%EOF");
    await writeFile(path.join(temporaryFiles, "teste.pdf"), documentBytes);
    await isolated.arquivoDocumento.create({ data: {
      nome: "Calendário escolar de teste", categoria: "Calendário", ano: 2026,
      descricao: "Arquivo fictício para validação.", caminho: "/api/uploads/teste.pdf", tipo: "application/pdf", tamanho: documentBytes.length
    } });
    await isolated.midia.create({ data: { titulo: "Registro do projeto escolar", caminho: "/noticias/capa-padrao.svg", tipo: "image/svg+xml", tamanho: 100 } });
    await isolated.secretariaServidor.create({ data: { nome: "Equipe de teste", cargo: "Direção", setor: "Direção", descricao: "Registro fictício, sem dados pessoais." } });
    await isolated.paginaInstitucional.create({ data: { titulo: "Nossa escola", slug: "escola-teste", conteudo: "<p>Conteúdo institucional fictício para os testes de regressão.</p>" } });
    const draft = await isolated.noticia.create({ data: { titulo: "Rascunho reservado Aula 12", resumo: "Conteudo ficticio ainda nao publicado.", conteudo: "<p>Somente a administracao deve visualizar este rascunho.</p>", slug: "rascunho-aula12", status: "RASCUNHO", autorId: user.id } });
    env.SEC_DRAFT_ID = draft.id;
    const hidden = await isolated.paginaInstitucional.create({ data: { titulo: "Pagina reservada Aula 12", slug: "pagina-reservada-aula12", conteudo: "<p>Pagina invisivel de teste.</p>", visivel: false } });
    env.SEC_PAGE_ID = hidden.id;
    await isolated.noticia.create({ data: { titulo: "Conteudo rico seguro Aula 12", resumo: "Formatacao legitima preservada para a comunidade.", conteudo: '<h2>Projeto de leitura</h2><p>Texto com <strong>destaque</strong> e <em>enfase</em>.</p><ul><li>Atividade escolar</li></ul><script>window.aula12Executed=true</script><img src="x" onerror="window.aula12Executed=true"><a href="javascript:window.aula12Executed=true">Ligacao sem protocolo perigoso</a>', slug: "conteudo-seguro-aula12", status: "PUBLICADO", dataPublicacao: new Date() } });
    await writeFile(path.join(temporaryFiles, "restrito-aula12.pdf"), documentBytes);
    const restricted = await isolated.arquivoDocumento.create({ data: { nome: "Documento restrito Aula 12", categoria: "Testes", ano: 2026, caminho: "/api/uploads/restrito-aula12.pdf", tipo: "application/pdf", tamanho: documentBytes.length, status: "INATIVO" } });
    env.SEC_DOC_ID = restricted.id;
    const limited = await isolated.perfil.create({ data: { nome: "Aluno" } });
    env.SEC_LEGACY_EMAIL = "conta-legada@example.invalid";
    env.SEC_LEGACY_PASSWORD = randomBytes(4).toString("hex");
    const legacy = await isolated.usuario.create({ data: { nome: "Conta legada de teste", email: env.SEC_LEGACY_EMAIL, senhaHash: await bcrypt.hash(env.SEC_LEGACY_PASSWORD, 10), perfis: { create: { perfilId: limited.id } } } });
    env.SEC_RESET_TOKEN = randomUUID();
    await isolated.passwordResetToken.create({ data: { token: env.SEC_RESET_TOKEN, usuarioId: legacy.id, expiraEm: new Date(Date.now() + 3600_000) } });
    return await execute(path.resolve("node_modules/@playwright/test/cli.js"), ["test", ...process.argv.slice(2)], env);
  } finally {
    await isolated.$disconnect();
    if (created) {
      // Only the random schema created in this invocation can be removed.
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      console.log("E2E: schema temporario removido.");
    }
    await admin.$disconnect();
    const relative = path.relative(tmpdir(), temporaryFiles);
    if (!relative.startsWith("..") && !path.isAbsolute(relative) && /^egv-e2e-[^\\/]+$/.test(relative)) {
      await rm(temporaryFiles, { recursive: true, force: true });
    }
  }
}

main().then((code) => { process.exitCode = code; }).catch(() => {
  console.error("Falha ao preparar ou limpar o ambiente E2E. Confira o PostgreSQL e as permissoes de schema. Nenhuma credencial foi registrada.");
  process.exitCode = 1;
});
