# Preparacao blue/green do Portal EGV

## Escopo e autorizacao

Preparacao de 09/11/2026. Nao executar `npm run deploy:publish` ou o
`deploy.sh` antigo nesta atualizacao: eles executam o servico de migrations e
recriam a unica instancia. O backup antigo tambem pausa o app.

O responsavel autorizou preparar duas instancias e acrescentar `ALERTS_WRITE`
a exatamente tres contas revisadas. Essa concessao foi concluida em transacao,
com verificacao de igualdade integral de Usuario, Perfil, UsuarioPerfil e das
linhas anteriores de UsuarioPermissao. Foram inseridas somente tres linhas;
nao houve alteracao de senhas, perfis, status ou outras permissoes. O registro
dos IDs criados fica somente em arquivo root-only na VPS, fora do Git.

**A preparacao, sozinha, nao autoriza a troca publica.** Preparar nao altera `current`,
`PORTAL_IMAGE`, DNS, certificados, Traefik, PostgreSQL ou volumes existentes.
Nenhuma migration, seed, reset, db push, sincronizacao ou restauracao e utilizada.

## Preparacao da candidata

1. Repetir testes locais e revisar o pacote por allowlist. Nao enviar banco,
   uploads, ambientes locais, credenciais ou ferramentas de desenvolvimento.
2. Extrair uma release separada em `/opt/portal-egv/releases/ID`, verificando
   SHA-256. Confirmar igualdade byte a byte do schema e de todas as migrations
   com a release ativa. Divergencia interrompe a preparacao.
3. Usar `python3 RELEASE/deploy/prepare-bluegreen.py ID --commit SHA --confirm-prepare-only`.
   A ferramenta usa o lock de deploy, verifica recursos, portas, identificadores
   dos containers e o provider Docker do Traefik. Compila somente o target runner,
   mantendo a instancia antiga em atendimento.
4. O projeto Compose separado tem apenas `candidate`. Reutiliza as duas redes
   externas e os volumes existentes de uploads/logs, sem criar outro PostgreSQL.
   A unica porta nova e `127.0.0.1:3002`, nao acessivel pela internet.
5. DATABASE_URL, NEXTAUTH_URL e NEXTAUTH_SECRET continuam vindo exclusivamente
   do ambiente privado da VPS. A ferramenta compara os valores em memoria com a
   instancia anterior, sem exibi-los ou gravar copias no estado operacional.
6. Os arquivos estaticos antigos e novos sao reunidos numa pasta operacional
   somente de leitura. Nomes iguais com bytes diferentes bloqueiam o preparo;
   nenhum arquivo da instancia antiga ou de uploads e substituido.
7. As labels clonam regras, redirecionamentos, TLS e protecoes existentes, com
   nomes exclusivos e prioridades superiores, preservando a precedencia das
   regras de seguranca. Nao ha balanceamento aleatorio entre versoes.

## Bloqueio de trafego antes da aprovacao

O healthcheck da candidata exige tanto `/api/health` funcional quanto o arquivo
`/run/portal-egv-route/approved`. Esse arquivo **nao e criado pelo preparo**.
O diretorio de controle e persistente na VPS e montado somente para leitura no
container; a aplicacao nao pode autorizar a propria publicacao. Uma futura
autorizacao permanece apos reinicio do container, ao contrario de um arquivo
em `/tmp`.

Sem autorizacao, o estado Docker e `starting` durante ate 24 horas e depois
`unhealthy`; isso e intencional, nao significa que o teste HTTP interno falhou.
O provider Docker descarta containers starting/unhealthy com
`allowEmptyServices=false`. A configuracao instalada foi revisada; nao habilitar
allowEmptyServices ou allowNonRunning. A home publica deve continuar na release
antiga e `/api/avisos` publico deve continuar retornando o comportamento antigo.

O estado privado `shared/bluegreen/ID/state.json` registra os checks internos,
IDs das instancias e o bloqueio fechado. Nao contem senhas ou ambientes.
`prepare-bluegreen.py` nao possui comando de ativacao. Falha deixa a versao
anterior em atendimento; nao faz remocao automatica de containers existentes.

## Backup sem pausar a aplicacao

`python3 RELEASE/deploy/backup-online.py --confirm-online-backup` cria o mesmo
conjunto recuperavel do backup atual em `/var/backups/portal-egv/data/TIMESTAMP`:
dump custom, uploads.tar.gz, SHA256SUMS, ambiente protegido e release.txt. Acrescenta
`online-check.json`. A configuracao privada permanece root-only na VPS.

O backup usa `pg_export_snapshot` em transacao somente de leitura, compartilhado
com `pg_dump --snapshot`. O PostgreSQL continua aceitando leituras e gravacoes.
As referencias a arquivos sao comparadas em snapshots antes/depois, e os bytes
do volume antes/depois precisam coincidir com os bytes dentro do tar. Referencias
diretas, HTML rico e JSON de avisos/configuracoes sao verificadas. Links simbolicos,
traversal, arquivo referenciado ausente ou modificacao concorrente impedem aceitar
o backup. Uma tentativa recusada permanece `.partial-online-*`, nunca conta como
backup concluido e nao autoriza a troca. Repetir depois de terminar as edicoes;
nao pausar o app automaticamente como alternativa.

Nao sao comparadas tabelas de acessos/sessoes que mudam com o uso normal e nao
referenciam arquivos. Seus registros pertencem ao snapshot consistente do dump.
pg_restore --list, verificacao do tar e checksums comprovam estrutura/bytes, nao
substituem um teste completo de restauracao isolada. O backup externo R2 permanece
desativado. Retencao e backups anteriores nao sao removidos por este comando.

## Troca futura, somente depois da nova aprovacao

1. Revisar novamente Git/segredos, autorizar o commit/push apropriado e associar
   o codigo revisado ao checksum da candidata. Confirmar que nenhum arquivo de
   runtime ou dado local foi incluido.
2. Revalidar candidata, banco, imagens/documentos, sessao/RBAC, tres concessoes
   e integridade dos dados. Nao criar conta real nem alterar senha para testar.
   Testes autenticados em producao exigem sessao autorizada do responsavel;
   nao usar credenciais de teste locais no banco real.
3. Fazer novo backup online verificado imediatamente antes da troca. Se houver
   falha, manter o site antigo e parar.
4. Revisar/instalar os comandos operacionais e o timer para utilizarem o backup
   online e identificar corretamente a instancia ativa. **Nao ativar enquanto
   o backup/restart antigo ainda assumir que apenas portal-egv-app-1 escreve.**
   Esses comandos instalados nao sao alterados durante a preparacao.
5. Sob lock exclusivo, repetir healthcheck, comparacao de ambiente e IDs, schema,
   migrations e ausencia de ativacao previa. Iniciar monitoramento continuo de
   HTTPS antes de criar, via SSH, o arquivo de autorizacao no diretorio de controle.
6. Somente entao abrir o bloqueio. O Docker marca a candidata healthy apos seu
   healthcheck e o Traefik aplica as novas rotas pelo provider existente. Nao
   reiniciar o Traefik, PostgreSQL ou a versao antiga. Esperar a propagacao;
   nao assumir que o Docker healthy significa troca instantanea do proxy.
7. Conferir publicamente o novo comportamento, autenticacao, arquivos, sitemap,
   robots e redirecionamentos, com monitoramento de respostas/erros e comparacoes
   de dados. Falha critica fecha o bloqueio e retorna para as rotas antigas.
8. Atualizar somente os marcadores de release/imagem/instancia ativa depois dos
   testes. Manter a instancia anterior aquecida para rollback; nao desliga-la
   imediatamente. Confirmar sua ausencia de trafego e a compatibilidade de
   navegadores antigos antes de qualquer retirada posterior autorizada.

Nao ha garantia absoluta contra falhas de hardware, rede ou banco compartilhado.
O objetivo comprovavel e nao interromper a instancia ativa durante a preparacao
e a troca planejada. Mesmo sem indisponibilidade, paginas abertas podem precisar
recarregar ao mudar de build. Formularios abertos da Config antiga devem ser
recarregados; a nova API ignora payload antigo de avisos sem apaga-los.

## Rollback

Com a instancia antiga ainda saudavel, fechar o bloqueio da candidata e verificar
que o provider removeu suas rotas e o HTTPS voltou a versao antiga. So considerar
rollback concluido depois do teste externo. Reverter marcadores operacionais
somente se ja tiverem sido alterados. Nao restaurar PostgreSQL, uploads, usuarios
ou permissoes. As tres concessoes novas sao inofensivas para o codigo anterior;
nao remove-las automaticamente.

## Validacao e referencias

```powershell
python -m unittest discover -s tests/deploy -p test_bluegreen.py -v
python -m unittest discover -s tests/deploy -p test_backup_online.py -v
$env:EGV_LOCAL_DOCKER_PROBE='1'
python tests/deploy/probe_bluegreen_docker.py
```

O ensaio de Docker exige explicitamente Docker Desktop local. Usa servidores
ficticios e um Traefik descartavel, sem banco, uploads ou ambiente do Portal.
Testa bloqueio, impedimento de autoativacao, troca e rollback com requisicoes
continuas. Recursos do ensaio sao identificados e removidos individualmente;
nao ha limpeza global de containers, redes ou volumes.

Referencias tecnicas: [provider Docker do Traefik 3.7](https://doc.traefik.io/traefik/v3.7/reference/install-configuration/providers/docker/),
[filtro de saude na versao 3.7.17](https://github.com/traefik/traefik/blob/v3.7.17/pkg/provider/docker/config.go),
[builds e version skew no Next.js 14](https://nextjs.org/docs/14/app/building-your-application/deploying#version-skew).

## Resultado observado da preparacao

Em 09/11/2026, a release `20261109163633-c97fb1e888ff` foi recebida por SCP,
conferida por SHA-256 e compilada na VPS. O pacote contem 270 arquivos de codigo,
sem banco, dados de uploads, ambientes privados, seed ou ferramentas locais.
A rota de codigo `app/api/uploads/[...path]/route.ts` permanece incluida;
nao deve ser confundida com o diretorio de dados de uploads.

- Candidata: `portal-egv-candidate-20261109163633-c97fb1e888ff`, apenas loopback
  3002, controle persistente somente de leitura, sem arquivo de aprovacao.
- Estado: `prepared-not-serving`. Os 18 checks internos esperados passaram,
  incluindo APIs 403 e rotas administrativas 307 sem sessao. O healthcheck HTTP
  interno passou; Docker starting e intencional enquanto o bloqueio esta fechado.
- A release publica continua `20261106114115-c7bbb5f19756`. Os IDs do app antigo,
  PostgreSQL e Traefik permaneceram iguais, assim como o ponteiro current.
- Monitoramento durante o preparo: 80 requisicoes, zero falhas, maior resposta
  observada 360 ms. Reinicio somente da candidata: quatro verificacoes publicas,
  todas 200. Isso nao e afirmacao de disponibilidade global de todos os acessos.
- Comparacao antes/depois do preparo: 14 tabelas de usuarios/perfis/permissoes e
  conteudo com registros identicos, alem dos 72 arquivos de uploads com os mesmos
  caminhos/bytes. As tres concessoes autorizadas ja integravam essa linha de base.
- Seis leituras de imagens na candidata retornaram 200. Um documento PDF retornou
  200 com cabecalho de download e bytes validos; esse GET gerou um registro normal
  DOWNLOAD em LogAuditoria pelo comportamento existente da aplicacao. Esse log
  nao foi removido. Nao houve criacao/edicao de documento ou alteracao de arquivo.
- Foram preservados 29 arquivos estaticos exclusivos da versao antiga; tres
  foram lidos com sucesso pela candidata. HTTPS publico, health, sitemap e robots
  responderam 200; HTTP/www preservaram caminho e parametros no redirecionamento.
  A API de Avisos publica continuou 404, comprovando que a troca nao foi efetuada.
- Backup online aceito: `/var/backups/portal-egv/data/20261109T163324Z`, concluido
  as 16:33:32 UTC (13:33:32 UTC-3), sem pausa da aplicacao. Dump: 304.781 bytes;
  uploads.tar.gz: 127.306.789 bytes; checksums reconferidos. Uma tentativa anterior
  foi recusada por leitura parcial de JSON e corrigida para serializacao jsonb;
  seu diretorio parcial nao e backup concluido e nao foi usado.
- Node 24: 408 testes de unidade/integracao, 39 E2E e zero falhas; coverage dos
  arquivos criticos selecionados 93,35% linhas, lint com 22 avisos antigos de img,
  TypeScript e build aprovados. Foram aprovados tambem 26 testes Python das
  politicas operacionais. O ensaio final de Docker local obteve 137 requisicoes
  sem erro na troca e rollback, inclusive recusa de autoativacao pela candidata.

Evidencias sem credenciais: `test-results/bluegreen-preparation/validation/`,
`test-results/bluegreen-preparation/docker-rehearsal.json`, `test-results/e2e.json`.
Na VPS, registros operacionais root-only ficam em
`/opt/portal-egv/shared/bluegreen/20261109163633-c97fb1e888ff/`: `state.json`,
`public-monitor.json`, `final-checks.json` e `document-check.json`. Nao enviar
essa pasta, logs ou backups ao Git. Nao houve commit, push ou ativacao publica.

Os comandos instalados e o timer antigo ainda nao foram substituidos; a etapa
operacional descrita acima continua obrigatoria antes da futura abertura do
bloqueio. Testes de escrita/autenticacao em producao e a troca definitiva nao
foram antecipados por esta preparacao. Nao parar a instancia anterior agora.

## Ativacao autorizada e rastreabilidade

Em etapa posterior, o responsavel autorizou a publicacao definitiva, sem conceder
autorizacao para migrations, seed, importacao, restauracao ou alteracao de dados
para testes. O novo procedimento continua exigindo a imagem exata do commit
revisado/pushado e backup online imediatamente anterior a abertura do bloqueio.

1. Com o diretorio limpo e HEAD revisado, executar
   `npm run deploy:package -- --commit SHA_COMPLETO`. O publicador le blobs pelo
   Git, nunca dados privados do diretorio, e inclui `deploy-source.json` gerado.
   Esse manifesto e artefato de release, nao arquivo a versionar. O pacote por
   allowlist continua excluindo seed, ferramentas locais, ambientes e dados.
2. Extrair/conferir o pacote. A preparacao recusa qualquer byte ou arquivo fora
   do manifesto, antes e depois do build, e confere a label OCI do commit na
   imagem. Para substituir somente uma previa ainda fechada, informar
   `--replace-closed-candidate ID_DA_PREVIA`: nunca remove a aplicacao em uso,
   nao remove volumes e so age depois do novo build e das verificacoes.
3. Executar `activate-bluegreen.py install-operations ID --commit SHA --confirm`.
   O comando guarda os scripts instalados anteriormente em pasta protegida e
   instala somente wrappers operacionais revisados. O timer continua com o mesmo
   nome/agenda, mas `backup.sh` passa a delegar para o backup online. Nao reinicia
   servicos. `compose.sh restart` passa a reiniciar apenas app; manutencao do banco
   exige procedimento separado. Saida completa de config e recusada; usar --quiet.
4. Executar `/opt/portal-egv/bin/backup.sh` e conferir sucesso, checksums e prova
   online. O modo online nao apaga backups anteriores; a limpeza de retencao deve
   ser revisada separadamente. Monitorar disco enquanto a retencao antiga nao e
   executada por esse modo. R2 permanece desativado.
5. Executar `activate-bluegreen.py activate ID --commit SHA --backup CAMINHO --confirm`.
   Exige backup verificado com ate dez minutos e lock exclusivo, valida ambiente,
   fonte, imagem e identidade dos containers, abre o bloqueio e espera Docker e
   Traefik. Qualquer falha fecha o bloqueio e recupera somente a aplicacao anterior.
6. Apos os checks publicos, atualizar apenas PORTAL_IMAGE, ponteiro current e
   marcador privado de instancia ativa. Nenhuma variavel de autenticacao ou banco
   e substituida. Os wrappers passam a apontar app para candidate; comandos de
   banco continuam apontando ao servico original, sem recria-lo.
7. Conferir autenticacao real, permissao, home, conteudo, dados e uploads. Nunca
   criar contas/conteudo nem redefinir credenciais para isso. Leituras autenticadas
   podem atualizar a atividade normal de sessao e downloads geram logs normais.
   Nao salvar cookies, senhas, tokens, traces ou screenshots com dados privados.
   Se o navegador nao puder ser automatizado com seguranca, solicitar a
   confirmacao manual do responsavel; nao marcar esses testes como aprovados antes.
8. Somente depois de evidencia completa, `production-validation.json` privado
   registra commit e resultados efetivos. `retire-previous` recusa retirada sem
   autenticacao/logout/permissoes/dados/uploads aprovados. A retirada para apenas
   o container anterior, sem excluir container, imagem, codigo ou volume. Nova
   falha critica na verificacao retorna a versao anterior sem restaurar banco.

Rollback explicito instalado: `python3 /opt/portal-egv/bin/activate-bluegreen.py rollback ID --commit SHA --confirm`.
Sua verificacao exige somente rotas que ja existiam na versao anterior; nao exige
`/dashboard/avisos` de uma release anterior ao modulo. O commit da rotina
operacional pode receber uma correcao independente do commit imutavel da imagem
da aplicacao. Nesses casos, registrar ambos separadamente, verificar os bytes dos
scripts instalados e nunca mudar o manifesto ou a revision da imagem ja compilada.
Nunca executar o publicador legado sobre uma instalacao blue/green ativa; ele
falha fechado antes de qualquer migration ou substituicao. Uma proxima atualizacao
blue/green exige novamente revisar slots/portas/instancias e o backup, nao apagar
o marcador para contornar esse bloqueio.
