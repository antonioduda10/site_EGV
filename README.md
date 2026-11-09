# Portal Institucional - Escola Municipal Getúlio Vargas

## Visão geral

Implantacao na VPS com Docker, PostgreSQL 16, volumes persistentes e Traefik existente: [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md). O compose de desenvolvimento foi preservado; producao usa `compose.production.yml`. Atualizacoes por snapshot local: `npm run deploy:publish` com Node 24 e chave SSH configurada.

Producao: **https://escolagetuliovargas.com.br**. HTTP e `www` redirecionam para esse endereco, preservando caminho e parametros. HTTPS utiliza Let's Encrypt no Traefik existente, com renovacao automatica configurada. Login e painel estao disponiveis pelo dominio HTTPS; PostgreSQL nao publica porta e a porta 3000 permanece em loopback. Backup local diario e restauracao isolada foram validados; Cloudflare R2 permanece desativado nesta etapa.

Portal institucional da Escola Municipal Getúlio Vargas, com site público e painel administrativo para gestão de conteúdos, comunicação escolar e arquivos públicos.

O sistema contempla páginas públicas, notícias, eventos, documentos, galeria, contatos, secretaria, configurações do site, controle de usuários, perfis/permissões e recursos básicos de LGPD.

## Tecnologias utilizadas

**Requisito: Node 24 LTS**, indicado tambem em `.nvmrc` e `package.json`. O incremento Aula 12 utiliza sanitize-html 2.18.1, file-type 22.2.0 e sharp 0.35.5. O Node global nao e atualizado automaticamente.

### Seguranca - Aula 12

Selecao de usuarios sem hashes, sanitizacao de HTML no servidor, filtros de publicacao, politica de novas senhas (15 a 128 caracteres, frases-senha permitidas), arquivos validados por assinatura e confinamento de caminhos. Senhas antigas continuam autenticando. Alteracao/reset de senha revogam sessoes; RBAC e inatividade de 30 minutos foram preservados.

Validacao: `npm test`, `npm run test:coverage`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`, `npm run test:e2e`, `npm run validate`, `npm run test:evidence`. Auditoria: `npm run security:audit`; entrega sem segredos: `npm run security:package`.

Documentacao: [relatorio](docs/aula12-seguranca/RELATORIO_SEGURANCA.md), [riscos pendentes](docs/aula12-seguranca/PENDENCIAS_SEGURANCA.md) e [reproducao/empacotamento](docs/aula12-seguranca/SEGREDOS_E_EMPACOTAMENTO.md). O MVP foi preservado, sem migracao de major do Next. Existem riscos residuais documentados.

### Frontend

- **Next.js 14.2.35** com **App Router**
- **React 18.3.1**
- **TypeScript 5.5**
- **Tailwind CSS 3.4**
- **@tailwindcss/typography** para conteúdo rico renderizado em páginas públicas
- **Tema claro/escuro** com `darkMode: "class"` e variáveis CSS institucionais
- Componentes React organizados em `components/`
- Páginas públicas em `app/(public)/`
- Painel administrativo em `app/(dashboard)/dashboard/`

### Backend e dados

- **Next.js Route Handlers** em `app/api/`
- **Prisma ORM 5.18**
- **PostgreSQL 16**
- **Docker Compose** para subir o banco local
- **Zod** para validação de entradas
- **bcryptjs** para hash de senhas
- Uploads locais armazenados em `uploads/` e servidos por rota própria

### Autenticação e segurança

- **NextAuth 4.24.15** com provedor **Credentials**
- Controle de acesso por **RBAC**, perfis e permissões
- Rotas administrativas protegidas
- Sessões compartilhadas entre site público e painel, com controle de versão/estado ativo e expiração após 30 minutos sem interação
- Campos e páginas de apoio à LGPD, como política de privacidade, cookies e termos

### Edição de conteúdo

- **React Quill / Quill** para edição de conteúdo rico
- Suporte a imagens em notícias, eventos, páginas, banners, galeria e avisos
- Configuração visual do site pelo painel administrativo
- Textos públicos editáveis em configuração
- Avisos importantes na home com imagem, link, animação e controle visual

### Ferramentas de desenvolvimento

- **ESLint** com `eslint-config-next`
- **PostCSS** e **Autoprefixer**
- **tsx** para execução do seed Prisma
- **date-fns** para apoio a datas
- **clsx** para composição de classes quando necessário

## Estrutura principal

- `app/(public)/` - páginas públicas do portal
- `app/(dashboard)/dashboard/` - painel administrativo
- `app/api/` - APIs e rotas de backend
- `components/` - componentes React reutilizáveis
- `components/forms/` - formulários do painel e site público
- `components/dashboard/` - componentes específicos do painel
- `lib/` - autenticação, permissões, banco, tema, uploads e utilitários
- `prisma/` - schema, migrations e seed do banco
- `docs/` - documentação técnica e relatórios do projeto
- `uploads/` - arquivos enviados localmente em desenvolvimento

## Setup

1. Copie o arquivo `.env.example` para `.env`.
   - Defina uma senha exclusiva de desenvolvimento em `POSTGRES_PASSWORD` e use a mesma na URL local `DATABASE_URL`. Gere tambem um `NEXTAUTH_SECRET` exclusivo; nao copie credenciais de producao.
   - Se acessar de outros computadores na rede, ajuste `NEXTAUTH_URL` para o IP/host atual do servidor, por exemplo: `http://192.168.1.9:3000`.
2. Suba o PostgreSQL:
   - `docker-compose up -d`
3. Instale as dependências:
   - `npm install`
4. Rode as migrations, sem seed automatico:
   - `npm run prisma:migrate`
   - Para criar dados demonstrativos, autorize o seed local explicitamente conforme a secao abaixo.
5. Inicie o projeto:
   - `npm run dev`

## Acesso em rede local

O script `npm run dev` está configurado para iniciar o Next.js em `0.0.0.0`, permitindo acesso por outros dispositivos da mesma rede.

No computador atual, os endereços de rede identificados foram:

- Endereço atual da rede: `http://192.168.1.9:3000`

Para acessar por outro computador ou celular na mesma rede:

1. Garanta que o servidor esteja rodando com `npm run dev`.
2. Use no navegador do outro dispositivo o endereço da mesma rede em que ele estiver conectado, por exemplo `http://192.168.1.9:3000`.
3. Mantenha `NEXTAUTH_URL` no `.env` com o mesmo endereço usado pelos clientes.
4. Se não abrir em outro dispositivo mesmo com o Firewall liberado, verifique se a rede não possui isolamento entre clientes, comum em Wi-Fi institucional.

Caso o IP da máquina mude, atualize o `.env` e reinicie o servidor. No Windows, o IP pode ser consultado com `ipconfig`.

### Acesso fora da rede local ou em Wi-Fi com isolamento

Algumas redes institucionais bloqueiam o acesso direto entre dispositivos, mesmo quando o site está correto no computador servidor. Nesse caso, use um túnel HTTPS temporário:

1. Mantenha o projeto rodando com `npm run dev`.
2. Em outro terminal, execute `ngrok http 3000`.
3. Use o endereço `https://...ngrok-free.app` gerado pelo ngrok.
4. Para usar login e painel administrativo por esse endereço, atualize `NEXTAUTH_URL` no `.env` com o link gerado e reinicie o `npm run dev`.

## Banco de dados local

O `docker-compose.yml` sobe um PostgreSQL 16 com:

- Banco: `portal_egv`
- Usuário: `postgres`
- Credencial: configurada exclusivamente no `.env` privado, sem valor padrao no Compose.
- Porta local: `127.0.0.1:5433`, sem exposicao do PostgreSQL na rede.

## Seed e credenciais de desenvolvimento

O seed e exclusivo do desenvolvimento. Ele recusa `NODE_ENV=production`, exige autorizacao explicita e confere se a URL corresponde ao container Docker local `egv-postgres`, incluindo host, porta, banco e usuario. Nao use tunel ou banco remoto para executar o seed.

```powershell
$env:EGV_ALLOW_DEV_SEED='1'
npm run prisma:seed
Remove-Item Env:EGV_ALLOW_DEV_SEED
```

A conta inicial e `admin-dev@example.invalid`, claramente separada das contas institucionais de producao. A senha e aleatoria, longa e salva somente em arquivo privado fora do projeto, no diretorio `PortalEGV/development` do perfil local. No Windows, fica em `%LOCALAPPDATA%\PortalEGV\development`, com ACL restrita; em Linux, em `~/.local/share/PortalEGV/development`. O seed informa apenas o caminho, nunca o valor. Consulte arquivos com `state: applied`; um arquivo `prepared` exige conferir se a operacao foi concluida.

Reexecutar o seed **nao modifica senha, perfil ou status de um usuario existente**. Nao existe senha padrao compartilhada. Para auditar contas locais antigas, use `npm run dev:secure-users`; a correcao exige `npm run dev:secure-users -- --apply`, gera acessos privados e revoga somente sessoes locais das contas corrigidas. O detector e limitado aos padroes legados conhecidos, nao descobre uma senha arbitraria a partir do hash.

Publicar codigo nao sincroniza bancos. O deploy de producao nao executa seed, reset, db push ou importacao local: utiliza migrations e volumes persistentes. Veja [AUDITORIA_CREDENCIAIS.md](AUDITORIA_CREDENCIAIS.md) e [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md).

## Comandos

- `npm run dev` - inicia o ambiente de desenvolvimento
- `npm run build` - gera build de produção
- `npm run start` - inicia a aplicação em modo produção após o build
- `npm run lint` - executa a validação de lint
- `npm test` - executa os testes reais de unidade e integração
- `npm run test:watch` - mantém os testes em modo de acompanhamento
- `npm run test:coverage` - gera cobertura V8 dos arquivos críticos selecionados
- `npm run test:e2e` - testa o portal no Chromium com banco e arquivos isolados
- `npm run validate` - executa testes, cobertura, lint, TypeScript e build, salvando os resultados
- `npm run test:evidence` - gera tabela de casos e imagens de resumo a partir dos resultados aprovados
- `npm run prisma:generate` - gera o Prisma Client
- `npm run prisma:migrate` - executa migrations de desenvolvimento com `--skip-seed`
- `npm run prisma:seed` - seed demonstrativo com autorizacao e isolamento local obrigatorios
- `npm run dev:secure-users` - audita senhas legadas conhecidas somente no banco local validado

## Validação recomendada

Antes de entregar alterações importantes:

- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`

## Avisos Da Home

Manutencao em `/dashboard/avisos`: criacao, edicao, imagem, link, ativacao, ordem, datas e animacao. A secao permanece oculta na home quando nao houver aviso ativo; varios ativos continuam aparecendo na grade existente. Configuracoes gerais nao editam mais avisos.

A permissao **Gerenciar avisos** (`ALERTS_WRITE`) e independente de Config e controlada em `/dashboard/usuarios`, na pagina, menus e APIs. Nao ha alteracao de schema ou migration. Para preservar concessoes manuais locais anteriores, confira `npm run dev:enable-alerts` e aplique explicitamente `npm run dev:enable-alerts -- --apply`. Perfis administrativos mantem a heranca; o ajuste nao modifica senhas.

Diagnostico, testes e compatibilidade: [docs/MODULO_AVISOS.md](docs/MODULO_AVISOS.md). A implementacao inicial foi realizada somente localmente. Publicacao autorizada, rastreabilidade do commit, backup online e rollback: [deploy/BLUEGREEN.md](deploy/BLUEGREEN.md).

## Uploads

Arquivos enviados pelo painel ficam na pasta `uploads/` em desenvolvimento. Essa pasta não deve ser tratada como código-fonte e deve ser preservada em ambiente de produção conforme a estratégia de backup do servidor.

## Backup

Roteiro recomendado:

- Executar `pg_dump` regularmente para a base `portal_egv`.
- Armazenar backups por pelo menos 30 dias.
- Incluir a pasta `uploads/` na rotina de backup, pois ela contém arquivos enviados pelo painel.

## Observações

- O projeto usa `distDir: ".next-build"` no Next.js.
- O frontend mantém SSR/Server Components onde possível.
- O painel administrativo depende das permissões configuradas para filtrar menus e ações.
- As cores institucionais continuam controladas por variáveis CSS e configurações do site.

## Colaboradores

- Antônio Duda Oliveira da Silva
- Diego D’Ávila de Sousa Garcia
- Luis Fernando Carvalho Costa
