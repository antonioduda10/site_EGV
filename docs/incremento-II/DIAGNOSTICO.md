# Diagnostico e plano do Incremento II

## Base analisada

Analise de `package.json`, `README.md`, `tsconfig.json`, `next.config.mjs`, schema Prisma, estrutura completa de `app/`, APIs, `lib/`, componentes, formularios e painel. Os manuais antigos citados no historico nao estao presentes nesta copia do repositorio. Nenhum valor do `.env` foi copiado para a documentacao.

O projeto utiliza Next.js 14.2.5, React 18.3.1, TypeScript 5.5.4, Prisma 5.18, NextAuth 4.24.7 e PostgreSQL 16. O comando de testes inicialmente apenas imprimia `No tests configured yet`. Lint e TypeScript passaram antes das alteracoes; o lint ja apresentava 23 avisos `@next/next/no-img-element`.

## Autenticacao e autorizacao

- `lib/auth.ts`: CredentialsProvider valida email e bcrypt; JWT carrega perfis e permissoes, confere `sessaoVersao` e registra presenca em `SessaoAtiva`.
- `lib/require-auth.ts`: redireciona para `/login` quando nao ha sessao; rejeita sessao invalidada ou sem identificador. O layout administrativo chama esse guard.
- `lib/rbac.ts`: Admin herda todas as permissoes; demais perfis possuem conjuntos especificos. Permissoes manuais nao vazias substituem a heranca. `superAdmin` conserva acesso integral. A sentinela `INTERNAL_NO_PERMISSIONS` permite retirar permissoes herdadas.
- `lib/require-permission.ts`: combina sessao valida e RBAC. Os handlers administrativos normalmente retornam 403 tanto sem sessao quanto sem permissao; os testes preservam esse contrato.
- Problema comprovado: o campo `Usuario.status` existia, mas o login e o callback JWT nao impediam acesso de usuario INATIVO. Correcao pontual prevista, sem alterar schema.

## Mapa das APIs

| Acesso | Rotas/metodos |
| --- | --- |
| Leitura publica | GET de noticias e detalhe, eventos e detalhe, documentos, paginas e detalhe, banners e detalhe, midia, albuns-foto, videos, secretaria e detalhe, config e search |
| Escrita publica por finalidade | POST contato, consent, pageview, videos/:id/like, videos/:id/view e endpoints de autenticacao/recuperacao de senha |
| Sessao | auth/ping, auth/permissions-state e POST logs/errors; cada rota conserva seu codigo e formato atuais |
| NEWS_WRITE | Criar, editar, excluir, enviar noticia para aprovacao e upload da noticia |
| NEWS_APPROVE | Aprovar ou rejeitar noticia |
| DOCS_WRITE | Criar/upload, editar e excluir documento |
| EVENTS_WRITE | Escrita e upload de eventos |
| PAGES_WRITE | Escrita/upload de paginas e secretaria |
| BANNERS_WRITE | Escrita de banners e GET/POST banners/settings |
| MEDIA_WRITE / VIDEOS_WRITE | Escrita de midias/albuns / links de videos |
| CONFIG_WRITE | Salvar config, logo e imagem de avisos |
| USERS_READ / USERS_WRITE | Consultar / administrar usuarios; rotas individuais tambem protegem o super administrador |
| USERS_FORCE_LOGOUT / USERS_WRITE | Encerramento de sessao e edicao de permissoes, conforme verificacoes das respectivas rotas |
| CONTACTS_WRITE | Atualizar, atender e excluir contatos |

Observacao: as APIs GET publicas preexistentes nem sempre aplicam os mesmos filtros de publicacao das paginas publicas. Revisar a exposicao de rascunhos, inativos e campos de usuarios em uma tarefa especifica de seguranca; este incremento nao redefine esses contratos silenciosamente.

## Estrategia de testes

| Camada | Alvo | Dependencias externas |
| --- | --- | --- |
| Unidade | RBAC, guards, bcrypt, CredentialsProvider, JWT e sessao | Prisma e getServerSession simulados; bcrypt tambem tem teste real |
| Integracao de handlers | Noticias e aprovacao, documentos, login auxiliar, respostas e auditoria | Prisma/arquivos simulados; Request, Response, Zod e RBAC reais |
| Navegador / integracao completa | Login, paginas, menus, tema, CRUD de noticias/documentos, upload/download e regressao | Next em porta 3100, PostgreSQL com schema temporario, arquivos temporarios, dados ficticios |
| Acessibilidade | Axe WCAG A/AA, labels, foco, teclado e largura da pagina | Chromium em 375, 768 e 1366 px |

Vitest 3.2.7 e Vite 6.4.4 foram escolhidos pela compatibilidade com Node 20.18 instalado. Nao e necessario modificar a arquitetura Next. Cobertura V8 fica restrita aos arquivos de autenticacao/autorizacao e handlers criticos relacionados; nao representa cobertura integral do portal. Playwright e axe sao dependencias somente de desenvolvimento.

## Plano apresentado antes das alteracoes

1. Criar configuracao Vitest, mocks fechados para banco e testes em `tests/unit/` e `tests/integration/`.
2. Configurar Playwright, ambiente isolado e capturas em `tests/e2e/`.
3. Corrigir somente problemas comprovados em autenticacao, respostas de erro e acessibilidade/responsividade.
4. Atualizar README, relatorio, evidencias e comandos de validacao.

Referencias: [Vitest](https://vitest.dev/guide/), [cobertura V8](https://vitest.dev/guide/coverage.html), [servidor de testes Playwright](https://playwright.dev/docs/test-webserver), [acessibilidade com Playwright](https://playwright.dev/docs/accessibility-testing).

## Revisao solicitada: sessao, rodape e carrossel

- O controle de sessao do header consultava `/api/auth/session` apenas ao montar. Como o layout permanece na navegacao interna, podia mostrar Login mesmo apos autenticar. Isso nao comprova perda do cookie; a interface estava desatualizada. O header agora compartilha `SessionProvider`/`useSession` com o formulario de login e o monitor global.
- O monitor global existente nao estava montado, e nao havia prazo efetivo de 30 minutos sem interacao no JWT. A politica agora registra atividade no token, usa a hora do servidor e rejeita renovacao de token ja expirado. Consultas de presenca/sessao nao contam como atividade. A revogacao por versao e o bloqueio de contas inativas permanecem.
- Os estilos do rodape deixaram os links parecidos com texto comum. Foram restaurados azul vivo (`blue-500`, `#3b82f6`), sublinhado em hover/foco e contraste com o fundo escuro. O tom inicial `blue-300` foi intensificado a pedido.
- O botao de pausa e a pausa persistente por interacao foram retirados a pedido. O carrossel volta a trocar automaticamente, mantendo setas, indicadores, intervalo cadastrado e respeito a movimento reduzido do sistema.
- A revisao acrescenta regressao de navegacao autenticada, inatividade, renovacao por interacao, encerramento autorizado e aparencia dos links. Nao modifica schema, endpoints de negocio, dados reais ou configuracao de rede.
