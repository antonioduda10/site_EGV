# Diagnostico de Seguranca - Aula 12

Referencia: 24/10/2026, Projeto Extensionista Integrador II, UNITINS. Fonte: copia local 12.0 de `site_EGV`; nao houve sincronizacao com remoto. Diagnostico anterior as correcoes de seguranca. Nao foram utilizados dados pessoais reais nos testes.

## Linha de base

`npm run validate`: 110 testes aprovados; cobertura selecionada 97,50% linhas, 88,78% branches, 92,59% funcoes; lint sem erros, com 23 avisos preexistentes de imagens; TypeScript aprovado. O build foi interrompido por `EPERM` ao abrir `.next-build/trace`, antes de confirmar compilacao. Trata-se de bloqueio ambiental preexistente, nao de falha introduzida. Nenhum processo existente foi encerrado, nenhum build foi apagado. E2E anterior sera registrado separadamente, sem declarar aprovacao sem execucao.

## Matriz

Complemento da linha de base: E2E inicial foi executado, mas nao iniciou o servidor por ausencia de build de producao utilizavel. Nenhum caso foi aprovado nessa etapa; registro em evidencias/linha-base/e2e.txt.

| ASPECTO | SITUACAO ATUAL | PROBLEMA/RISCO | PRIORIDADE | CORRECAO |
| --- | --- | --- | --- | --- |
| Autenticacao | Credentials e bcrypt; conta ATIVO obrigatoria | Sem limitacao persistente de tentativas; login auxiliar permite consulta de credenciais | Alta | Preservar login legado, documentar rate limiting persistente; atualizar NextAuth |
| Autorizacao | `requirePermission` nega sem sessao/id ou com sessao invalidada | APIs GET de conteudos nem sempre aplicam a mesma politica das paginas | Alta | Condicionar visibilidade a permissao especifica, nao apenas a existir sessao |
| RBAC | Perfis, permissoes manuais e superAdmin conferidos no servidor | Nao foi confirmado bypass dos guards existentes | Controle existente | Preservar heranca, sobrescrita manual e protecao do super administrador |
| Controle de acesso | Layout dashboard protegido e mutacoes com permissao | Acesso direto por ID a rascunhos, paginas invisiveis e servidor inativo | Alta | 404 para conteudo nao publico, com excecao administrativa autorizada |
| Validacao de entrada | Zod em varios handlers, allowlists de status | HTML apenas normalizado; uploads confiam no MIME recebido | Alta | Sanitizador central e politica de arquivos com assinatura/extensao/limite |
| Integridade | Prisma, status tipados e transacoes em usuarios | Troca de banner remove imagem antiga antes de validar a nova; reset nao atomico | Alta | Validar/salvar antes de substituir; consumir reset em transacao |
| Confidencialidade | APIs de usuarios exigem permissao | GET/POST/PATCH retornam objetos Prisma contendo `senhaHash` | Critica | `safeUserSelect` central e testes explicitos de ausencia do campo |
| Dados pessoais/sensiveis | Contatos e gestao de usuarios protegidos; modelos academicos presentes no schema | Objetos completos de usuario consultados desnecessariamente; evidencias antigas incluem telefone institucional | Alta | Minimizar selecoes, usar dados ficticios e rodape sem telefone nas novas capturas |
| Senhas | bcrypt com salt; login aceita contas existentes | Novas senhas com minimo 6; bcrypt limita entrada a 72 bytes | Alta | Minimo 15, maximo 128 caracteres, frases-senha; pre-hash versionado antes do bcrypt para novas senhas, com verificacao legada |
| Sessoes | Inatividade 30 minutos validada no JWT; versao para revogacao; saida voluntaria | Reset de senha nao revoga sessoes existentes | Alta | Preservar controles e incrementar versao ao trocar/resetar senha |
| APIs | Escrita administrativa geralmente protegida | Listagens publicas de noticias/eventos/paginas/banners/documentos sem filtro completo | Alta | Reutilizar politicas de publicacao tambem em paginas SSR, busca e detalhes |
| Upload/download | Permissao para enviar; servir arquivos ja usa `path.relative` | Download e exclusao aceitam caminhos externos; download ignora INATIVO; sem magic bytes | Critica | Resolver central de caminhos, checagem de links simbolicos, politica por categoria e autorizacao do arquivo direto |
| HTML rico/XSS | Quill em noticias/eventos/paginas/politicas; seis sinks de HTML publico | `rewriteUploadUrlsInHtml` nao sanitiza; payloads de script/eventos/protocolo perigoso persistem | Alta | `sanitizeRichHtml` com allowlist no servidor ao salvar e ao renderizar conteudo antigo |
| Dependencias | Next 14.2.5, NextAuth 4.24.7; nao ha sharp instalado nem uso de next/image/next/og | Auditoria inicial: 12 ocorrencias, incluindo 2 criticas; correcoes de major nao serao aplicadas indiscriminadamente | Alta | NextAuth 4.24.15, patches compativeis, sanitizador mantido; desativar otimizador de imagem sem uso; registrar riscos residuais do Next |
| Segredos/configuracao | `.env` ignorado; `.env.example` presente | Nem todos `.env.*` privados sao ignorados; exemplo usa valores demonstrativos em vez de placeholders claros; falta empacotamento seguro | Alta | Padrao `.env*` com excecao somente do exemplo, empacotador por allowlist e orientacao de rotacao |
| Logs | Auditoria e arquivo de erros; wrapper de noticias/documentos evita payload/erro Prisma | Logger do painel aceita resposta bruta e query string; outros catches podem expor mensagem interna | Alta | Remover query/payload livre, redigir campos sensiveis e padronizar erros genericos |
| Mensagens de erro | Login e forgot nao revelam existencia de conta; wrapper seguro existente | Album devolve `error.message`; pagina registra erro interno completo no console | Media | Mensagem externa generica e log estruturado sem conteudo sensivel |
| Headers | Sem configuracao explicita | Ausencia de nosniff, referrer e protecao de framing | Media | Headers de baixo risco; CSP completa fica pendente para evitar quebrar Quill/Next |

## Mapa de HTML rico

| Campo | Escrita | Leitura/sink |
| --- | --- | --- |
| Noticia.conteudo | POST/PATCH `/api/noticias` | `/noticias/[slug]`; JSON de noticia/busca |
| Evento.conteudo | POST/PATCH `/api/eventos` | `/eventos/[id]`; JSON de eventos |
| PaginaInstitucional.conteudo | POST/PATCH `/api/paginas` | `/p/[slug]`; JSON de pagina/busca |
| ConfiguracaoSite.politicaPrivacidade/cookies/termos | POST `/api/config` | paginas legais e JSON de configuracao |

O script fixo de inicializacao do tema no layout nao recebe HTML do banco e nao deve passar pelo sanitizador de artigos. Descricoes, titulos e avisos sao renderizados como texto React, nao como HTML. Nao ha campo de publicacao em Midia/AlbumFoto: nao sera inventado um status novo. VideoGaleria possui dataPublicacao, que sera respeitada para visitantes.

## Consumidores e compatibilidade

Leituras administrativas principais usam Prisma diretamente em paginas protegidas. Formularios e actions usam os endpoints de escrita atuais; ConfigForm consulta GET `/api/config`. O editor verifica a URL do upload antes de salvar: a permissao do modulo precisa continuar permitindo o preview do arquivo ainda nao publicado. A busca publica ja filtra parte dos estados, mas falta respeitar agendamento. Downloads e URLs diretas de uploads precisam compartilhar a mesma restricao, evitando bypass pelo caminho bruto.

## Inventario de GETs e consumidores

| GET publico ou condicionado | Politica apos correcao | Consumidores |
| --- | --- | --- |
| noticias e noticias/[id] | PUBLICADO + data; permissao NEWS permite administracao | integracoes JSON, formularios/actions; home/lista/detalhe SSR reutilizam a politica |
| paginas e paginas/[id] | visivel; PAGES_WRITE para demais | painel e pagina institucional |
| eventos e eventos/[id] | PUBLICADO; EVENTS_WRITE para demais | painel, home, lista/detalhe |
| banners e banners/[id] | ativo; BANNERS_WRITE para demais | painel e carrossel |
| documentos | ATIVO; DOCS_WRITE para demais | painel, lista e busca |
| documentos/[id]/download | ATIVO ou DOCS_WRITE | links de download |
| uploads/[...path] | confinamento, assinatura e vinculo publico ou permissao do modulo | imagens, editor, player e links antigos |
| secretaria e secretaria/[id] | ativo ou PAGES_WRITE | secretaria publica/painel |
| videos | dataPublicacao permitida ou VIDEOS_WRITE | galeria publica/painel |
| midia e albuns-foto | publico; modelos nao possuem status/visibilidade | galerias e painel |
| config | configuracao publica; apenas CONFIG_WRITE ve avisos inativos | ConfigForm e site |
| banners/settings | apenas configuracao de intervalo, nao conteudo reservado | carrossel/painel |
| search | filtros publicos independem de sessao | busca publica |
| usuarios, contatos, logs/errors | guard existente exige permissao | somente administracao |
| auth/session, ping, permissions-state | contrato NextAuth/estado da propria sessao | vigilancia de sessao |

Foi encontrado tambem risco de protocolo perigoso em links configurados fora de HTML rico. A exibicao de menus, rodape, banners, acessos e videos passou a usar allowlist de protocolos. Nao foi criada rota nova nem status inexistente no banco.

## Referencias primarias consultadas

- [NextAuth: correcoes 4.24.15](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279).
- [Next: SVG/Image Optimization e mitigacao sharp >= 0.35.5](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- [sanitize-html: uso no servidor e allowlist](https://github.com/apostrophecms/sanitize-html).

Nao se afirma exploracao remota comprovada de todos os advisories. A ausencia de next/image nao significa, isoladamente, que o endpoint de otimizacao esteja desabilitado. O risco residual sera descrito depois da auditoria final.
