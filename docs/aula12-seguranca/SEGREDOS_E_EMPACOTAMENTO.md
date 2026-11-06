# Segredos e empacotamento seguro

Nao reproduzir `.env`, conexoes, senhas, hashes, tokens ou cookies. `.gitignore` bloqueia `.env*`, exceto `.env.example` com placeholders. Nenhuma rotacao automatica foi executada.

**Se um pacote contendo segredos reais ja tiver sido compartilhado fora do ambiente autorizado, os segredos devem ser rotacionados.** O responsavel deve planejar impactos nas sessoes/conexoes.

## Entrega

`npm run security:package` gera `entrega-segura/portal-egv-codigo.zip` e `entrega-segura/manifesto.json` (ignorados pelo Git). O manifesto lista caminhos, nao valores.

Allowlist em `lib/source-package.ts`: codigo, configs publicas, schema, documentacao desta aula e PNGs. Filtra antes de abrir arquivos; nao segue symlinks. Exclui env privados, dependencias, .next*, cobertura, resultados temporarios, banco, uploads, logs, cookies, estados de autenticacao, chaves e backups. O README empacotado omite linhas de senha demonstrativa.

Seed, migrations, compose e documentos anteriores fora da allowlist nao sao incluidos. E uma entrega de codigo, nao backup de dados ou pacote completo de provisionamento. Segredos/infraestrutura devem ser fornecidos separadamente. A allowlist nao substitui revisao humana de segredos inseridos manualmente no codigo.

Teste automatizado cria pasta temporaria com segredo ficticio, gera ZIP real e verifica exclusao do segredo e inclusao de codigo/placeholder.

## Reproducao

Com Node 24 LTS selecionado e dependencias instaladas pelo lockfile:

```powershell
node --version
npm ci
$env:EGV_BUILD_DIR = '.next-aula12'
$env:EGV_EVIDENCE_DIR = 'docs/aula12-seguranca/evidencias'
npm test
npm run test:coverage
npm run lint
npx tsc --noEmit --incremental false
npm run build
npm run validate
npm run test:e2e
npm run test:evidence
npm run security:audit
npm run security:package
```

Validate executa testes, cobertura, lint, TypeScript e build; grava logs redigidos. O subprocesso de build recebe conexao ficticia nao operacional, impedindo efeitos no banco real. E2E exige PostgreSQL local com permissao de criar schema, porta 3100 livre e Chromium do Playwright. Usa schema aleatorio egv_e2e_* e uploads temporarios, removidos ao terminar. Sem seed/migrations no banco real.

Execucao normal: remova as duas variaveis temporarias da sessao de terminal; use `npm run build` e `npm run start` com Node 24. Dev continua disponivel. O Node global e o servidor original nao foram reiniciados/trocados automaticamente.
