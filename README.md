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
- Sessões com controle de versão/estado ativo
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
- `npm run prisma:generate` - gera o Prisma Client
- `npm run prisma:migrate` - executa migrations em desenvolvimento
- `npm run prisma:seed` - popula dados iniciais

## Validação recomendada

Antes de entregar alterações importantes:

- `npm run lint`
- `npm run build`
- `npx tsc --noEmit --incremental false`, quando for necessário validar tipos sem depender do cache incremental

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
- Luis Fernando
- Diego Dávila