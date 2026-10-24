# Relatorio do Incremento II - Portal EGV

Data de referencia: 17/10/2026. Situacao: validacoes concluidas e aprovadas no escopo descrito abaixo.

## 1. Situacao inicial

O portal ja possuia Next.js, painel, autenticação, RBAC, banco, APIs e uploads. `npm test` apenas imprimia uma mensagem, sem executar testes. Lint e TypeScript passaram na verificacao inicial. Foram identificados 23 avisos de imagens `<img>` ja existentes, sem erros de lint. A analise de estrutura, contratos e dependencias esta em [DIAGNOSTICO.md](DIAGNOSTICO.md).

## 2. Implementacoes

- Suite Vitest real, com comandos de execucao, acompanhamento e cobertura.
- Testes de CredentialsProvider, callbacks JWT/sessao, bcrypt, requireAuth, requirePermission e regras RBAC existentes.
- Integracao dos handlers de noticias, aprovacao, documentos e login com Request/Response, Zod, RBAC e auditoria. Banco e arquivos sao simulados nessa camada.
- Playwright com Chromium, axe, dados ficticios e PostgreSQL isolado em schema temporario. Os CRUDs de noticias/documentos tambem sao testados com banco e arquivos reais exclusivamente temporarios.
- Regressoes de navegacao, autenticacao, menus mobile, sidebar, filtros/listagens, paginas legais, slugs, uploads, downloads, carrossel, tema persistente e configuracao refletida na home sem rebuild.
- Geracao de logs, tabela de casos, capturas do portal e resumos visuais de validacao baseados nos resultados reais.

## 3. Correcoes comprovadas

| Problema | Correcao | Evidencia |
| --- | --- | --- |
| Usuario INATIVO podia autenticar e conservar JWT | Conferir status no CredentialsProvider, login auxiliar e callback JWT | AUTH-05, AUTH-11, LOGIN-04 |
| JSON malformado/falhas de persistencia dos CRUDs criticos escapavam sem resposta JSON controlada | Tratamento compartilhado para noticias/documentos: 400, 404, 409 ou 500, conforme erro | NEWS-05/06 e ERROR-01/02 |
| Validacao de caminho aceitava pasta vizinha com nome iniciado por uploads | Usar `path.relative` e rejeitar caminhos que escapam da raiz | UPLOAD-03, que falhou antes da correcao |
| `uploads/` no gitignore ocultava tambem o codigo `app/api/uploads/` | Ignorar somente `/uploads/`, preservando a rota no controle de versao | Revisao do gitignore e teste de leitura/upload |
| Contraste insuficiente no rodape, contadores e estado vazio | Cores de texto ajustadas no padrao existente | Axe antes/depois |
| Regra global de links sobrepunha texto de botoes no tema escuro | Estilo base de links com baixa especificidade, respeitando utilitarios Tailwind | Axe em home/login/documentos escuros |

Endpoints, payloads usuais, perfis e permissoes foram preservados. O schema Prisma, migrations, seed, `.env`, dados e uploads reais nao foram alterados. A verificacao de status INATIVO e as respostas de erro descritas acima sao alteracoes de comportamento intencionais e cobertas por testes.

## 4. Responsividade e acessibilidade

- Revisadas dez rotas publicas/login e treze paginas administrativas em 375, 768 e 1366 px: 69 combinacoes de rota/largura.
- Conferidos os containers de rolagem horizontal das tabelas administrativas. Nao foi detectado overflow horizontal da pagina nas combinacoes verificadas; nao houve necessidade de redesenhar essas telas.
- Rótulos associados aos campos de documentos e nomes acessiveis para buscas de noticias/documentos; mensagens de retorno do formulario com `role` adequado.
- Skip link com foco acima do header e destino principal focalizavel; foco de teclado para `summary`.
- Removidos landmarks `main` aninhados em galeria, fotos, videos e secretaria, mantendo o `main` unico do layout.
- Login com autocomplete, estado de envio, bloqueio do botao durante requisicao, mensagem de falha e estilos escuros.
- Preferencias de cookies com contraste escuro e limite de altura/rolagem para viewports baixos.
- Carrossel automatico, sem botao de pausar/reproduzir, com respeito a movimento reduzido, controles de 44 px e setas visiveis com foco. Mantidos links, banners cadastrados e configuracao de intervalo. A pausa persistente por interacao foi retirada a pedido na revisao posterior.
- Links do rodape azuis, com sublinhado e destaque de cor em hover/foco, conservando contraste sobre o fundo escuro.
- Icones sociais do rodape com cores caracteristicas: Facebook e LinkedIn azuis, Instagram em degrade, YouTube vermelho e TikTok com detalhes ciano/rosa. Reutilizados os SVGs existentes, sem biblioteca adicional ou JavaScript no cliente; os nomes dos links continuam acessiveis.
- Axe verifica regras WCAG A/AA em telas selecionadas claras/escuras, incluindo o banner de cookies. Isso nao constitui certificacao integral de acessibilidade.

## 5. Testes e resultados

| Comando | Resultado observado |
| --- | --- |
| `npm test` | 110 testes aprovados, zero reprovados |
| `npm run test:coverage` | Aprovado; 97,50% linhas/statements, 88,78% branches e 92,59% funcoes nos arquivos selecionados |
| `npm run lint` | Aprovado, sem erros; 23 avisos preexistentes `@next/next/no-img-element` |
| `npx tsc --noEmit --incremental false` | Aprovado, sem erros |
| `npm run build` | Aprovado; permanece aviso de Browserslist desatualizado |
| `npm run test:e2e` | 23 testes aprovados, zero reprovados e zero ignorados; Chromium, 69 combinacoes de rota/largura e 15 auditorias axe sem violacoes nas regras selecionadas |

Total final apos a revisao: 133 casos aprovados (110 Vitest e 23 Playwright), zero reprovados. O schema PostgreSQL e os arquivos temporarios foram removidos apos a execucao; o servidor de testes foi encerrado.

Os limites de cobertura configurados sao 80% linhas/statements, 70% branches e 85% funcoes. A medicao inclui os arquivos listados no `vitest.config.mts`, e nao todos os modulos do portal. A rota de download e o upload de banners tambem possuem verificacao E2E, fora da cobertura V8 de unidade.

## 6. Arquivos criados

- `vitest.config.mts`, `playwright.config.ts`, `lib/api-errors.ts`, `lib/session-policy.ts`, `components/auth-session-provider.tsx`.
- `tests/setup.ts`, `tests/helpers.ts`, `tests/mocks/db.ts`.
- `tests/unit/auth.test.ts`, `guards.test.ts`, `rbac.test.ts`, `password.test.ts`, `api-errors.test.ts`.
- `tests/integration/noticias.test.ts`, `documentos.test.ts`, `login.test.ts`, `uploads.test.ts`.
- `tests/e2e/run.ts`, `tests/e2e/portal.spec.ts`, `tests/validate.ts`, `tests/evidence.ts`.
- `docs/incremento-II/DIAGNOSTICO.md`, este relatorio, `EVIDENCIAS.md`, `CASOS_TESTE.md` e artefatos em `evidencias/`.

## 7. Arquivos alterados

- `.gitignore`, `package.json`, `package-lock.json`, `README.md`.
- `lib/auth.ts`, `lib/require-auth.ts`, `types/next-auth.d.ts`, `app/api/auth/login/route.ts`, `app/api/auth/ping/route.ts`.
- `app/api/noticias/route.ts`, `app/api/noticias/[id]/route.ts`.
- `app/api/documentos/route.ts`, `app/api/documentos/[id]/route.ts`.
- `app/api/uploads/[...path]/route.ts`: codigo preexistente, anteriormente ignorado pelo Git, agora incluido e corrigido.
- `app/layout.tsx`, `app/globals.css`, `app/(auth)/login/page.tsx`.
- `app/(public)/documentos/page.tsx`, `noticias/page.tsx`, `galeria/page.tsx`, `galeria/fotos/page.tsx`, `galeria/videos/page.tsx`, `secretaria/page.tsx`.
- `components/forms/documentos-form.tsx`, `components/dashboard/sidebar.tsx`, `components/dashboard/session-watchdog.tsx`.
- `components/header-session-controls.tsx`, `components/session-global-watchdog.tsx`.
- `components/banner-carousel.tsx`, `components/consent-banner.tsx`, `components/footer.tsx`, `components/public-page-hero.tsx`.

## 8. Dependencias adicionadas

Somente desenvolvimento: `vitest@3.2.7`, `@vitest/coverage-v8@3.2.7`, `vite@6.4.4`, `@playwright/test@1.64.1` e `@axe-core/playwright@4.13.0`. Vitest/Vite foram fixados em versoes compativeis com Node 20.18. O npm atualizou o lockfile e deduplicou/atualizou tres dependencias transitivas (`axe-core`, `nanoid`, `source-map-js`); as versoes diretas de producao foram preservadas.

## 9. Dificuldades e cuidados

- As definicoes do NextAuth disponibilizam a funcao configurada em `provider.options.authorize`; os testes chamam essa implementacao real.
- Prisma e arquivos usam mocks com falha por padrao para chamadas nao configuradas, evitando consultas acidentais ao banco real durante `npm test`.
- No E2E, o nome do schema e gerado na propria execucao e validado antes de criar/remover; os arquivos ficam fora de `uploads/`. O Playwright nao reutiliza servidor existente e usa porta 3100.
- Credenciais de teste sao aleatorias e ficam em memoria. Nao sao salvos cookies de sessao, traces ou videos. As capturas de login sao feitas com campos vazios.
- Foram encontradas falhas reais de contraste na primeira auditoria. O resultado anterior foi preservado em `acessibilidade-antes.json`; a auditoria final de 15 telas/estados ficou sem violacoes nas regras avaliadas.
- O teste SESSION-04 aguarda a resposta do POST de atividade antes de ler novamente o cookie, evitando consultas concorrentes de sessao que tambem enviam `Set-Cookie`. Esse ajuste e exclusivo do teste; o codigo de autenticacao nao foi alterado na revisao dos icones.

## 10. Pendencias e limites

- Permanecem os 23 avisos antigos sobre `<img>` e a base Browserslist desatualizada.
- Uma auditoria adicional `npm audit --omit=dev` reportou 11 ocorrencias em dependencias de producao: 1 baixa, 5 moderadas, 3 altas e 2 criticas. Atualizacoes de seguranca precisam de tarefa propria com avaliacao de compatibilidade; nao foi executado `npm audit fix` ou upgrade automatico.
- APIs GET preexistentes de alguns modulos nao aplicam os filtros das paginas publicas; revisar exposicao de rascunhos/inativos e campos retornados por APIs de usuarios.
- Ampliar testes para os demais CRUDs, recuperacao de senha e cenario de multiplos usuarios concorrentes. A navegacao de usuarios/configuracao foi verificada, mas nao se afirma cobertura integral de todos os fluxos.
- Auditoria humana com leitor de tela, navegadores adicionais e aparelhos fisicos permanece recomendada. A verificacao atual usa Chromium e larguras simuladas, com conteudo ficticio.
- Integracao de CI, publicacao, push e alteracoes de infraestrutura nao fazem parte deste incremento.

## 11. Reproducao

No terminal, a partir da raiz do projeto:

```powershell
npm ci
npx prisma generate
npx playwright install chromium
docker compose up -d db
npm run validate
npm run test:e2e
npm run test:evidence
```

`npm run validate` executa sequencialmente os mesmos entrypoints dos cinco comandos de teste/cobertura/lint/TypeScript/build, interrompendo ao primeiro erro e gravando codigos de saida e logs. Para executar individualmente:

```powershell
npm test
npm run test:coverage
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Para acompanhar edicoes: `npm run test:watch`. Para abrir manualmente o portal em producao apos o build: `npm run start`. `test:e2e` inicia e encerra seu proprio servidor temporario, exige PostgreSQL disponivel, permissao de criar/remover schemas e porta 3100 livre. Nao e necessario rodar migrations/seed no banco real para reproduzir os testes.

A tabela completa solicitada e gerada em [CASOS_TESTE.md](CASOS_TESTE.md). As capturas e os logs estao descritos em [EVIDENCIAS.md](EVIDENCIAS.md).

## 12. Revisao de sessao e ajustes solicitados

O cabecalho antes consultava a sessao uma unica vez e podia continuar mostrando Login depois de entrar. Foi integrado ao provedor de sessao existente do NextAuth: navegar entre painel e paginas publicas mantem o acesso; `/login` redireciona ao painel quando a sessao ja e valida. Nao foi necessario alterar cookies, dominio, `.env`, schema ou credenciais.

Foi implementada a expiracao por **30 minutos sem interacao**, validada no JWT no servidor. Cliques, movimentos do ponteiro, teclado, toque e rolagem sinalizam atividade, com renovacoes espacadas em aproximadamente 30 segundos. Requisicoes automaticas de sessao/presenca nao renovam a atividade. Tokens expirados nao podem ser reativados pela renovacao, e os dados enviados pelo cliente nao definem horario nem permissoes. Sessoes antigas validas sem o novo campo recebem uma janela inicial para evitar logout imediato na atualizacao.

Saida voluntaria, encerramento por usuario autorizado, remocao/desativacao da conta e RBAC continuam funcionando. A expiracao mantem a pagina publica aberta e retira o acesso autenticado; no painel, leva ao login com mensagem de inatividade. O prazo e compartilhado pelo cookie da sessao, e nao e reiniciado simplesmente por consultar o servidor.

Tambem foram restaurados os links azuis do rodape e retirado o botao de pausa/reproducao do carrossel. A navegacao manual nao interrompe mais definitivamente a troca automatica. A excecao de movimento reduzido do sistema foi preservada. Esses ajustes nao representam certificacao completa de acessibilidade, especialmente quanto a movimento automatico.

Regressoes acrescentadas: AUTH-15 a AUTH-21, GUARD-11, SESSION-01 a SESSION-04 e NAV-01; FLOW-07 agora confere troca automatica e ausencia do botao de pausa.
