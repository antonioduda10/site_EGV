# Modulo administrativo de Avisos

Data: 09/11/2026. Implementacao e verificacao exclusivamente locais. Nenhum deploy, SSH, commit ou push foi realizado nesta etapa.

## Diagnostico anterior

- A interface ficava em `components/forms/config-form.tsx`, em `/dashboard/config`.
- Os registros nao possuem tabela propria: ficam em `ConfiguracaoSite.avisosHomeJson`, coluna existente desde `20260711123000_add_avisos_home_config`.
- O JSON aceita arrays legados e envelopes com `alerts`, `avisos` ou `itens`. Os campos existentes eram titulo, descricao, link, imagem e ativo. A ordem era a posicao no array; nao havia identificador ou datas por aviso.
- `settings` no mesmo JSON guarda animacao dos avisos e intervalo dos banners. Antes, salvar configuracoes reenviava uma copia completa e podia sobrescrever mudancas mais recentes de outro editor ou da pagina de banners.
- A home e Server Component, carrega dados do PostgreSQL e renderiza todos os avisos ativos em grade. Sem ativos, a secao e omitida. Imagem, link, download e animacao ja existiam.
- O botao claro de detalhes dos avisos tinha contraste insuficiente, identificado ao incluir avisos ativos na verificacao axe. O ajuste foi somente de tonalidade do botao e foco, sem redesenhar a home ou alterar textos. Avisos sem titulo nao geram um heading vazio.
- A manutencao e o upload exigiam `CONFIG_WRITE`. `UsuarioPermissao.permissao` e `String`, nao enum Prisma. Listas manuais prevalecem sobre os perfis; superadministrador ignora restricoes, conforme o RBAC existente.
- Nao havia Server Actions para avisos. As gravacoes eram pelas APIs de configuracao e banners, usando helpers SQL parametrizados.
- Linha de base antes da edicao: 333 testes aprovados, 25 arquivos. A configuracao local continha dois avisos ativos. Alteracoes da auditoria de credenciais ja estavam no diretorio e foram preservadas.

## Solucao

- Nova pagina `/dashboard/avisos`, com item no menu desktop e mobile.
- Listagem com busca, filtro de status, imagem, ordem, datas, criacao, edicao, ativacao/desativacao e exclusao confirmada. Botoes ficam indisponiveis durante as requisicoes, com feedback e mensagens.
- A alternancia de status responde imediatamente e reverte o checkbox se a requisicao falhar. O menu mobile fecha tambem ao selecionar a pagina atual, seguindo a mesma navegacao existente.
- Animacao mantida no modulo Avisos. O tempo dos banners permanece em `/dashboard/banners`.
- Interface e payload de avisos removidos de Config. Sua API ignora copias antigas de `avisosHomeJson`, sem limpar ou substituir o valor salvo.
- APIs administrativas novas: `GET/POST /api/avisos`, `PATCH/DELETE /api/avisos/[id]`, `POST /api/avisos/settings` e `POST /api/avisos/upload`.
- Upload antigo `/api/config/avisos/upload` preservado como alias protegido pela mesma permissao nova, sem duplicar a implementacao. Tipos, tamanho, assinatura e confinamento de arquivos continuam na politica central.
- Leituras publicas de Config retornam apenas ativos. Imagens de avisos ocultos exigem a permissao do modulo. Exclusao nao apaga arquivos fisicos que possam estar compartilhados por outros conteudos.
- Operacoes administrativas validam sessao e permissao no servidor, alem do menu. Payloads estritos com Zod recusam atributos internos e links perigosos. Operacoes de escrita recusam Origin de outro site.
- Atualizacoes de avisos, animacao e intervalo dos banners usam a mesma transacao com advisory lock PostgreSQL, evitando perda de atualizacoes concorrentes do campo compartilhado. JSON corrompido ou registros que seriam descartados bloqueiam a escrita, em vez de serem substituidos silenciosamente.

## Dados e datas

O schema Prisma nao foi alterado. Nenhuma migration foi criada ou executada e nenhum seed foi usado.

O armazenamento continua no campo existente, sem transporte de dados entre bancos. Registros antigos recebem identificadores logicos estaveis na leitura; esses identificadores so sao persistidos quando ocorre uma gravacao explicita no modulo ou no tempo dos banners. Novos avisos recebem UUID, `criadoEm` e `atualizadoEm`. Uma edicao ou reordenacao registra a atualizacao, sem inventar criacao para registros antigos. A tela mostra "Nao registrada" quando a informacao historica nao existe.

Textos, imagens, links, status, ordem e configuracoes existentes devem permanecer preservados. A home continua usando o mesmo leitor, filtro de ativos e apresentacao em grade, sem carrossel ou modal novos.

Avisos legitimos com somente descricao continuam aceitos, conforme a regra do leitor anterior; titulo e descricao nao podem estar ambos vazios.

## Permissao e usuarios existentes

`ALERTS_WRITE`, exibida como **Gerenciar avisos**, controla a pagina, as APIs, o upload, a previa de imagens e os links desktop/mobile.

- Admin por perfil e superadministradores mantem acesso total pelo mecanismo existente.
- Direcao e Secretaria, que ja administravam os avisos por heranca de Config, passam a herdar a permissao especifica.
- Listas manuais continuam autoritativas. `ALERTS_WRITE` nao concede `CONFIG_WRITE`, e Config nao concede Avisos implicitamente.
- Para preservar acessos anteriores, o ajuste pontual acrescenta `ALERTS_WRITE` somente nas listas manuais que ja contem `CONFIG_WRITE` e ainda nao possuem Avisos. Nao altera outras permissoes, senhas, status, perfis ou usuarios. Nao cria listas manuais para usuarios que dependem somente da heranca, pois isso retiraria outras permissoes herdadas.
- O ajuste e idempotente, nao e executado automaticamente no boot, build, seed ou deploy. Remover Avisos posteriormente pela tela de usuarios continua efetivo; nao existe concessao automatica recorrente.

Ferramenta **apenas local**, com verificacao do destino e recusa de producao:

```powershell
npm run dev:enable-alerts
npm run dev:enable-alerts -- --apply
```

O primeiro comando apenas conta concessoes pendentes; o segundo insere as concessoes equivalentes em transacao. A saida contem contagens, nunca credenciais ou nomes de contas.

Este ajuste pertence somente a transicao inicial. Nao o reexecutar como rotina depois que o administrador retirar Avisos intencionalmente de alguem com Config: uma nova execucao explicita voltaria a conceder o acesso equivalente. A aplicacao nao executa esse ajuste automaticamente.

## Futuro deploy, somente apos autorizacao

1. Revisar o diff desta tarefa separadamente das alteracoes anteriores de credenciais e confirmar que nao contem ambientes, uploads ou segredos.
2. Validar todos os testes locais e a revisao manual do modulo.
3. Conferir backup atual do PostgreSQL e uploads, sem importar dados locais.
4. Programar uma curta pausa nas edicoes de permissoes e revisar as concessoes equivalentes. Como os dados de producao sao independentes, nao transportar linhas de UsuarioPermissao do computador.
5. Apos autorizacao explicita para escrita na VPS, executar somente o ajuste aditivo abaixo no banco de producao, com os identificadores retornados guardados em registro operacional privado. Esse SQL e documentacao: nao foi executado na VPS nesta tarefa.
6. Publicar o codigo pelo procedimento ja documentado em `DEPLOY_HOSTINGER.md`, sem seed, reset ou restauracao de banco. `prisma migrate deploy` pode continuar no fluxo padrao, mas este modulo nao adiciona nenhuma migration pendente.
7. Recarregar as abas do painel para nao manter a interface antiga em memoria. Validar Admin, usuarios manuais, retirada da permissao, home, Config, banners, imagens e persistencia.

```sql
BEGIN;
INSERT INTO "UsuarioPermissao" ("id", "usuarioId", "permissao")
SELECT gen_random_uuid()::text, old."usuarioId", 'ALERTS_WRITE'
FROM "UsuarioPermissao" AS old
WHERE old."permissao" = 'CONFIG_WRITE'
  AND NOT EXISTS (
    SELECT 1 FROM "UsuarioPermissao" AS existing_grant
    WHERE existing_grant."usuarioId" = old."usuarioId"
      AND existing_grant."permissao" = 'ALERTS_WRITE'
  )
ON CONFLICT ("usuarioId", "permissao") DO NOTHING
RETURNING "id", "usuarioId";
COMMIT;
```

Efeito: somente novas linhas de permissao equivalente na tabela existente. Nao ha ALTER/DROP, alteracao de Usuario, hashes, noticias, configuracoes ou uploads. Nao e uma migration Prisma. E possivel optar por concessoes individuais pela interface, conforme revisao do administrador, em vez do ajuste em lote.

## Rollback

Reimplantar a versao anterior da aplicacao preservando o banco e os volumes, sem restaurar o banco inteiro. O formato `alerts/settings` permanece legivel pela versao anterior; os campos adicionais de id e datas sao ignorados por ela. Uma gravacao pela interface antiga pode descartar esses metadados, mas nao exige remover registros nem recriar tabelas.

As concessoes adicionais sao inofensivas para o codigo antigo. Nao apaga-las em lote: se houver motivo para desfaze-las, revisar somente os IDs efetivamente criados pelo ajuste, distinguindo concessoes posteriores intencionais. Manter backup do JSON antes de uma reversao operacional. Restaurar banco completo poderia retroceder senhas e outros dados, sendo desnecessario e inadequado para este rollback.

## Arquivos desta tarefa

Criados:

- `app/(dashboard)/dashboard/avisos/page.tsx`
- `app/api/avisos/route.ts`
- `app/api/avisos/[id]/route.ts`
- `app/api/avisos/settings/route.ts`
- `app/api/avisos/upload/route.ts`
- `components/dashboard/avisos-manager.tsx`
- `lib/home-alerts-validation.ts`
- `lib/alerts-permission.ts`
- `tools/development/enable-alerts.ts`
- `tests/unit/home-alerts.test.ts`
- `tests/integration/avisos.test.ts`
- `tests/e2e/avisos.spec.ts`
- `docs/MODULO_AVISOS.md`

Alterados:

- `.gitignore` (excecao restrita para este guia, mantendo os demais documentos/evidencias ignorados)
- `app/(public)/page.tsx` (contraste do botao de detalhes e heading condicional dos avisos)
- `app/api/config/route.ts`
- `app/api/config/avisos/upload/route.ts`
- `app/api/banners/settings/route.ts`
- `components/forms/config-form.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/topbar.tsx`
- `components/dashboard/nav-link.tsx`
- `components/dashboard/usuario-permissoes.tsx`
- `lib/permissions.ts`
- `lib/rbac.ts`
- `lib/home-alerts.ts`
- `lib/home-alerts-config.ts`
- `lib/upload-access.ts`
- `lib/api-errors.ts`
- `package.json`
- `tests/e2e/run.ts`
- `tests/unit/security-upload-access.test.ts`
- `tests/unit/deploy-gitignore.test.ts`
- `vitest.config.mts`
- `README.md`

Arquivos removidos: nenhum. Dependencias de runtime adicionadas: nenhuma. Schema/migrations: nenhuma alteracao.

## Validacao local

Resultados de 09/11/2026:

| Verificacao | Resultado |
| --- | --- |
| Linha de base antes de editar | 333 testes, 25 arquivos aprovados |
| Unidade/integracao final | 378 testes, 27 arquivos aprovados, zero falhas |
| Cobertura dos arquivos criticos selecionados, incluindo Avisos | 93,15% de linhas/statements; 86,95% branches; 95,40% funcoes |
| TypeScript sem emissao/incremental | Aprovado |
| Lint | Aprovado; 22 avisos remanescentes/preexistentes de `img`; nenhum aviso novo no modulo |
| Build de producao local | Aprovado; nova pagina e APIs presentes |
| E2E completo | 38 aprovados; zero falhas, ignorados ou retries/flaky |
| Acessibilidade axe | Verificacoes publicas existentes aprovadas; modulo sem violacoes serias/criticas em claro e escuro |
| Responsividade | 375, 768 e 1366 px, sem overflow horizontal da pagina; tabela com rolagem propria |
| Compatibilidade local de permissoes | Tres concessoes adicionadas; segunda execucao adicionou zero |
| Integridade na concessao local | Usuarios, hashes, versoes de sessao, perfis, status e configuracoes comparados antes/depois, sem alteracoes |
| Reinicio local | Somente o app da porta 3000 reiniciado; configuracoes e permissoes preservadas; healthcheck 200 |
| Visitante no servidor local | Pagina administrativa redireciona ao login (307); API de Avisos retorna 403 |
| Schema, migrations e dependencias | Nenhuma alteracao de schema, migration ou package-lock; nenhuma dependencia de runtime adicionada |

Os testes de banco/navegador usam schema PostgreSQL aleatorio e uploads temporarios, removidos ao terminar; nao usam dados ou credenciais de producao. O runner exige comprovacao do PostgreSQL local antes de criar o schema de testes. O build de verificacao usa diretorio separado `.next-avisos-check`, sem substituir o cache do servidor de desenvolvimento da porta 3000.

### Casos de aceite

| Caso | Comprovacao |
| --- | --- |
| Administrador acessa Avisos | AVISOS-01 e testes de RBAC |
| Permissao especifica permite acesso | AVISOS-02 e integracao de APIs |
| Sem permissao nao ve menu | AVISOS-02, menus desktop e mobile |
| URL direta nao libera conteudo | AVISOS-02; consulta de dados somente depois de autorizar |
| Acoes diretas sem permissao negadas | GET/POST/PATCH/DELETE/settings/upload novo e alias: 403 |
| Criacao e edicao | AVISOS-01, datas e integracao com PostgreSQL |
| Ativacao e desativacao | AVISOS-01; retorno visual imediato, erro simulado reverte estado |
| Exclusao confirmada | AVISOS-01 verifica cancelar e confirmar; outro aviso permanece |
| Multiplos ativos e ordenacao | AVISOS-01 e AVISOS-03; setas e atualizacoes concorrentes |
| Exibicao na home | AVISOS-01; ativos visiveis em ordem, inativos ausentes |
| Home sem ativos | AVISOS-04; bloco omitido e API publica sem inativos |
| Persistencia | Reload no E2E e reinicio real do app local, com comparacao de dados |
| Permissoes em Usuarios | AVISOS-02 confere checkbox e revogacao efetiva na mesma sessao |
| Regressao de Config | Sem editor/animacao de avisos; payload antigo ignorado sem apagar JSON |
| Imagens | Upload real isolado; imagem ativa 200 para visitante, oculta/excluida 404; previa autorizada |
| Compatibilidade de formatos antigos | Arrays/aliases, IDs estaveis, sem criacao inventada e aviso apenas com descricao (AVISOS-05) |
| Falhas e validacao | JSON corrompido bloqueado; IDs/URLs/campos invalidos recusados; Origin externo bloqueado |
| Teclado e menu | Criacao via Enter; foco do editor; menu fecha inclusive ao clicar na rota atual |

### Ajustes encontrados durante os testes

A primeira rodada de navegador identificou tres falhas: resposta assincrona do checkbox de status, menu mobile permanecendo aberto na rota atual e contraste insuficiente no botao claro da home. Os comportamentos foram corrigidos, sem remover testes existentes. Uma rodada intermediaria encontrou um seletor amplo demais na nova verificacao de erro, pois o Next tambem possui um anunciador com `role=alert`; o seletor foi limitado a mensagem esperada. A revisao visual tambem ajustou a rolagem do editor para a area de conteudo no desktop. A rodada completa final aprovou os 38 casos.

### Evidencias

Resultados e logs sanitizados, ignorados pelo Git:

- `test-results/avisos-validation/validacao.json`
- `test-results/avisos-validation/testes.txt`
- `test-results/avisos-validation/cobertura.txt`
- `test-results/avisos-validation/lint.txt`
- `test-results/avisos-validation/typescript.txt`
- `test-results/avisos-validation/build.txt`
- `test-results/avisos-validation/integridade-local.json`
- `test-results/e2e.json`
- `test-results/avisos-browser/execucao.txt`
- `test-results/avisos-browser/acessibilidade.json`
- `test-results/avisos-browser/primeira-verificacao.json` (registro das falhas iniciais)

Capturas da aplicacao com dados ficticios, revisadas visualmente:

- `test-results/avisos-browser/avisos-formulario.png`
- `test-results/avisos-browser/avisos-375.png`
- `test-results/avisos-browser/avisos-768.png`
- `test-results/avisos-browser/avisos-1366.png`
- `test-results/avisos-browser/avisos-escuro.png`

Reproducao no Node 24, com PostgreSQL local configurado e porta 3100 livre:

```powershell
$env:EGV_BUILD_DIR='.next-avisos-check'
$env:EGV_BUILD_CPUS='1'
$env:EGV_EVIDENCE_DIR='test-results/avisos-validation'
npm run validate
$env:EGV_EVIDENCE_DIR='test-results/avisos-browser'
npm run test:e2e
Remove-Item Env:EGV_BUILD_DIR
Remove-Item Env:EGV_BUILD_CPUS
Remove-Item Env:EGV_EVIDENCE_DIR
```

`validate` executa testes, coverage, lint, TypeScript e build. O E2E pode ser limitado ao modulo com `npm run test:e2e -- tests/e2e/avisos.spec.ts`. Nao executar build e servidor de desenvolvimento no mesmo diretorio de saida simultaneamente.

### Limites e producao

Nenhuma migration, seed, importacao, restauracao, alteracao de senha ou usuario foi executada por esta tarefa no ambiente real de producao. Nao houve acesso SSH, mudanca de Traefik/Hostinger, reinicio de container remoto, deploy, commit ou push. A unica alteracao funcional nos dados locais existentes foi a adicao das tres permissoes equivalentes; os dois avisos locais existentes, ambos ativos, foram comparados byte a byte e preservados. A verificacao final encontrou os quatro usuarios locais preservados, tres concessoes de Avisos e zero schemas temporarios de E2E restantes. Consultas e navegacao local podem gerar registros normais de acesso.

O modulo continua usando o JSON compartilhado, adequado a arquitetura atual. Gravacoes concorrentes em avisos diferentes e no tempo dos banners sao serializadas; edicoes concorrentes do mesmo aviso mantem a semantica usual de ultima gravacao, sem editor colaborativo ou historico de versoes. O futuro deploy exige uma autorizacao separada e revisao das concessoes de producao; nao se deve copiar o banco local.

## Correcao Da Origem Das Requisicoes

Em 09/11/2026 foi relatado bloqueio de edicao para todos os usuarios locais. A conferencia somente de leitura confirmou quatro contas ativas, todas ja autorizadas a gerenciar Avisos. Nao era necessario acrescentar permissoes.

O erro estava em `isHomeAlertsSameOrigin`: a funcao comparava o Origin do navegador somente com `request.url` e `NEXTAUTH_URL`. O Next pode construir a URL interna com o bind `0.0.0.0`, ou normalizar `127.0.0.1` para `localhost`. Quando o navegador usa outro desses enderecos e a URL canonica configurada tambem e diferente, uma requisicao legitima era recusada com o mesmo 403 de falta de permissao. Os primeiros E2E usavam a mesma origem no navegador e na configuracao de autenticacao e nao reproduziam essa diferenca.

A correcao usa a autoridade do header Host real com o protocolo da requisicao, mantendo a origem canonica configurada como alternativa explicita. O host interno nao autoriza outra origem quando existe Host recebido. A funcao recusa protocolos nao HTTP(S), Host/Origin malformados e origens externas, sem confiar em X-Forwarded-Host arbitrario. Requisicoes sem Origin continuam dependendo da sessao e da permissao, conforme o comportamento anterior.

O RBAC, as quatro contas, as senhas, as permissoes, o `.env`, o schema e os avisos locais nao foram alterados por esta correcao. Nao houve acesso a producao, deploy, commit ou push.

Arquivos deste ajuste:

- `lib/home-alerts-validation.ts`: validacao de origem corrigida.
- `tests/unit/home-alerts-origin.test.ts`: 26 casos, incluindo NextRequest real; nove falhavam antes da correcao.
- `tests/integration/avisos.test.ts`: edicao com Host real para Admin, superadministrador e permissao especifica; bloqueios preservados.
- `tests/e2e/avisos-origin.spec.ts`: gravacao pelo navegador com Origin automatico, edicao persistida e rejeicao de origem externa/visitante.
- `tests/e2e/run.ts`: perfil opcional e exclusivamente de teste com URL de autenticacao em localhost e navegador em 127.0.0.1.
- Este guia.

O perfil de regressao nao modifica `.env` nem usa um banco remoto. Mantem o servidor de teste em loopback e utiliza schema/arquivos temporarios. Depois de gerar o build isolado, pode ser reproduzido em PowerShell:

```powershell
$env:EGV_BUILD_DIR='.next-avisos-check'
$env:EGV_EVIDENCE_DIR='test-results/avisos-origem-browser-alias'
$env:EGV_E2E_AUTH_ALIAS='1'
npm run test:e2e -- tests/e2e/avisos-origin.spec.ts
Remove-Item Env:EGV_E2E_AUTH_ALIAS
Remove-Item Env:EGV_EVIDENCE_DIR
Remove-Item Env:EGV_BUILD_DIR
```

Validacao deste ajuste: 408 testes de unidade/integracao aprovados em 28 arquivos; coverage de 93,35% de linhas, 87,42% de branches e 95,40% de funcoes; lint, TypeScript e build aprovados. Permanecem os 22 avisos de imagens anteriores. A suite completa de navegador aprovou 39 casos, sem falhas, ignorados ou retries, e a execucao adicional com alias de autenticacao aprovou o caso de regressao. As tentativas sem sessao e com Origin externo, inclusive com X-Forwarded-Host forjado, continuaram recebendo 403.

A verificacao usa `headerValue("origin")` do Playwright para conferir o cabecalho realmente transmitido pelo navegador, em vez da lista parcial de headers. Os resultados deste ajuste ficam em `test-results/avisos-origem-validacao/validacao.json`, `test-results/avisos-origem-browser-alias/resultado.json` e `test-results/avisos-origem-browser-completo/resultado.json`, com logs sanitizados nos mesmos diretorios. Os schemas e uploads ficticios sao removidos ao terminar. O servidor local permanece em modo de desenvolvimento na porta 3000, sem necessidade de alterar o `.env` para corrigir este bloqueio.
