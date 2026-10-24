# Portal Institucional - Escola Municipal Getúlio Vargas

## Visão geral

Portal institucional da Escola Municipal Getúlio Vargas, com site público e painel administrativo para gestão de conteúdos, comunicação escolar e arquivos públicos.

O sistema contempla páginas públicas, notícias, eventos, documentos, galeria, contatos, secretaria, configurações do site, controle de usuários, perfis/permissões e recursos básicos de LGPD.

## Tecnologias utilizadas

### Frontend

- **Next.js 14.2.5** com **App Router**
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

- **NextAuth 4.24** com provedor **Credentials**
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
   - Se acessar de outros computadores na rede, ajuste `NEXTAUTH_URL` para o IP/host atual do servidor, por exemplo: `http://192.168.1.9:3000`.
2. Suba o PostgreSQL:
   - `docker-compose up -d`
3. Instale as dependências:
   - `npm install`
4. Rode as migrations e o seed:
   - `npm run prisma:migrate`
   - `npm run prisma:seed`
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
- Senha: `postgres`
- Porta local: `5433`

## Credenciais iniciais do seed

- Email: `admin@egv.edu.br`
- Senha: `***********`

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
- `npm run prisma:migrate` - executa migrations em desenvolvimento
- `npm run prisma:seed` - popula dados iniciais

## Validação recomendada

Antes de entregar alterações importantes:

- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`

## Incremento II: testes e acessibilidade

A suíte usa **Vitest 3.2.7**, **Vite 6.4.4**, cobertura **V8**, **Playwright 1.64.1** e **axe-core/playwright 4.13.0**, somente como dependências de desenvolvimento. As versões do Vitest/Vite são compatíveis com o Node 20.18 utilizado neste projeto.

Os testes de unidade e handlers simulam Prisma e operações de arquivos. Incluem CredentialsProvider, JWT, sessão, RBAC, proteção administrativa, notícias, aprovação, documentos, upload e tratamento de erros. `npm test` não precisa acessar o banco nem os uploads reais.

Para a revisão completa no navegador, mantenha o PostgreSQL disponível e execute:

```powershell
npx playwright install chromium
npm run validate
npm run test:e2e
npm run test:evidence
```

`test:e2e` usa a conexão PostgreSQL configurada para criar um **schema temporário com nome aleatório**, aplica o schema atual somente nesse ambiente e cria registros fictícios. O Next inicia na porta **3100**, com credenciais geradas em memória e arquivos em uma pasta temporária. Ao terminar, o schema e os arquivos de teste são removidos. A conta do banco precisa de permissão para criar/remover schemas; a porta 3100 deve estar livre. Não é necessário alterar o `.env`, usar ngrok ou executar o seed do banco real para esses testes.

As verificações incluem 375, 768 e 1366 px, menus, sidebar, tema, teclado, acessibilidade automatizada, CRUD de notícias/documentos, uploads/downloads e atualização de configuração sem novo build. Também verificam a sessão entre páginas públicas e painel, saída voluntária, encerramento por usuário autorizado, expiração por inatividade e renovação apenas por interação. A execução direta de `npx playwright test` é bloqueada para evitar uso acidental do ambiente real.

As melhorias pontuais incluem rótulos de formulário, foco visível, contraste, login com feedback de envio, suporte visual escuro e links azuis no rodapé com destaque ao passar o mouse ou receber foco. Os ícones de Facebook, Instagram, YouTube, LinkedIn e TikTok usam cores características de cada rede, preservando nomes, endereços e configuração de abertura dos links. O carrossel troca os banners automaticamente, sem botão de pausar/reproduzir, mantendo setas, indicadores e intervalo configurável. A preferência do sistema por movimento reduzido continua respeitada. O portal continua alinhado ao MVP e à acessibilidade básica. A auditoria automatizada não substitui avaliação humana ou testes em aparelhos reais.

### Comportamento da sessão

Voltar ao site público não encerra o acesso ao painel. O cabeçalho acompanha a sessão e mostra **Painel** para quem já entrou; acessar `/login` com sessão válida encaminha ao dashboard sem pedir a senha novamente. A sessão é invalidada após **30 minutos sem interação**, na saída voluntária, no encerramento por usuário autorizado ou quando a conta é desativada/removida. A regra de inatividade também é conferida no servidor; consultas automáticas de sessão e presença não renovam esse prazo.

Movimentos do ponteiro, cliques, teclado, toque e rolagem renovam a atividade em verificações espaçadas, sem alterar o banco ou as permissões. No site público, a expiração não interrompe a leitura da página; no painel, encaminha para o login com mensagem explicativa. Cookies válidos anteriores à atualização recebem uma janela inicial de 30 minutos. Não há alteração de `.env` para essa correção; continuam valendo as orientações de host/rede descritas acima.

Relatórios e capturas: [docs/incremento-II/RELATORIO_INCREMENTO_II.md](docs/incremento-II/RELATORIO_INCREMENTO_II.md) e [docs/incremento-II/EVIDENCIAS.md](docs/incremento-II/EVIDENCIAS.md). A cobertura HTML local fica em `coverage/index.html`; ela representa os arquivos selecionados, não o sistema inteiro.

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
