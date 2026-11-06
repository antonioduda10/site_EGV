# Portal EGV na Hostinger

## Producao atual - 06/11/2026

Endereco definitivo: **https://escolagetuliovargas.com.br**. O certificado Let's Encrypt cobre tambem `www.escolagetuliovargas.com.br`, com validade conferida ate **04/02/2027** e renovacao automatica configurada no Traefik existente. HTTP, www e o antigo IP HTTP redirecionam para o dominio principal, preservando caminhos e parametros. Cloudflare permanece em DNS only nesta etapa.

Login e painel agora usam HTTPS, com `NEXTAUTH_URL` no dominio definitivo e cookies de sessao Secure/HttpOnly conferidos no navegador. A checagem final encontrou tres contas ativas e zero senhas legadas conhecidas; nenhuma senha real foi definida ou exibida pelo processo de deploy. As secoes de implantacao por IP abaixo registram o historico, nao uma restricao atual de acesso ao painel.

O Traefik e o PostgreSQL nao foram recriados nesta finalizacao. Apenas a aplicacao recebeu a nova configuracao e foi reiniciada para verificar persistencia. Backup local diario permanece ativo; R2 desativado por solicitacao do responsavel. Resultados e limites completos constam na ultima secao deste guia.

## Ambiente e arquitetura

VPS: **179.66.135.203**, Ubuntu 24.04, hostname `portal-egv`, timezone `America/Fortaleza` (UTC-3). SSH por chave Ed25519: `ssh root@179.66.135.203`. Nao compartilhe a chave privada nem credenciais em mensagens.

Internet -> Traefik da Hostinger -> Next.js standalone, Node 24 LTS -> PostgreSQL 16. O Docker e o Compose existentes foram preservados. Nao ha Nginx/Caddy ou painel adicional. A compilacao usa um worker e heap de 1536 MB; o host tem swap persistente de 2 GB. `swapon` ja estava instalado em `/usr/sbin`, no pacote oficial Ubuntu `mount`; nao foi necessario reinstala-lo.

O Traefik existente usa **network_mode: host**, Docker provider, dashboard desligado e volume `traefik_traefik-letsencrypt`. Ele acessa o IP privado do container app na rede `portal-egv_edge`, selecionada pela label `traefik.docker.network`; nao e necessario conectar/recriar sua rede host.

O redirecionamento HTTP global tinha prioridade maxima e impedia testes pelo IP. Na implantacao inicial, sua prioridade foi reduzida para 1, mantendo o redirecionamento como padrao. O router do IP tem prioridade 100; rotas administrativas HTTP protegidas, 300. Esse ajuste inicial utilizou uma recriacao controlada do Traefik, com a **mesma imagem local**, depois de salvar compose, ambiente e certificados em backup root-only. Os volumes foram preservados. A etapa de dominio/HTTPS nao exigiu nova recriacao do proxy. Logs recebem limite de 10 MB x 3.

## Acesso inicial por IP (historico)

Esta secao descreve o acesso anterior ao HTTPS. Para administrar agora, utilize **https://escolagetuliovargas.com.br/login**, sem precisar de tunel. O tunel continua disponivel para verificacoes tecnicas internas, mas nao altere `NEXTAUTH_URL` para localhost nem o use como origem alternativa de autenticacao em producao.

- Site publico de validacao: **http://179.66.135.203/**.
- Sem dominio, nao foi emitido certificado para um nome ficticio.
- Login, painel e mutacoes administrativas via HTTP publico ficam bloqueados por allowlist de loopback do Traefik, conforme autorizacao do responsavel.
- Para administrar com transporte criptografado, mantenha aberto no computador:

```powershell
ssh -N -L 127.0.0.1:3001:127.0.0.1:3000 root@179.66.135.203
```

Depois abra **http://localhost:3001/login**. O trafego entre computador e VPS passa pelo SSH, nao por HTTP aberto na internet. A porta 3000 do servidor escuta somente em 127.0.0.1. Nao abra essa porta no firewall.

As contas existentes foram preservadas. Antes de habilitar administracao publica em HTTPS, troque senhas legadas fracas pelo painel via SSH. O script de dominio bloqueia a liberacao se detectar senhas padrao conhecidas, sem mostrar senhas ou hashes. Essa checagem limitada nao substitui revisao das contas e politica de senhas.

## Estrutura

```text
/opt/portal-egv/
  current -> releases/ID
  releases/ID/                 codigo versionado por snapshot
  incoming/                    arquivos de codigo recebidos por SCP
  shared/.env                  segredos de producao, root:root 0600
  shared/postgres-init/        inicializacao da role SQL dedicada
  shared/transfer-manifest.json verificacao privada do primeiro transporte
  shared/smoke/                estado temporario protegido dos testes
  bin/                         compose, backup, restore e dominio
  deploy.sh                    atualizacao controlada
/var/backups/portal-egv/
  host/                        configuracoes anteriores, acesso root
  data/TIMESTAMP/              banco, uploads e configuracao, acesso root
```

Nao use `docker compose config` sem `--quiet` em logs compartilhados: o comando pode mostrar segredos interpolados. Nao imprima `.env`, `docker inspect` completo ou o arquivo de estado dos testes.

## Containers, redes e volumes

| Servico | Papel | Exposicao |
| --- | --- | --- |
| traefik-traefik-1 | Proxy existente da Hostinger | 80/443, host network |
| portal-egv-app-1 | Next.js, usuario nao-root UID 1001, rootfs read-only | somente 127.0.0.1:3000 e rede privada |
| portal-egv-db-1 | PostgreSQL 16 | nenhuma porta publicada |
| migrate (temporario) | Prisma CLI e verificacoes | somente rede privada, profile tools |

Volumes permanentes: `portal-egv_postgres_data`, `portal-egv_uploads`, `portal-egv_app_logs`. O volume de certificados da Hostinger continua separado. A rede `portal-egv_database` e interna; a aplicacao tambem pertence a `portal-egv_edge`. Containers descartaveis de migration nao armazenam dados do portal.

A role de aplicacao `portal_egv` e dona do banco, mas nao tem superuser, CREATEDB ou CREATEROLE. A role de bootstrap e diferente e nao e utilizada pela aplicacao. Ambas possuem senhas aleatorias diferentes, geradas exclusivamente na VPS.

## Variaveis e reproducibilidade

Veja `.env.example` para desenvolvimento e `deploy/production.env.example` para producao. A configuracao local nunca foi enviada. Variaveis obrigatorias no servidor: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `PORTAL_HOST`, `PORTAL_IMAGE`. O Compose fixa `UPLOAD_DIR=/app/uploads` e `ERROR_LOG_DIR=/app/logs`.

`DATABASE_URL` aponta para `db:5432`, schema public, pool limitado. `NEXTAUTH_URL` agora e `https://escolagetuliovargas.com.br`; o projeto nao utiliza `AUTH_URL`. Depois de ativado HTTPS, `PORTAL_WWW_HOST` tambem e obrigatorio. Nao use a mesma chave de sessao do ambiente local. Arquivos de ambiente sao ignorados pelo Git e pelo contexto Docker. Nao coloque segredos em argumentos de build.

O Dockerfile usa `node:24-bookworm-slim`, build multi-stage e uma imagem final standalone. A opcao standalone so e ativada no build Docker: `npm run dev`, `npm run build` e `npm run start` locais continuam normais com Node 24. `EGV_BUILD_CPUS=1` restringe o build da VPS; nao altera regras da aplicacao.

## Primeiro transporte e migrations

A fonte de verdade e a pasta local, inclusive alteracoes ainda nao commitadas. O origin GitHub existe, mas nao foi feito pull, push ou commit nem foram armazenados tokens Git na VPS. O transporte inicial usa um pacote por allowlist e SCP criptografado, nao um ZIP indiscriminado do computador.

`deploy/package.ts` inclui codigo, configuracao de producao e migrations; exclui `.env` locais, node_modules, builds, caches, backups antigos, logs, relatorios temporarios e seed demonstrativo. Banco e uploads seguem em transporte **separado e privado**, com checksums.

`deploy/export-local.ts` valida a origem local, abre snapshot PostgreSQL consistente, gera pg_dump custom e contagens das 29 tabelas do modelo. Para uploads, gera manifesto com SHA-256 por arquivo e arquivo tar sem seguir symlinks. Foram identificados 71 arquivos, totalizando 126.585.383 bytes. Os valores pessoais dos registros nao sao impressos.

O importador recusa banco/volume de uploads nao vazios, verifica arquivos e caminhos e preserva todos os dados. Ele mantem o schema public criado pelo PostgreSQL e omite apenas a entrada CREATE SCHEMA public do TOC; nao remove tabelas ou registros. Nao executa seed ou reset. Uma falha inicial de permissao do script de init foi corrigida antes do transporte: o script sem segredos deve ser legivel pelo usuario postgres do container.

As 24 migrations existentes acompanham o codigo e deixam de ser ignoradas pelo Git. `prisma migrate deploy` e usado em profile tools, nunca reset/db push. Foi encontrada uma **divergencia historica** em `20260522005000_prepare_sugestao_contato_index`: o SQL local ja havia sido editado antes deste deploy. A estrutura real foi comparada com schema.prisma (diff exit 0). `deploy/migration-compatibility.json` registra apenas o par exato revisado; o historico original do banco nao foi falsificado/reescrito. Qualquer outra divergencia falha fechada. Migrations novas contendo operacoes destrutivas exigem revisao manual.

## Comandos diarios no servidor

```bash
ssh root@179.66.135.203
/opt/portal-egv/bin/compose.sh ps
/opt/portal-egv/bin/compose.sh logs --tail=100 app
/opt/portal-egv/bin/compose.sh logs --tail=100 db
docker stats --no-stream
free -h
swapon --show
df -h
docker system df
curl --fail http://127.0.0.1:3000/api/health
/opt/portal-egv/bin/compose.sh restart
```

`/api/health` consulta o banco e retorna apenas status, sem dados internos. Um HTTP 503 indica indisponibilidade. O restart normal nao apaga volumes. Nunca use `docker compose down -v`, `prisma migrate reset` ou limpeza global de volumes.

UFW permite apenas TCP 22, 80 e 443, inclusive regras IPv6. SSH por senha foi desativado somente depois de validar a chave e uma segunda conexao. Root por chave permanece disponivel; nenhum acesso existente por chave foi removido. Fail2ban nao foi instalado: priorizou-se chave SSH obrigatoria e instalacao enxuta, sem confundir isso com limitacao de tentativas no login web.

Atualizacoes seguras de 13 pacotes Ubuntu foram aplicadas. Docker 29.9.2 e Compose 5.6.1 nao foram reinstalados/atualizados. Atualizacoes de Docker, kernel e manutencao com reboot devem ser agendadas separadamente, com backup e janela de indisponibilidade.

## Atualizacoes futuras

No computador, dentro do projeto, com Node 24 e dependencias instaladas:

```powershell
fnm exec --using=24 cmd
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run deploy:publish
```

O publicador empacota a pasta local, envia por SCP e chama no servidor:

```bash
/opt/portal-egv/deploy.sh /opt/portal-egv/releases/ID
```

O deploy usa lock, build novo, backup anterior, checagem de migrations, recriacao **somente do app** e espera por healthcheck. As migrations usam `--no-deps` para nao recriar o PostgreSQL desnecessariamente. O helper seleciona o Compose correto e o override HTTPS quando habilitado.

Se falhar depois do build, tenta retornar a imagem/release anterior. **Rollback de imagem nao reverte automaticamente o schema ou os dados.** Uma migration incompatível exige avaliacao e restauracao explicita do backup, preservando gravacoes posteriores. A rotina nao faz pull automatico de um remoto possivelmente atrasado; nao crie um processo paralelo que sobrescreva a pasta local com origin sem revisao.

## Backups e restauracao

Backup diario pelo systemd, 03:15 a 03:20, com execucao persistente se o horario foi perdido. Retencao minima de sete dias. pg_dump custom, uploads, checksums e copia restrita da configuracao sao gravados atomicamente em pasta protegida. O app fica brevemente pausado durante a captura para impedir exclusao/troca de arquivos entre o snapshot do banco e o tar; pedidos pendentes retomam depois, e o banco/proxy nao sao pausados. Um trap retoma o app mesmo em erro. Locks impedem concorrencia com deploy/restauracao. Logs Docker: 10 MB x 3 por container; logs de erro da aplicacao: logrotate, 5 MB x 7.

```bash
/opt/portal-egv/bin/backup.sh
/opt/portal-egv/bin/test-backup.sh
systemctl list-timers portal-egv-backup.timer
journalctl -u portal-egv-backup.service --since yesterday
du -sh /var/backups/portal-egv/data
docker run --rm --network none -v portal-egv_uploads:/data:ro postgres:16-bookworm du -sh /data
```

Restauracao altera dados e exige flag explicita; faca em janela de manutencao. Cada script cria antes outro backup e para o app, sem apagar volumes:

```bash
/opt/portal-egv/bin/restore-db.sh /var/backups/portal-egv/data/TIMESTAMP --confirm-replace-database
/opt/portal-egv/bin/restore-uploads.sh /var/backups/portal-egv/data/TIMESTAMP --confirm-replace-uploads
```

Banco e uploads devem vir do mesmo backup. Verifique checksums, healthcheck, login e arquivos depois. Uma restauracao automatica nao deve descartar gravacoes novas para apenas desfazer uma atualizacao de imagem. `test-backup.sh` testa o ultimo backup em banco e volume temporarios, valida contagens e bytes e remove somente esses recursos de teste. Execute em janela sem novas publicacoes: a comparacao com o estado atual nao deve ser usada para avaliar um backup antigo apos alteracoes legitimas.

**Backups apenas nesta VPS nao bastam.** O responsavel escolheu Cloudflare R2; a preparacao criptografada esta descrita a seguir. Enquanto bucket e credenciais nao forem configurados e testados, nao ha copia externa comprovada.

## Backup externo privado no Cloudflare R2

Preparacao em 05/11/2026: cliente oficial Restic 0.19.1 em container fixado por digest, wrapper `deploy/bin/backup-external.sh`, implementacao `deploy/r2-backup.py` e unidades systemd separadas. Os containers do app, PostgreSQL e Traefik nao foram alterados durante a instalacao destes arquivos operacionais. O timer externo permanece **desativado**.

O Restic criptografa o snapshot antes do envio. A rotina inclui banco, uploads e a configuracao protegida do backup local; nao faz copia a quente de volumes. Confere SHA-256, exige snapshot completo com menos de 26 horas e bloqueia configuracao incompleta, HTTP, links e permissoes inseguras. Usa lock compartilhado com deploy/backup, memoria de 512 MB e meio nucleo; nao publica portas. O snapshot local e montado somente para leitura.

Para ativar, pelo responsavel pela conta Cloudflare:

1. Crie um bucket **privado e dedicado**; nao habilite r2.dev, dominio publico ou CORS para o backup.
2. Gere uma credencial R2 **Object Read & Write**, limitada apenas a esse bucket, sem permissao administrativa global. Use o endpoint S3 correspondente a jurisdicao escolhida e regiao `auto`. [Autenticacao R2](https://developers.cloudflare.com/r2/api/tokens/), [compatibilidade S3](https://developers.cloudflare.com/r2/api/s3/api/).
3. No terminal SSH, edite `/opt/portal-egv/shared/r2.env` diretamente na VPS. O formato esta em `deploy/r2.env.example`: valores simples, sem `export` ou aspas. Nunca cole as credenciais no chat nem as coloque na pasta local do projeto.
4. A chave de criptografia foi gerada somente na VPS em `/opt/portal-egv/shared/r2-restic-password`, root:root 0600. Guarde uma copia em gerenciador de senhas **fora desta VPS** antes de ativar; sem ela, perder o servidor tambem pode tornar a copia externa irrecuperavel. Nao coloque a chave no mesmo bucket do backup. [Chaves do Restic](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html).
5. Execute manualmente e confira o resultado antes de agendar:

```bash
/opt/portal-egv/bin/backup-external.sh init
/opt/portal-egv/bin/backup.sh
/opt/portal-egv/bin/backup-external.sh backup
/opt/portal-egv/bin/backup-external.sh snapshots
/opt/portal-egv/bin/backup-external.sh check
/opt/portal-egv/bin/backup-external.sh restore-check
```

`init` nao substitui repositorio existente. `check` le e verifica todos os dados remotos; `restore-check` baixa/descriptografa o ultimo snapshot em diretorio temporario root-only e confere os bytes de banco e uploads, sem restaurar por cima da producao. Um teste posterior de restauracao PostgreSQL isolada continua necessario para comprovar a recuperacao completa a partir do R2. Mensagens publicas sao resumidas; o ultimo diagnostico detalhado fica em `shared/r2-last.log`, 0600, para consulta privada por SSH.

Depois de os seis comandos passarem e a chave estar guardada fora da VPS:

```bash
systemctl enable --now portal-egv-backup-external.timer
systemctl list-timers portal-egv-backup-external.timer
systemctl show portal-egv-backup-external.service -p Result -p ExecMainStatus
```

Agendamento externo preparado: 03:45 a 03:50, depois da janela do backup local, no fuso America/Fortaleza. O script recusa copia local antiga em vez de apresentar sucesso com um backup desatualizado. Retencao local continua sete dias; **retencao/prune remoto ainda nao foi ativado** para evitar exclusoes sem revisar recuperacao e custos. Nao use lifecycle de exclusao por idade nos objetos internos do Restic: isso pode corromper o repositorio. Credenciais com escrita tambem podem apagar objetos; isso nao equivale a backup imutavel. Revise retencao, separacao de acesso, custos e requisitos institucionais/LGPD antes da liberacao final.

Validacao feita sem credenciais R2: 13 testes Python da politica de backup e round-trip real do Restic com dados inteiramente ficticios, rede desabilitada e verificacao byte a byte. **Nao houve envio ao R2 e nao se declara backup externo ativo.**

## Dominio, Cloudflare e HTTPS

Dominio definitivo informado em **06/11/2026**: **escolagetuliovargas.com.br**. Endereco principal previsto: **https://escolagetuliovargas.com.br**; `www.escolagetuliovargas.com.br` redirecionara para ele, preservando caminho e parametros. A zona Cloudflare foi configurada pelo responsavel com `A @ -> 179.66.135.203` e `CNAME www -> escolagetuliovargas.com.br`, ambos DNS-only. Nameservers esperados: `osmar.ns.cloudflare.com` e `sharon.ns.cloudflare.com`. Nao crie AAAA sem verificar IPv6 funcional nesta VPS.

**Estado observado nesta revisao:** os dois nameservers autoritativos da Cloudflare ja devolvem os registros corretos, mas Registro.br/RDAP e os resolvedores publicos 1.1.1.1/8.8.8.8 ainda apresentam `a.auto.dns.br`/`b.auto.dns.br`, sem A publico do dominio. Portanto a delegacao ainda nao permite solicitar certificado com seguranca. Confira no Registro.br se a alteracao dos nameservers foi salva ou esta em transicao; se ja estiver confirmada, aguarde a publicacao. Nao basta a resposta correta ao consultar diretamente os nameservers da Cloudflare. [Comportamento de zonas pendentes](https://developers.cloudflare.com/dns/zone-setups/reference/domain-status/).

O helper `deploy/domain-policy.py` faz consultas somente de leitura em dois resolvedores publicos e nos dois nameservers esperados, validando dominio principal, www, todos os IPv4, ausencia de IPv6 nao validado e CAA aplicavel. Falhas DNS/DNSSEC nao sao tratadas como permissao para emitir. A verificacao isolada nao modifica ambiente, containers ou certificados:

```bash
/opt/portal-egv/bin/configure-domain.sh escolagetuliovargas.com.br --check-only
```

Codigo de saida 2 significa DNS ainda nao pronto; nao e uma ordem para tentar emissao repetidamente. Nao foi criado timer/cron para emitir automaticamente durante a propagacao.

Depois de o helper indicar pronto **e de trocar as quatro senhas legadas pelo painel via SSH**, publique a versao preparada (com `npm run deploy:publish` no computador, Node 24) antes de ativar:

```bash
/opt/portal-egv/bin/configure-domain.sh escolagetuliovargas.com.br
```

O script recusa versao antiga sem suporte a www e credenciais legadas conhecidas. Confere a saude local e o resolver existente, faz backup e somente entao ajusta `NEXTAUTH_URL=https://escolagetuliovargas.com.br`, `PORTAL_HOST=escolagetuliovargas.com.br` e `PORTAL_WWW_HOST=www.escolagetuliovargas.com.br`. `AUTH_URL` nao e usado pelo projeto e nao sera adicionado sem necessidade.

O override `compose.https.yml` prepara um certificado com principal e www no SAN pelo resolver `letsencrypt` HTTP-01 da Hostinger, redirecionamento HTTP -> HTTPS, www -> principal em HTTP/HTTPS e do antigo IP HTTP para o dominio. Apenas o router HTTPS principal solicita o certificado; os demais routers TLS usam o mesmo armazenamento de certificados. Renovacao permanece automatica pelo Traefik e seu volume persistente, sem instalar outro proxy, Certbot ou modificar o container Traefik.

Somente o app e recriado para receber origem e labels. O script exige verificacao TLS valida **para os dois nomes**, healthcheck e redirecionamentos com caminho/query preservados. Erros apos a alteracao restauram o ambiente anterior e o estado anterior de HTTPS; uma falha ao reiniciar o app e informada para revisao manual. As rotinas de bloqueio/rollback tambem possuem testes com comandos ficticios, sem usar ACME ou dados de producao. O teste de certificado real continua condicionado ao DNS.

Depois da emissao, pode ligar o proxy Cloudflare com SSL/TLS **Full (strict)**, nunca Flexible. HTTP passa a redirecionar para HTTPS, incluindo administracao. Nao use regras Cache Everything para dashboard, APIs, login, cookies de sessao ou uploads sujeitos a autorizacao. A configuracao de IP real/ratelimit deve confiar somente em proxies conhecidos, nunca em X-Forwarded-For arbitrario.

## Migracao para outra VPS

Prepare Docker/Compose e proxy compativel, transporte codigo por snapshot ou repositorio revisado, crie volumes vazios, transfira backup completo por SSH e mantenha segredos fora da imagem. Restaure banco e uploads com o servico parado, ajuste rede do proxy, NEXTAUTH_URL e dominio, valide internamente e somente depois altere DNS. Preserve os dados/volumes da VPS antiga durante a verificacao. Nunca utilize um reset para contornar falhas de migration.

## Validacao inicial por IP (historico)

- `npm test`: 281 testes aprovados em 21 arquivos; inclui dois testes novos do healthcheck.
- `npm run test:coverage`: 281 aprovados; statements/linhas 92,43%, branches 87,73%, funcoes 95,52%, dentro dos limites existentes. A medicao cobre os arquivos selecionados no Vitest, nao a aplicacao inteira.
- `npm run lint`: aprovado com 23 avisos preexistentes de imagens `img`; TypeScript sem erros (`npx tsc --noEmit --incremental false`).
- Build Docker de producao standalone concluido na VPS com Node 24, sem utilizar o banco de producao durante a compilacao.
- PostgreSQL e app saudaveis; 29 contagens de tabelas e 71 uploads conferidos no primeiro transporte, incluindo SHA-256 de cada arquivo.
- Teste controlado por SSH: login real, DTO de usuario sem hash, criacao/edicao/aprovacao/publicacao de noticia, sanitizacao e upload/download. Os registros ficticios e o estado privado do teste foram removidos.
- Navegador automatizado pelo tunel SSH: login e tres telas administrativas aprovados; home em 390 px sem overflow horizontal. Foi um smoke test especifico do deploy, nao uma nova execucao de toda a suite E2E historica.
- Reinicio do app e do banco realizado; autenticacao e arquivo de teste permaneceram funcionais depois do restart.
- Backup manual e pelo systemd concluidos; restauracao em banco/volume temporarios conferiu contagens e todos os bytes dos 71 uploads, sem sobrescrever producao.
- Acesso externo: nove paginas publicas e `/api/health` responderam 200; `/login`, `/dashboard`, `/api/usuarios` e signin responderam 403. Portas 3000 e 5432 nao aceitaram conexao externa.
- Revisao dos logs: sem padroes criticos no app/proxy. As cinco mensagens FATAL do PostgreSQL no periodo corresponderam a encerramento planejado de conexoes durante restart/limpeza do banco temporario, nao a falha de autenticacao.

O audit de dependencias de producao manteve seis ocorrencias (uma critica, uma alta e quatro moderadas), ja relacionadas a dependencias preexistentes. Esta implantacao nao atualizou dependencias nem alterou schema/migrations. Quatro contas ativas ainda possuem senhas legadas conhecidas; nenhuma senha/hash foi exibida ou alterada automaticamente. A administracao publica continua bloqueada ate a etapa segura de dominio/HTTPS e revisao dessas credenciais.

## Limites de seguranca e conclusao

Na fase inicial, o portal foi publicado para validacao HTTP pelo IP com administracao restrita ao SSH. Essa restricao foi substituida pelo acesso HTTPS validado, conforme a secao final. A configuracao HTTP nao serve login ou painel em texto aberto.

O projeto ainda possui riscos de dependencias registrados em docs/aula12-seguranca/PENDENCIAS_SEGURANCA.md (Next 14 fora da linha suportada, cadeia do editor/Zod). Nao houve migracao de major sem controle. Image Optimization continua desativado e sharp 0.35.5 e mantido como mitigacao especifica, nao como correcao universal. Recuperacao de senha ainda nao envia email; ativacao/teste do backup R2, limitacao persistente de tentativas e revisao de CSP permanecem tarefas separadas. Nao se declara o sistema livre de vulnerabilidades.

## Revisao anterior ao dominio definitivo - 05/11/2026

VPS e guia conferidos antes de alterar arquivos. App e banco saudaveis, Traefik com Docker provider e resolver Let's Encrypt HTTP-01 existente, redes/volumes preservados, apenas 22/80/443 permitidas, 3000 em loopback e banco sem porta publicada. `/` e `/api/health` responderam 200; login publico permaneceu 403. HTTPS ainda nao esta habilitado e nenhum certificado foi solicitado para dominio ficticio. O projeto usa **NEXTAUTH_URL**, nao AUTH_URL; a troca para o endereco definitivo sera feita somente depois de conferir DNS.

As quatro senhas legadas foram novamente detectadas, sem imprimir credenciais. O responsavel optou por troca-las pessoalmente pelo painel via SSH; nenhuma senha real foi alterada automaticamente. A checagem de prontidao precisa chegar a zero antes de abrir o painel em HTTPS:

```bash
/opt/portal-egv/bin/compose.sh --profile tools run --rm --no-deps migrate node deploy/check-production-users.cjs
```

### Triagem dos seis alertas de producao

`npm audit --omit=dev --json` ainda retorna seis pacotes afetados: um critico, um alto e quatro moderados. Sao contagens de pacotes, nao seis exploracoes independentes comprovadas. Versoes conferidas no lockfile e instalacao; sharp 0.35.5 e manifesto com **zero Server Actions Node/Edge** tambem conferidos dentro do container em execucao.

| Pacote | Resultado da revisao contextual |
| --- | --- |
| next 14.2.35 (critico agregado) | Sem correcao integral nesta major. RCE especifica de Windows nao se aplica ao filesystem Linux desta VPS. RCE de Image Optimization tem superficie desativada e mitigacao sharp 0.35.5. Alertas que exigem Server Actions nao encontram actions registradas neste build. Isso nao comprova ausencia de outros riscos de App Router/cache. Migracao para major suportada exige tarefa e regressao proprias. |
| quill 2.0.3 e copias 1.3.7 (moderado) | O editor realmente carregado e React Quill com Quill 1.3.7. A exportacao getSemanticHTML do Quill 2 nao foi encontrada, mas o editor legado conserva risco de XSS no navegador administrativo. Sanitizacao ao salvar/renderizar reduz exposicao publica, sem equivaler a corrigir a biblioteca inteira. |
| react-quill 2.0.0 (moderado) | Alerta herdado do Quill legado; o downgrade sugerido pelo audit nao e uma correcao aceitavel. Migracao do editor fica separada. |
| quill-image-resize-module 3.x (moderado) | Alerta herdado do Quill 1.3.7; sem importacao encontrada no editor atual. Nao removido sem regressao/revisao de uso. |
| quill-image-resize-module-ts 3.x (moderado) | Mesma cadeia de dependencia legada; presenca no lockfile nao demonstra execucao do caminho vulneravel no Portal. |
| zod 3.23.8 (alto) | Alerta de consumo de memoria ao validar colecoes grandes. Nao foram encontrados schemas array/map/set/record expostos no codigo atual; o gatilho especifico nao foi demonstrado. Limites de corpo/abuso continuam necessarios. Trocar so para zod/v3 dentro do pacote v4 nao corrige esse caminho. |

**Mitigacao de um risco aplicavel ao ambiente auto-hospedado:** o advisory de SSRF por upgrades WebSocket recomenda bloquea-los no proxy quando nao sao usados. O Portal nao usa WebSocket em producao. Foram acrescentados routers especificos apenas do Portal, prioridade 400, que negam upgrades WebSocket de origens nao-loopback; o override HTTPS possui a mesma regra. Isso nao modifica a instalacao do Traefik nem o HMR do `npm run dev` local. A eficacia em HTTP e validada por handshake inocuo externo (403), sem payload de exploracao. A regra HTTPS so podera ser comprovada com dominio/certificado. [Advisory oficial SSRF](https://github.com/vercel/next.js/security/advisories/GHSA-c4j6-fc7j-m34r).

Referencias da triagem: [Windows RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [SVG/sharp](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), [Quill - pesquisador original](https://fluidattacks.com/advisories/diomedes), [Zod - esclarecimento do mantenedor](https://github.com/colinhacks/zod/issues/6653).

Nao foi executado ataque, npm audit fix --force ou migracao de major. O risco nao e eliminado por HTTPS; esta revisao nao declara o portal integralmente seguro.

### Segredos, testes e fechamento no Git

`.gitignore`, `.dockerignore` e o empacotador de deploy foram reforcados para ambientes privados com outros nomes, chaves, dumps, credenciais, cookies e caches Python. Exemplos sem valores reais e as 24 migrations continuam incluidos. Ha testes de regressao especificos para exclusoes e preservacao de codigo/migrations.

O remoto HTTPS `github.com/antonioduda10/site_EGV.git` esta configurado sem credenciais embutidas e respondeu a consulta de leitura; isso **nao comprova permissao de push**. Nenhum pull/reset foi executado. O worktree contem tambem alteracoes anteriores da Aula 12, que precisam ser revisadas junto da versao efetivamente publicada, sem sobrescreve-las ou usar `git add .` indiscriminadamente.

Commit e push foram solicitados **apos** o funcionamento completo com dominio/HTTPS. Enquanto faltarem dominio, troca de senhas e testes finais, nao ha commit desta etapa nem hash a informar. Antes do commit, revisar diff e staged files, conferir segredos tambem dentro dos arquivos (ignore nao basta), preservar exclusao de uploads/backups/banco e verificar a autorizacao de escrita no remoto sem expor tokens.

Comandos de validacao desta preparacao, com Node 24 no computador:

```powershell
npm test
npm run lint
npx tsc --noEmit --incremental false
wsl python3 -m unittest discover -s tests/deploy -v
npm run deploy:package
```

O teste de criptografia isolado usa `bash deploy/host/test-restic.sh` na VPS, com a imagem Restic fixada ja disponivel. Depois do dominio: repetir build e suite E2E, navegar por todas as paginas publicas e derivadas, login/painel/logout, criacao/edicao, uploads/downloads, conferir Prisma e persistencia apos reiniciar app/banco. **Esses testes finais de HTTPS ainda nao foram executados.**

Resultados desta preparacao: linha de base com 281 testes; validacao final Vitest/coverage com **304 aprovados, zero reprovados**, mais **13 testes Python aprovados**. Cobertura dos arquivos selecionados permanece em 92,43% de linhas, 87,73% de branches e 95,52% de funcoes. Lint aprovado com os mesmos 23 avisos de imagens e TypeScript sem erros. Build Docker validado reutilizando as camadas de aplicacao ja compiladas; nenhuma dependencia ou schema foi alterado. Backup anterior ao deploy concluido, zero migrations pendentes, app saudavel. O Traefik e o banco nao foram recriados; somente o app foi recriado para receber as labels de protecao.

Apos essa atualizacao, nove paginas publicas e o healthcheck responderam 200; login/painel externos e dois handshakes WebSocket inocuos (variando maiusculas/minusculas) responderam 403. O pacote de codigo conferido manteve as 24 migrations e nao continha ambientes privados, chaves, dumps ou caches Python. A preparacao R2 recusou placeholders sem iniciar conexao externa, e o timer permaneceu desativado. Nenhuma dessas verificacoes substitui a rodada final no dominio HTTPS.

## Preparacao do dominio - 06/11/2026

O dominio e www foram preparados sem ativar routers TLS antes de a delegacao estar correta. A linha de base manteve 304 testes Vitest aprovados; a suite operacional passou de 13 para **28 testes Python**, incluindo DNS parcial, www ausente, IPv4 divergente, IPv6 nao validado, CAA, DNSSEC/SERVFAIL, senhas legadas e rollback de ambiente. Esses resultados de testes isolados nao sao apresentados como validacao HTTPS real.

A release preparada `20261106033426-388090be93f8` foi enviada e conferida por checksum, **sem promover current**. O Compose de principal/www foi renderizado e validado na VPS sem exibir configuracao sensivel. As variaveis com cifroes foram conferidas tambem nas labels de um container de teste criado mas nunca iniciado, com `traefik.enable=false`, sem rede/portas/credenciais e removido apos a verificacao; `config --format json` reescapa cifroes, enquanto as labels efetivas recebem `${1}` corretamente. O helper foi instalado com copia protegida da versao anterior e `--check-only` retornou 2 (pendente), preservando byte a byte o ambiente ativo e os IDs dos tres containers. A release ativa permaneceu `20261106025040-c68e189c13fd`, HTTPS desativado, home/healthcheck 200 e login publico 403. TypeScript e sintaxe shell passaram; lint manteve os 23 avisos preexistentes. Nenhuma ordem ACME foi criada nesta etapa.

Na checagem inicial desta etapa as quatro contas continuavam com senhas legadas conhecidas. O responsavel optou por altera-las pessoalmente; nao houve rotacao automatica ou impressao de credenciais. Configuracao ativa por IP, NEXTAUTH_URL e portas permanecem preservadas enquanto os requisitos nao forem atendidos. Certificado, testes de navegador/autenticacao/uploads em HTTPS e commit/push finais continuam pendentes, nao marcados como concluidos.

Para preencher o R2 exclusivamente no terminal SSH, sem exportar segredos para historico de comandos nem para o chat:

```bash
ssh root@179.66.135.203
nano /opt/portal-egv/shared/r2.env
chmod 600 /opt/portal-egv/shared/r2.env
```

Use o editor disponivel no servidor se nano nao estiver instalado. Nao execute `cat` desses arquivos em sessoes ou logs compartilhados. Depois de configurar e guardar a chave de criptografia fora da VPS, execute os comandos de inicializacao/verificacao da secao R2; o timer continua desativado ate os testes passarem. Nunca inclua Access Key, Secret Key, token ou senha em argumentos de comando, Git ou evidencias.

## Verificacao final solicitada - 06/11/2026

DNS agora confirmado: dominio principal e www retornam exclusivamente `179.66.135.203` em 1.1.1.1, 8.8.8.8 e nos dois nameservers Cloudflare; NS, ausencia de AAAA nao validado e CAA passaram pelo helper. Nao e mais a propagacao que impede a proxima etapa.

A conta institucional restante foi identificada para o responsavel, que informou ter alterado a senha pelo painel. A checagem foi repetida antes da ativacao e depois da limpeza dos testes: **tres contas ativas, zero senhas legadas conhecidas**. Nenhuma senha/hash foi exibido ou alterado automaticamente. Essa verificacao limitada nao equivale a auditar a forca de qualquer senha possivel; contas inativas devem ser revisadas antes de reativadas.

A release `20261106092959-a186dce92787` foi publicada, com backup anterior e aplicacao saudavel. O helper conferiu DNS, credenciais e configuracao do proxy existente; atualizou `NEXTAUTH_URL`, `PORTAL_HOST` e `PORTAL_WWW_HOST` e ativou somente o override HTTPS da aplicacao. O certificado real Let's Encrypt foi validado externamente para os dois nomes, sem ignorar erros TLS, com TLS 1.3 e validade de 06/11/2026 a 04/02/2027. O armazenamento ACME existente continua persistente e com permissao 0600; renovacao automatica continua a cargo do mesmo resolver Traefik HTTP-01. Nao foi necessario reinstalar/recriar o Traefik, PostgreSQL ou volumes.

Foram conferidos **12 redirecionamentos externos**: dominio HTTP, www HTTP/HTTPS e IP HTTP, cada um com tres caminhos/queries, incluindo parametro com espaco codificado. Todos chegaram ao dominio canonico sem perder caminho ou parametros. Healthcheck respondeu 200; acesso anonimo ao painel redirecionou para login e API de usuarios respondeu 403. O bloqueio de upgrade WebSocket foi comprovado tambem em HTTPS (403). Portas 3000 e 5432 nao aceitaram conexao externa.

Validacao executada novamente: `npm run validate` aprovado (304 testes, coverage, lint, TypeScript e build), 28 testes operacionais Python e **30 E2E aprovados** no PostgreSQL local com schema temporario removido ao final. Coverage dos arquivos selecionados: linhas/statements 92,43%, branches 87,73%, funcoes 95,52%. Lint conserva 23 avisos preexistentes e o build informa Browserslist desatualizado. A compilacao isolada usou `.next-production-check` e conexao ficticia; os testes de navegador usaram banco, usuarios e uploads ficticios. Evidencias desta rodada ficam em `test-results/production-final` e `test-results/production-browser-evidence`, ignorados pelo Git, sem substituir as evidencias historicas da Aula 12.

Os scripts `deploy/production-smoke.cjs` e `deploy/ui-smoke.ts` foram executados contra **https://escolagetuliovargas.com.br**, sem ignorar erros de certificado, usando contas e conteudos ficticios temporarios. Resultados:

- 22 paginas publicas, incluindo noticias, eventos e paginas institucionais derivadas existentes, responderam 200; o alias historico da galeria redirecionou corretamente.
- Login real, listagem/criacao/edicao de usuarios sem hash nos retornos, recusa 403 para conta sem permissao, criacao/edicao/aprovacao/publicacao de noticia e sanitizacao passaram.
- Upload, leitura por bytes e download de documento passaram; autenticacao e arquivo permaneceram funcionais depois de reiniciar somente o app.
- No Chromium, login e 13 telas administrativas passaram; 12 paginas publicas foram conferidas em 1366 e 390 px, sem overflow horizontal ou imagens quebradas. Cookies de sessao Secure/HttpOnly foram confirmados.
- Logout removeu a sessao e nova tentativa de abrir o painel voltou para login. Os usuarios, conteudos e arquivo ficticios foram removidos com verificacao de pertencimento; o arquivo privado de credenciais de teste nao permaneceu no servidor.

O override `deploy/compose.smoke.yml` concede rede de saida apenas ao container temporario de verificacao, nao ao PostgreSQL. Credenciais/cookies nao sao impressos, e nao sao geradas capturas do painel real. A configuracao de portas continua limitada a SSH 22, HTTP 80 e HTTPS 443; app em `127.0.0.1:3000`, banco sem porta publicada. IDs/datas de criacao do proxy e banco permaneceram iguais aos da implantacao inicial.

Backup posterior a limpeza concluido em `/var/backups/portal-egv/data/20261106T093829Z`. Checksums passaram; a restauracao em banco/volume temporarios confirmou contagens de usuarios, noticias, documentos e migrations, alem dos **71 uploads com todos os bytes identicos**. Producao nao foi sobrescrita. O timer de backup local permanece ativo, diario, com retencao minima de sete dias. O backup pausa brevemente apenas o app para alinhar banco e arquivos; proxy e banco continuam em execucao.

R2 permanece **desativado/inativo** por solicitacao expressa. Ainda nao existe backup externo: perda da VPS continua sendo um risco, mesmo com restauracao local aprovada. A auditoria de producao foi repetida e manteve seis pacotes afetados (um critico, um alto e quatro moderados); as mitigacoes e riscos residuais da triagem acima continuam validos. HTTPS nao corrige vulnerabilidades das dependencias. Nenhuma dependencia ou migration foi alterada nesta finalizacao.

O fechamento no Git inclui o codigo local revisado da Aula 12 e da implantacao, sem substituir a versao atual pelo remoto. Ambiente, chaves, credenciais, banco, backups e uploads ficam fora do conjunto versionado. A revisao do diff e das evidencias e complementada por Gitleaks com saida redigida; a varredura automatizada nao e garantia absoluta de ausencia de segredos. O resultado de commit/push e o hash efetivo sao informados na entrega, somente depois da validacao HTTPS.

Para repetir o smoke test completo, execute `prepare`, depois o navegador, reinicie somente o app, aguarde o healthcheck e execute `verify`. O estado privado nao deve existir antes de `prepare`; em caso de interrupcao, use `cleanup` e investigue a falha antes de repetir. Os comandos criam apenas registros ficticios e devem ser usados em janela de verificacao autorizada:

```bash
# Na VPS: preparar verificacao real em HTTPS
/opt/portal-egv/bin/compose.sh -f /opt/portal-egv/current/deploy/compose.smoke.yml --profile tools run --rm --no-deps -T -e PORTAL_SMOKE_BASE_URL=https://escolagetuliovargas.com.br -v /opt/portal-egv/shared/smoke:/state migrate node deploy/production-smoke.cjs prepare
# Depois do navegador e restart do app, repetir o comando com verify no lugar de prepare.
```

```powershell
# No computador com Node 24 e SSH por chave configurado
$env:PORTAL_SMOKE_BASE_URL='https://escolagetuliovargas.com.br'
npm run deploy:ui-check
```

## Sitemap, robots e metadados publicos

`app/sitemap.ts` e `app/robots.ts` utilizam as convencoes nativas de metadados do Next.js 14, sem dependencias adicionais. Enderecos: **https://escolagetuliovargas.com.br/sitemap.xml** e **https://escolagetuliovargas.com.br/robots.txt**. A origem canonica unica esta em `lib/seo.ts`; `metadataBase`, canonical e Open Graph nao dependem do host recebido nem da origem de autenticacao local. As paginas dinamicas codificam slug/ID nos metadados e no sitemap.

O sitemap inclui 12 rotas publicas fixas: inicio, noticias, eventos, documentos, galeria, fotos, videos, secretaria, contato, privacidade, cookies e termos. Tres consultas Prisma paralelas acrescentam noticias `PUBLICADO` com data permitida pelo helper `publicNewsWhere`, paginas institucionais `visivel = true` e eventos `PUBLICADO`. Somente slug/ID e datas de noticia sao selecionados; nao sao consultados usuarios, contatos ou dados escolares privados. Galerias exibem conteudo dinamico nas rotas existentes; nao existem paginas individuais de album/video para inventar no sitemap.

`lastmod` usa a data de publicacao da noticia ou, na ausencia, sua data de cadastro. Nas demais URLs nao ha uma data persistida confiavel de modificacao da pagina inteira: o campo e omitido, sem usar a hora da requisicao ou a data futura de realizacao de um evento como atualizacao. O sitemap e dinamico, sem cache de publicacao: publicar, ocultar ou retirar conteudo reflete na proxima consulta, sem novo build. Falha do banco nao e convertida silenciosamente em um sitemap parcial.

Nao entram login, recuperacao/autenticacao, dashboard, APIs, uploads/arquivos brutos, paginas invisiveis, noticias futuras/nao publicadas, eventos em rascunho, variantes de busca/query ou o alias com redirecionamento `/galeria/midias`. O robots libera `/`, bloqueia `/dashboard`, `/login`, `/recuperar` e `/api/`, mas permite explicitamente `/api/uploads/` para as imagens e arquivos publicos. Nao bloqueia `/_next/`, CSS, JavaScript ou `/uploads/`. Isso nao concede acesso a arquivos restritos: os controles de autenticacao/RBAC/download permanecem no servidor. `robots.txt` nao e mecanismo de autorizacao nem garantia de desindexacao.

`noindex, nofollow` e aplicado somente pelos layouts de autenticacao e dashboard. O site publico nao herda essa regra. Os testes novos verificam consultas/filtros, datas, origem canonica, XML real, exclusao de rascunhos/paginas invisiveis e metadados publicos/privados em navegador com banco isolado. A solicitacao de indexacao e a decisao de indexar continuam sob controle do Google; depois de validar a publicacao, envie `sitemap.xml` na propriedade correspondente do Search Console.

Validacao e deploy seguem o procedimento de atualizacao acima, com Node 24, backup anterior e recriacao somente do app. Nao ha migration, mudanca de segredo, usuario, upload ou configuracao do proxy/HTTPS nesta melhoria. Conferencia publica depois do deploy:

```bash
curl --fail --silent --show-error https://escolagetuliovargas.com.br/sitemap.xml
curl --fail --silent --show-error https://escolagetuliovargas.com.br/robots.txt
```

Referencias: [sitemap no Next.js 14](https://nextjs.org/docs/14/app/api-reference/file-conventions/metadata/sitemap) e [robots no Next.js 14](https://nextjs.org/docs/14/app/api-reference/file-conventions/metadata/robots).

Validacao local desta melhoria em 06/11/2026: linha de base com 304 testes; depois da implementacao, **311 testes Vitest e 33 E2E aprovados, zero reprovados**. `npm run validate` concluiu testes, coverage, lint, TypeScript e build; cobertura dos arquivos selecionados permanece em 92,43% de linhas/statements. Lint manteve os 23 avisos preexistentes de imagens e o build manteve o aviso de Browserslist. A compilacao confirmou `/sitemap.xml` dinamico e `/robots.txt` estatico. O E2E utilizou schema PostgreSQL e uploads temporarios, removidos ao final. Os registros desta rodada ficam em `test-results/seo-final` e `test-results/seo-browser-evidence`, fora do Git; a entrada temporaria de build adicionada automaticamente ao tsconfig foi retirada, sem alterar a configuracao original do projeto.

Validacao publica apos o deploy da release `20261106114115-c7bbb5f19756`: ambos os endpoints responderam **200**, com XML valido e texto puro nos tipos corretos. O sitemap continha **22 URLs: 12 fixas, quatro noticias, tres paginas institucionais e tres eventos**, com quatro `lastmod` validos. O conjunto completo foi comparado por SHA-256 com uma consulta independente, somente de leitura, ao PostgreSQL: os conjuntos coincidiram, sem selecionar campos privados. Todas as 22 paginas responderam 200, com canonical e Open Graph no HTTPS sem www e sem meta/header noindex publico. CSS, JavaScript e imagem publica de upload foram lidos com sucesso; quatro redirecionamentos HTTP/www para sitemap e robots passaram. Login/recuperacao apresentaram noindex; painel anonimo continuou redirecionando para login, usuarios retornou 403 e o healthcheck Prisma respondeu 200.

O backup anterior ao deploy ficou em `/var/backups/portal-egv/data/20261106T114309Z`, com checksums conferidos. IDs dos containers Traefik e PostgreSQL, volumes e portas foram preservados; app e banco saudaveis. A comparacao protegida dos ambientes anterior/atual confirmou que somente `PORTAL_IMAGE` mudou, sem exibir valores. Nenhuma credencial, registro real, arquivo enviado, configuracao de HTTPS ou servico de backup externo foi alterado nesta melhoria. A quantidade do sitemap e uma fotografia da verificacao; futuras publicacoes/ocultacoes alteram o total automaticamente.
