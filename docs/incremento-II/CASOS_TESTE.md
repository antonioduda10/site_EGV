# Casos de teste executados

Tabela gerada dos relatorios reais do Vitest e Playwright. Cada linha representa um caso; testes de responsividade percorrem varias rotas dentro do mesmo caso.

| CASO DE TESTE | FUNCIONALIDADE | RESULTADO ESPERADO | RESULTADO OBTIDO | SITUACAO |
| --- | --- | --- | --- | --- |
| T-001 | documentos.test.ts | DOC-01 upload sem sessao retorna 403 | Assercoes cumpridas | Aprovado |
| T-002 | documentos.test.ts | DOC-01 editar sem sessao retorna 403 | Assercoes cumpridas | Aprovado |
| T-003 | documentos.test.ts | DOC-01 excluir sem sessao retorna 403 | Assercoes cumpridas | Aprovado |
| T-004 | documentos.test.ts | DOC-02 upload sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-005 | documentos.test.ts | DOC-02 editar sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-006 | documentos.test.ts | DOC-02 excluir sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-007 | documentos.test.ts | DOC-03 consulta publica ordenada retorna JSON | Assercoes cumpridas | Aprovado |
| T-008 | documentos.test.ts | DOC-04 upload valido cria primeira versao e auditoria | Assercoes cumpridas | Aprovado |
| T-009 | documentos.test.ts | DOC-05 novo upload incrementa versao anterior | Assercoes cumpridas | Aprovado |
| T-010 | documentos.test.ts | DOC-06 arquivo obrigatorio retorna 400 | Assercoes cumpridas | Aprovado |
| T-011 | documentos.test.ts | DOC-07 tipo proibido retorna 400 sem upload | Assercoes cumpridas | Aprovado |
| T-012 | documentos.test.ts | DOC-08 arquivo maior que 10 MB retorna 400 | Assercoes cumpridas | Aprovado |
| T-013 | documentos.test.ts | DOC-09 falha no upload retorna 500 sem criar registro | Assercoes cumpridas | Aprovado |
| T-014 | documentos.test.ts | DOC-10 atualiza metadados, status e ordem | Assercoes cumpridas | Aprovado |
| T-015 | documentos.test.ts | DOC-11 edicao ausente retorna 404 | Assercoes cumpridas | Aprovado |
| T-016 | documentos.test.ts | DOC-12 edicao invalida retorna 400 sem gravar | Assercoes cumpridas | Aprovado |
| T-017 | documentos.test.ts | DOC-13 status invalido retorna 400 | Assercoes cumpridas | Aprovado |
| T-018 | documentos.test.ts | DOC-14 exclui arquivo simulado e registro | Assercoes cumpridas | Aprovado |
| T-019 | documentos.test.ts | DOC-15 exclusao ausente retorna 404 sem remover arquivo | Assercoes cumpridas | Aprovado |
| T-020 | documentos.test.ts | DOC-16 conteudo textual no campo arquivo retorna 400 | Assercoes cumpridas | Aprovado |
| T-021 | login.test.ts | LOGIN-01 dados invalidos retornam 400 | Assercoes cumpridas | Aprovado |
| T-022 | login.test.ts | LOGIN-02 usuario inexistente retorna 401 | Assercoes cumpridas | Aprovado |
| T-023 | login.test.ts | LOGIN-03 senha incorreta retorna 401 | Assercoes cumpridas | Aprovado |
| T-024 | login.test.ts | LOGIN-04 usuario inativo retorna 401 | Assercoes cumpridas | Aprovado |
| T-025 | login.test.ts | LOGIN-05 sucesso retorna apenas identificador e ok | Assercoes cumpridas | Aprovado |
| T-026 | noticias.test.ts | NEWS-01 criar sem sessao retorna 403 sem gravacao | Assercoes cumpridas | Aprovado |
| T-027 | noticias.test.ts | NEWS-01 editar sem sessao retorna 403 sem gravacao | Assercoes cumpridas | Aprovado |
| T-028 | noticias.test.ts | NEWS-01 excluir sem sessao retorna 403 sem gravacao | Assercoes cumpridas | Aprovado |
| T-029 | noticias.test.ts | NEWS-01 aprovar sem sessao retorna 403 sem gravacao | Assercoes cumpridas | Aprovado |
| T-030 | noticias.test.ts | NEWS-01 rejeitar sem sessao retorna 403 sem gravacao | Assercoes cumpridas | Aprovado |
| T-031 | noticias.test.ts | NEWS-01 enviar sem sessao retorna 403 sem gravacao | Assercoes cumpridas | Aprovado |
| T-032 | noticias.test.ts | NEWS-02 criar sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-033 | noticias.test.ts | NEWS-02 editar sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-034 | noticias.test.ts | NEWS-02 excluir sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-035 | noticias.test.ts | NEWS-02 aprovar sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-036 | noticias.test.ts | NEWS-02 rejeitar sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-037 | noticias.test.ts | NEWS-02 enviar sem permissao retorna 403 | Assercoes cumpridas | Aprovado |
| T-038 | noticias.test.ts | NEWS-03 cria rascunho, gera slug e registra autoria/auditoria | Assercoes cumpridas | Aprovado |
| T-039 | noticias.test.ts | NEWS-04 payload invalido retorna 400 sem gravar | Assercoes cumpridas | Aprovado |
| T-040 | noticias.test.ts | NEWS-05 JSON malformado retorna 400 | Assercoes cumpridas | Aprovado |
| T-041 | noticias.test.ts | NEWS-06 falha de persistencia retorna 500 sem vazar detalhes | Assercoes cumpridas | Aprovado |
| T-042 | noticias.test.ts | NEWS-07 consulta publica preserva ordenacao e publicacao agendada | Assercoes cumpridas | Aprovado |
| T-043 | noticias.test.ts | NEWS-08 detalhe existente retorna JSON | Assercoes cumpridas | Aprovado |
| T-044 | noticias.test.ts | NEWS-09 detalhe ausente retorna 404 | Assercoes cumpridas | Aprovado |
| T-045 | noticias.test.ts | NEWS-10 atualiza campos e preserva capa/publicacao ausentes | Assercoes cumpridas | Aprovado |
| T-046 | noticias.test.ts | NEWS-11 edicao invalida retorna 400 | Assercoes cumpridas | Aprovado |
| T-047 | noticias.test.ts | NEWS-12 impede publicar diretamente pela edicao | Assercoes cumpridas | Aprovado |
| T-048 | noticias.test.ts | NEWS-13 exclui registro e registra auditoria | Assercoes cumpridas | Aprovado |
| T-049 | noticias.test.ts | NEWS-14 aprova publicacao imediata | Assercoes cumpridas | Aprovado |
| T-050 | noticias.test.ts | NEWS-15 aprova publicacao futura como agendada | Assercoes cumpridas | Aprovado |
| T-051 | noticias.test.ts | NEWS-16 aprovar noticia ausente retorna 404 | Assercoes cumpridas | Aprovado |
| T-052 | noticias.test.ts | NEWS-17 envia para aprovacao | Assercoes cumpridas | Aprovado |
| T-053 | noticias.test.ts | NEWS-18 rejeita com motivo e registra auditoria | Assercoes cumpridas | Aprovado |
| T-054 | noticias.test.ts | NEWS-19 normaliza HTML, capa e tamanho sem alterar payload | Assercoes cumpridas | Aprovado |
| T-055 | uploads.test.ts | UPLOAD-01 serve bytes simulados com tipo e cache | Assercoes cumpridas | Aprovado |
| T-056 | uploads.test.ts | UPLOAD-02 arquivo ausente retorna 404 | Assercoes cumpridas | Aprovado |
| T-057 | uploads.test.ts | UPLOAD-03 impede caminho fora da raiz ("..") | Assercoes cumpridas | Aprovado |
| T-058 | uploads.test.ts | UPLOAD-03 impede caminho fora da raiz ("..") | Assercoes cumpridas | Aprovado |
| T-059 | api-errors.test.ts | ERROR-01 traduz Prisma P2025 para HTTP 404 | Assercoes cumpridas | Aprovado |
| T-060 | api-errors.test.ts | ERROR-01 traduz Prisma P2002 para HTTP 409 | Assercoes cumpridas | Aprovado |
| T-061 | api-errors.test.ts | ERROR-01 traduz Prisma P1001 para HTTP 500 | Assercoes cumpridas | Aprovado |
| T-062 | api-errors.test.ts | ERROR-02 erro de log nao impede resposta HTTP | Assercoes cumpridas | Aprovado |
| T-063 | auth.test.ts | AUTH-01 rejeita campos ausentes (undefined) | Assercoes cumpridas | Aprovado |
| T-064 | auth.test.ts | AUTH-01 rejeita campos ausentes ({}) | Assercoes cumpridas | Aprovado |
| T-065 | auth.test.ts | AUTH-01 rejeita campos ausentes ({"email":"teste@example.invalid"}) | Assercoes cumpridas | Aprovado |
| T-066 | auth.test.ts | AUTH-01 rejeita campos ausentes ({"password":"ficticia"}) | Assercoes cumpridas | Aprovado |
| T-067 | auth.test.ts | AUTH-02 rejeita usuario inexistente | Assercoes cumpridas | Aprovado |
| T-068 | auth.test.ts | AUTH-03 rejeita senha incorreta sem registrar presenca | Assercoes cumpridas | Aprovado |
| T-069 | auth.test.ts | AUTH-04 autentica usuario valido sem expor hash | Assercoes cumpridas | Aprovado |
| T-070 | auth.test.ts | AUTH-05 bloqueia usuario inativo | Assercoes cumpridas | Aprovado |
| T-071 | auth.test.ts | AUTH-06 falha no rastreio de presenca nao bloqueia login valido | Assercoes cumpridas | Aprovado |
| T-072 | auth.test.ts | AUTH-07 conserva fallback de versao para banco antigo | Assercoes cumpridas | Aprovado |
| T-073 | auth.test.ts | AUTH-08 atualiza perfis e permissoes a partir do banco | Assercoes cumpridas | Aprovado |
| T-074 | auth.test.ts | AUTH-09 usuario removido invalida token | Assercoes cumpridas | Aprovado |
| T-075 | auth.test.ts | AUTH-10 alteracao de versao encerra sessao | Assercoes cumpridas | Aprovado |
| T-076 | auth.test.ts | AUTH-11 inativacao encerra sessao existente | Assercoes cumpridas | Aprovado |
| T-077 | auth.test.ts | AUTH-12 token anonimo nao consulta banco | Assercoes cumpridas | Aprovado |
| T-078 | auth.test.ts | AUTH-13 sessao transporta somente dados publicos do token | Assercoes cumpridas | Aprovado |
| T-079 | auth.test.ts | AUTH-14 sessao invalidada remove id | Assercoes cumpridas | Aprovado |
| T-080 | auth.test.ts | AUTH-15 expira apos 30 minutos sem atividade | Assercoes cumpridas | Aprovado |
| T-081 | auth.test.ts | AUTH-16 consulta automatica nao renova o prazo de inatividade | Assercoes cumpridas | Aprovado |
| T-082 | auth.test.ts | AUTH-17 atividade renova com horario do servidor e preserva RBAC | Assercoes cumpridas | Aprovado |
| T-083 | auth.test.ts | AUTH-18 sessao expirada nao pode ser reativada por update | Assercoes cumpridas | Aprovado |
| T-084 | auth.test.ts | AUTH-19 cookie anterior a revisao continua valido | Assercoes cumpridas | Aprovado |
| T-085 | auth.test.ts | AUTH-20 conserva acesso antes de completar o limite | Assercoes cumpridas | Aprovado |
| T-086 | auth.test.ts | AUTH-21 update nao reativa token revogado | Assercoes cumpridas | Aprovado |
| T-087 | guards.test.ts | GUARD-11 informa expiracao por inatividade | Assercoes cumpridas | Aprovado |
| T-088 | guards.test.ts | GUARD-01 redireciona para login sem sessao | Assercoes cumpridas | Aprovado |
| T-089 | guards.test.ts | GUARD-02 rejeita sessao invalidada | Assercoes cumpridas | Aprovado |
| T-090 | guards.test.ts | GUARD-03 rejeita sessao sem identificador | Assercoes cumpridas | Aprovado |
| T-091 | guards.test.ts | GUARD-04 conserva sessao valida | Assercoes cumpridas | Aprovado |
| T-092 | guards.test.ts | GUARD-05 sem sessao nao autoriza | Assercoes cumpridas | Aprovado |
| T-093 | guards.test.ts | GUARD-06 sessao invalidada nao autoriza | Assercoes cumpridas | Aprovado |
| T-094 | guards.test.ts | GUARD-07 sessao sem id nao autoriza | Assercoes cumpridas | Aprovado |
| T-095 | guards.test.ts | GUARD-08 autoriza permissao herdada | Assercoes cumpridas | Aprovado |
| T-096 | guards.test.ts | GUARD-09 nega perfil sem permissao | Assercoes cumpridas | Aprovado |
| T-097 | guards.test.ts | GUARD-10 respeita restricao manual | Assercoes cumpridas | Aprovado |
| T-098 | password.test.ts | PASSWORD-01 gera hash verificavel sem armazenar texto puro | Assercoes cumpridas | Aprovado |
| T-099 | password.test.ts | PASSWORD-02 usa salts distintos | Assercoes cumpridas | Aprovado |
| T-100 | rbac.test.ts | RBAC-01 Admin herda todas as permissoes | Assercoes cumpridas | Aprovado |
| T-101 | rbac.test.ts | RBAC-02 Comunicacao pode criar noticias | Assercoes cumpridas | Aprovado |
| T-102 | rbac.test.ts | RBAC-03 Docente nao pode administrar usuarios | Assercoes cumpridas | Aprovado |
| T-103 | rbac.test.ts | RBAC-04 combina permissoes herdadas de varios perfis | Assercoes cumpridas | Aprovado |
| T-104 | rbac.test.ts | RBAC-05 permissoes manuais prevalecem sobre Admin | Assercoes cumpridas | Aprovado |
| T-105 | rbac.test.ts | RBAC-06 permissao manual autoriza sem perfil | Assercoes cumpridas | Aprovado |
| T-106 | rbac.test.ts | RBAC-07 lista manual vazia conserva heranca | Assercoes cumpridas | Aprovado |
| T-107 | rbac.test.ts | RBAC-08 superAdmin conserva acesso | Assercoes cumpridas | Aprovado |
| T-108 | rbac.test.ts | RBAC-09 sem perfil ou permissao nega acesso | Assercoes cumpridas | Aprovado |
| T-109 | rbac.test.ts | RBAC-10 sentinela manual nega acessos herdados | Assercoes cumpridas | Aprovado |
| T-110 | rbac.test.ts | RBAC-11 identifica perfil sem ampliar autorizacao | Assercoes cumpridas | Aprovado |
| T-111 | Navegador / PostgreSQL isolado | PUBLIC-375 paginas publicas sem overflow e com conteudo | Assercoes cumpridas | Aprovado |
| T-112 | Navegador / PostgreSQL isolado | ADMIN-375 listagens e formularios sem overflow | Assercoes cumpridas | Aprovado |
| T-113 | Navegador / PostgreSQL isolado | PUBLIC-768 paginas publicas sem overflow e com conteudo | Assercoes cumpridas | Aprovado |
| T-114 | Navegador / PostgreSQL isolado | ADMIN-768 listagens e formularios sem overflow | Assercoes cumpridas | Aprovado |
| T-115 | Navegador / PostgreSQL isolado | PUBLIC-1366 paginas publicas sem overflow e com conteudo | Assercoes cumpridas | Aprovado |
| T-116 | Navegador / PostgreSQL isolado | ADMIN-1366 listagens e formularios sem overflow | Assercoes cumpridas | Aprovado |
| T-117 | Navegador / PostgreSQL isolado | FLOW-01 painel exige login e API protegida nega acesso | Assercoes cumpridas | Aprovado |
| T-118 | Navegador / PostgreSQL isolado | FLOW-02 menu publico mobile fecha apos navegar | Assercoes cumpridas | Aprovado |
| T-119 | Navegador / PostgreSQL isolado | FLOW-03 tema persiste apos reload e Tab revela skip link | Assercoes cumpridas | Aprovado |
| T-120 | Navegador / PostgreSQL isolado | FLOW-04 menu administrativo mobile e sidebar fixa | Assercoes cumpridas | Aprovado |
| T-121 | Navegador / PostgreSQL isolado | FLOW-05 paginas legais, slug, download e conteudo dinamico | Assercoes cumpridas | Aprovado |
| T-122 | Navegador / PostgreSQL isolado | CRUD-01 noticias com PostgreSQL isolado e fluxo de aprovacao | Assercoes cumpridas | Aprovado |
| T-123 | Navegador / PostgreSQL isolado | CRUD-02 documentos com upload e exclusao apenas em diretorio temporario | Assercoes cumpridas | Aprovado |
| T-124 | Navegador / PostgreSQL isolado | FLOW-06 login informa erros e campos invalidos | Assercoes cumpridas | Aprovado |
| T-125 | Navegador / PostgreSQL isolado | FLOW-07 carrossel automatico sem botao de pausa e imagens de upload | Assercoes cumpridas | Aprovado |
| T-126 | Navegador / PostgreSQL isolado | FLOW-08 configuracao altera texto dinamico sem novo build | Assercoes cumpridas | Aprovado |
| T-127 | Navegador / PostgreSQL isolado | A11Y-01 WCAG A/AA nas telas publicas e formulario administrativo | Assercoes cumpridas | Aprovado |
| T-128 | Navegador / PostgreSQL isolado | SESSION-01 conserva login entre painel e paginas publicas e permite sair | Assercoes cumpridas | Aprovado |
| T-129 | Navegador / PostgreSQL isolado | SESSION-02 servidor bloqueia sessao com 30 minutos de inatividade | Assercoes cumpridas | Aprovado |
| T-130 | Navegador / PostgreSQL isolado | SESSION-03 usuario autorizado pode encerrar outra sessao | Assercoes cumpridas | Aprovado |
| T-131 | Navegador / PostgreSQL isolado | SESSION-04 interacao renova atividade mas consultas de sessao nao renovam | Assercoes cumpridas | Aprovado |
| T-132 | Navegador / PostgreSQL isolado | NAV-01 links do rodape azuis com destaque ao passar o mouse | Assercoes cumpridas | Aprovado |
| T-133 | Navegador / PostgreSQL isolado | NAV-02 icones sociais com cores caracteristicas e links preservados | Assercoes cumpridas | Aprovado |
