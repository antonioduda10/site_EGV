# Auditoria de credenciais e preservacao do banco

Data: 08/11/2026. Fonte: diretorio local atual do Portal EGV e consultas explicitamente somente de leitura na VPS. Nenhum valor de senha, hash de senha, token ou conexao privada e reproduzido neste relatorio.

## Conclusao

O PostgreSQL local e independente do PostgreSQL da VPS. Trocar uma senha pelo painel de producao altera a conta de producao, nao a copia local. Isso explica a aceitacao de senhas antigas neste computador; nao demonstrava uma regressao causada por deploy.

O fluxo de atualizacao ja preservava os usuarios: nao chamava seed nem importava o banco local. O seed antigo usava `usuario.upsert` com `update: {}`, portanto nao redefinia senhas existentes. Contudo, havia uma credencial fixa na criacao inicial e faltava um bloqueio contra uso fora do desenvolvimento. Isso permitiria criar uma conta fraca em uma execucao manual inadequada, inclusive se a conta inicial tivesse sido excluida.

## Matriz de achados

| Aspecto | Situacao e verificacao | Correcao/controle |
| --- | --- | --- |
| Criacao inicial | `prisma/seed.ts`, configurado no `package.json` | Seed exclusivo local, sem senha fixa; usuario ficticio separado |
| Seed repetido | Antes: `upsert` com atualizacao vazia | Agora: busca e criacao somente se ausente; nenhuma atualizacao de usuario existente |
| Permissoes do seed | Antes podia vincular Admin a uma conta existente de mesmo email | Perfil associado atomicamente apenas na criacao da nova conta de desenvolvimento |
| Contas locais antigas | Cinco usuarios correspondiam a padroes legados conhecidos | Cinco senhas aleatorias distintas, hash existente preservado como mecanismo; versao de sessao incrementada e sessoes/tokens locais revogados |
| PostgreSQL local | Credencial padrao no Compose e conexao local | Valor removido do codigo, credencial privada substituida e porta vinculada somente a loopback |
| Segregacao de ambiente | Local usa `egv-postgres`; producao usa Docker/volume e configuracao proprios na VPS | Guard exige daemon Docker local, container correto, host loopback, porta, banco, usuario e schema public correspondentes |
| Autorizacao de seed | Nao havia opt-in especifico | Exige `EGV_ALLOW_DEV_SEED=1`; `NODE_ENV=production` e sempre recusado |
| Seed automatico | Prisma 5 pode disparar seed em fluxos de desenvolvimento/reset | `npm run prisma:migrate` agora inclui `--skip-seed`; deploy usa somente `migrate deploy` |
| Imagens e pacote | O pacote de publicacao ja nao selecionava o seed | Exclusao explicita de seed/ferramentas locais e COPY restrito a schema/migrations no estagio Docker de migration |
| Migrations de credenciais | As 24 migrations existentes nao possuem DML sobre Usuario | Migration pendente com DML usual de Usuario e recusada antes de executar `migrate deploy`; SQL dinamico exige revisao humana |
| Detector legado | A checagem antiga ignorava hashes com prefixo moderno | Detector agora testa bcrypt antigo e o protocolo atual, com testes de compatibilidade |
| Producao | Quatro contas ativas, zero correspondencias com a lista conhecida, inclusive usando a checagem corrigida | Consulta apenas; nenhuma senha, usuario ou configuracao da VPS alterada |

## Caminhos de criacao e alteracao de usuarios

- `prisma/seed.ts` e `tools/development/seed-admin.ts`: criacao inicial demonstrativa, somente local. Conta nova recebe senha aleatoria e perfil Admin na mesma operacao de criacao. Uma corrida de criacao concorrente nao sobrescreve a conta que venceu.
- `app/api/usuarios/route.ts`: criacao administrativa explicita com RBAC e politica de novas senhas. Nao e executada por build ou deploy.
- `app/api/usuarios/[id]/route.ts` e `app/api/auth/reset/route.ts`: alteracoes/redefinicoes autorizadas pelo fluxo da aplicacao. Nenhuma dessas rotas foi alterada nesta auditoria.
- `tests/e2e/run.ts` e `deploy/production-smoke.cjs`: contas ficticias de verificacao. O E2E usa schema temporario; o smoke de producao e uma acao manual separada, nao uma inicializacao automatica nem uma atualizacao de contas reais.
- `deploy/postgres-init/10-app-user.sh`: cria a role SQL dedicada usando segredos privados da VPS. Role PostgreSQL e conta de login do Portal sao conceitos diferentes.

Os testes conservam senhas curtas exclusivamente como casos negativos ou de compatibilidade em ambiente controlado. `deploy/check-production-users.cjs` conserva uma lista de candidatos conhecidos para **deteccao**, nunca para atribui-los a uma conta. Valores ficticios de compilacao nao sao credenciais de um banco acessivel.

## Fluxo de publicacao

`npm run deploy:publish` -> pacote de codigo por allowlist -> SCP -> verificacao de checksum -> `deploy.sh` -> build das imagens -> backup anterior -> verificacao das migrations -> `prisma migrate deploy` -> recriacao somente do app -> healthcheck.

Nao ha `prisma db seed`, `prisma migrate reset`, `db push`, `pg_restore`, importacao local ou recriacao do volume PostgreSQL nesse caminho. A imagem nova utiliza o mesmo banco e as mesmas linhas de Usuario. Os testes verificam essas propriedades e impedem o retorno acidental dos comandos proibidos ao fluxo normal.

`deploy/host/import-local.sh` existe para o **primeiro transporte autorizado**, realizado na implantacao inicial. Ele recusa destino nao vazio e possui marcador de importacao concluida, confirmado na VPS. Nao faz parte de atualizacoes. Nao seria correto afirmar que nunca houve transporte inicial de dados.

`deploy/bin/restore-db.sh` existe para recuperacao manual e exige confirmacao explicita. **Restaurar um backup antigo pode restaurar senhas antigas**: essa operacao excepcional deve prever revisao de contas, rotacao e revogacao de sessoes. Nao deve ser confundida com publicar uma versao nova. Esta auditoria nao executou restauracao, importacao, seed ou alteracao de banco em producao.

`tests/e2e/run.ts` usa `db push` somente no schema aleatorio do E2E e remove esse schema ao terminar. Nao e o processo de deploy nem substitui o banco real.

## Credenciais locais e Git

Os arquivos de entrega das credenciais novas sao gerados com permissao restrita, fora da pasta do projeto e do OneDrive. O arquivo informa finalidade, ambiente e estado, sem qualquer envio ao Git. A configuracao de conexao local continua no `.env` privado; o Compose exige uma credencial fornecida, sem fallback publico. Se o projeto estiver no OneDrive, esse `.env` tambem fica na pasta sincronizada: nao o compartilhe e considere um workspace sem sincronizacao para desenvolvimento. Reiniciar o container com volume existente nao redefine a senha da role SQL: a troca foi feita explicitamente, apenas no PostgreSQL local, e a conexao antiga foi recusada depois.

O padrao antigo do seed e a credencial padrao de desenvolvimento constavam em versoes do codigo. Foram removidos da versao atual, mas o historico do Git **nao foi reescrito**. A troca das credenciais e a medida necessaria; apagar uma linha atual nao apaga um segredo de commits antigos.

A varredura Gitleaks do historico e a conferencia de 298 arquivos da versao atual retornaram zero achados do seu conjunto de regras, sem copiar configuracoes privadas. Isso nao equivale a provar ausencia de senhas triviais: a revisao manual encontrou os padroes de seed/Compose. Nao foram localizados ambientes privados rastreados; nenhuma credencial atual de producao foi copiada para o computador ou exibida. A checagem por candidatos conhecidos nao pode medir a forca de qualquer senha desconhecida apenas olhando o hash.

## Operacao local

Auditoria sem escrita: `npm run dev:secure-users`.

Correcao explicita de padroes conhecidos: `npm run dev:secure-users -- --apply`. O comando valida o destino antes de consultar usuarios, prepara o arquivo privado antes da escrita e usa transacao com comparacao do hash anterior para impedir sobrescrita concorrente. Nao altera nomes, emails, status ou perfis.

Seed manual, somente depois de configurar o banco local:

```powershell
$env:EGV_ALLOW_DEV_SEED='1'
npm run prisma:seed
Remove-Item Env:EGV_ALLOW_DEV_SEED
```

Se a conta de desenvolvimento ja existir, o seed nao gera outra senha, nao atualiza o hash e nao reatribui perfil. Se alguem esquecer a senha, use uma alteracao explicita autorizada; nao use seed como redefinicao.

## Evidencias e limites

- Linha de base: 311 testes aprovados antes das alteracoes.
- Apos as correcoes: 333 testes e 33 E2E aprovados; lint com os 23 avisos preexistentes, TypeScript e build aprovados. Cobertura dos arquivos selecionados permanece em 92,43% de linhas. Schema e uploads ficticios do E2E foram removidos ao final.
- Checagem local final: cinco usuarios, zero correspondencias com os padroes conhecidos; os cinco acessos novos foram verificados sem imprimir valores.
- Navegador no servidor local: login com uma credencial substituida, resposta 200 na autenticacao, abertura do dashboard e logout confirmados, sem capturar ou imprimir credenciais.
- Manutencao local: volume preservado, contagens dos 29 modelos e hashes das cinco contas preservados durante a troca da credencial PostgreSQL; conexao antiga recusada; servidor local com healthcheck 200.
- Arquivos privados de entrega: permissao restrita ao usuario local e SYSTEM, sem heranca ou outras entradas de permissao concedida, verificada no diretorio deste computador.
- Producao: quatro contas ativas, zero correspondencias conhecidas com ambos os formatos de hash; auditoria executada somente em memoria e sem escrita no banco ou arquivos da VPS.
- Tentativa controlada de executar o seed com `NODE_ENV=production`, opt-in ligado e datasource ficticio: recusada, sem acesso a um banco real.

Os registros de validacao ficam em `test-results/credentials-final`, ignorados pelo Git. A garantia vale para o fluxo documentado e os controles revisados. Nao cobre um operador que altere intencionalmente scripts, execute SQL manual ou restaure um backup antigo. Migrations futuras precisam continuar sendo revisadas; a regra conservadora de DML nao e um parser completo de SQL.
