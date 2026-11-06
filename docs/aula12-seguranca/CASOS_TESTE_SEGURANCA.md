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
| T-055 | security-files.test.ts | SEC-FILE-01 visitante nao baixa documento inativo por ID | Assercoes cumpridas | Aprovado |
| T-056 | security-files.test.ts | SEC-FILE-02 URL bruta nao contorna status INATIVO | Assercoes cumpridas | Aprovado |
| T-057 | security-files.test.ts | SEC-FILE-03 permissao de outro modulo nao permite baixar documento inativo | Assercoes cumpridas | Aprovado |
| T-058 | security-files.test.ts | SEC-FILE-04 administrador autorizado conserva download e URL bruta | Assercoes cumpridas | Aprovado |
| T-059 | security-files.test.ts | SEC-FILE-05 documento ativo continua publico com nosniff e sem cache compartilhado | Assercoes cumpridas | Aprovado |
| T-060 | security-files.test.ts | SEC-FILE-06 caminho externo vindo do banco nao e lido (0) | Assercoes cumpridas | Aprovado |
| T-061 | security-files.test.ts | SEC-FILE-06 caminho externo vindo do banco nao e lido (1) | Assercoes cumpridas | Aprovado |
| T-062 | security-files.test.ts | SEC-FILE-07 imagem nao publicada nao vaza por URL bruta | Assercoes cumpridas | Aprovado |
| T-063 | security-public-access.test.ts | SEC-PUB-01 noticias publicas exigem PUBLICADO e data permitida | Assercoes cumpridas | Aprovado |
| T-064 | security-public-access.test.ts | SEC-PUB-02 visitante recebe apenas conteudo publico (paginas) | Assercoes cumpridas | Aprovado |
| T-065 | security-public-access.test.ts | SEC-PUB-02 visitante recebe apenas conteudo publico (eventos) | Assercoes cumpridas | Aprovado |
| T-066 | security-public-access.test.ts | SEC-PUB-02 visitante recebe apenas conteudo publico (banners) | Assercoes cumpridas | Aprovado |
| T-067 | security-public-access.test.ts | SEC-PUB-02 visitante recebe apenas conteudo publico (documentos) | Assercoes cumpridas | Aprovado |
| T-068 | security-public-access.test.ts | SEC-PUB-03 ID restrito nao e publico (rascunho) | Assercoes cumpridas | Aprovado |
| T-069 | security-public-access.test.ts | SEC-PUB-03 ID restrito nao e publico (agendado) | Assercoes cumpridas | Aprovado |
| T-070 | security-public-access.test.ts | SEC-PUB-03 ID restrito nao e publico (pagina invisivel) | Assercoes cumpridas | Aprovado |
| T-071 | security-public-access.test.ts | SEC-PUB-03 ID restrito nao e publico (evento rascunho) | Assercoes cumpridas | Aprovado |
| T-072 | security-public-access.test.ts | SEC-PUB-03 ID restrito nao e publico (banner inativo) | Assercoes cumpridas | Aprovado |
| T-073 | security-public-access.test.ts | SEC-PUB-03 ID restrito nao e publico (servidor inativo) | Assercoes cumpridas | Aprovado |
| T-074 | security-public-access.test.ts | SEC-PUB-04 administrador autorizado mantem acesso (rascunho) | Assercoes cumpridas | Aprovado |
| T-075 | security-public-access.test.ts | SEC-PUB-04 administrador autorizado mantem acesso (agendado) | Assercoes cumpridas | Aprovado |
| T-076 | security-public-access.test.ts | SEC-PUB-04 administrador autorizado mantem acesso (pagina invisivel) | Assercoes cumpridas | Aprovado |
| T-077 | security-public-access.test.ts | SEC-PUB-04 administrador autorizado mantem acesso (evento rascunho) | Assercoes cumpridas | Aprovado |
| T-078 | security-public-access.test.ts | SEC-PUB-04 administrador autorizado mantem acesso (banner inativo) | Assercoes cumpridas | Aprovado |
| T-079 | security-public-access.test.ts | SEC-PUB-04 administrador autorizado mantem acesso (servidor inativo) | Assercoes cumpridas | Aprovado |
| T-080 | security-public-access.test.ts | SEC-PUB-05 sessao sem permissao do modulo nao abre pagina invisivel | Assercoes cumpridas | Aprovado |
| T-081 | security-public-access.test.ts | SEC-PUB-06 PUBLICADO permanece acessivel e HTML antigo e sanitizado | Assercoes cumpridas | Aprovado |
| T-082 | security-public-access.test.ts | SEC-PUB-07 sessao invalidada nao concede acesso mesmo com roles residuais | Assercoes cumpridas | Aprovado |
| T-083 | security-reset.test.ts | SEC-RESET-01 senha curta e rejeitada antes de consultar segredo | Assercoes cumpridas | Aprovado |
| T-084 | security-reset.test.ts | SEC-RESET-02 senha forte, consumo unico e revogacao de sessoes | Assercoes cumpridas | Aprovado |
| T-085 | security-reset.test.ts | SEC-RESET-03 identificador inutilizavel nao altera senha (ausente) | Assercoes cumpridas | Aprovado |
| T-086 | security-reset.test.ts | SEC-RESET-03 identificador inutilizavel nao altera senha (expirado) | Assercoes cumpridas | Aprovado |
| T-087 | security-reset.test.ts | SEC-RESET-03 identificador inutilizavel nao altera senha (concorrente) | Assercoes cumpridas | Aprovado |
| T-088 | security-reset.test.ts | SEC-RESET-04 recuperacao responde igualmente para conta existente ou ausente | Assercoes cumpridas | Aprovado |
| T-089 | security-users.test.ts | SEC-USER-01 listagem nunca serializa credencial, versao ou reset | Assercoes cumpridas | Aprovado |
| T-090 | security-users.test.ts | SEC-USER-02 criacao nao retorna hash e conserva autorizacao | Assercoes cumpridas | Aprovado |
| T-091 | security-users.test.ts | SEC-USER-03 atualizacao nao retorna hash | Assercoes cumpridas | Aprovado |
| T-092 | security-users.test.ts | SEC-USER-04 senha curta rejeitada no servidor (create) | Assercoes cumpridas | Aprovado |
| T-093 | security-users.test.ts | SEC-USER-04 senha curta rejeitada no servidor (update) | Assercoes cumpridas | Aprovado |
| T-094 | security-users.test.ts | SEC-USER-05 trocar senha revoga versao de sessoes sem retornar estado interno | Assercoes cumpridas | Aprovado |
| T-095 | security-users.test.ts | SEC-USER-06 leitura/escrita sem autorizacao retorna 403 (0) | Assercoes cumpridas | Aprovado |
| T-096 | security-users.test.ts | SEC-USER-06 leitura/escrita sem autorizacao retorna 403 (1) | Assercoes cumpridas | Aprovado |
| T-097 | security-users.test.ts | SEC-USER-06 leitura/escrita sem autorizacao retorna 403 (2) | Assercoes cumpridas | Aprovado |
| T-098 | uploads.test.ts | UPLOAD-01 serve bytes simulados com tipo e cache | Assercoes cumpridas | Aprovado |
| T-099 | uploads.test.ts | UPLOAD-02 arquivo ausente retorna 404 | Assercoes cumpridas | Aprovado |
| T-100 | uploads.test.ts | UPLOAD-03 impede caminho fora da raiz ("..") | Assercoes cumpridas | Aprovado |
| T-101 | uploads.test.ts | UPLOAD-03 impede caminho fora da raiz ("..") | Assercoes cumpridas | Aprovado |
| T-102 | api-errors.test.ts | ERROR-01 traduz Prisma P2025 para HTTP 404 | Assercoes cumpridas | Aprovado |
| T-103 | api-errors.test.ts | ERROR-01 traduz Prisma P2002 para HTTP 409 | Assercoes cumpridas | Aprovado |
| T-104 | api-errors.test.ts | ERROR-01 traduz Prisma P1001 para HTTP 500 | Assercoes cumpridas | Aprovado |
| T-105 | api-errors.test.ts | ERROR-02 erro de log nao impede resposta HTTP | Assercoes cumpridas | Aprovado |
| T-106 | auth.test.ts | AUTH-01 rejeita campos ausentes (undefined) | Assercoes cumpridas | Aprovado |
| T-107 | auth.test.ts | AUTH-01 rejeita campos ausentes ({}) | Assercoes cumpridas | Aprovado |
| T-108 | auth.test.ts | AUTH-01 rejeita campos ausentes ({"email":"teste@example.invalid"}) | Assercoes cumpridas | Aprovado |
| T-109 | auth.test.ts | AUTH-01 rejeita campos ausentes ({"password":"ficticia"}) | Assercoes cumpridas | Aprovado |
| T-110 | auth.test.ts | AUTH-02 rejeita usuario inexistente | Assercoes cumpridas | Aprovado |
| T-111 | auth.test.ts | AUTH-03 rejeita senha incorreta sem registrar presenca | Assercoes cumpridas | Aprovado |
| T-112 | auth.test.ts | AUTH-04 autentica usuario valido sem expor hash | Assercoes cumpridas | Aprovado |
| T-113 | auth.test.ts | AUTH-05 bloqueia usuario inativo | Assercoes cumpridas | Aprovado |
| T-114 | auth.test.ts | AUTH-06 falha no rastreio de presenca nao bloqueia login valido | Assercoes cumpridas | Aprovado |
| T-115 | auth.test.ts | AUTH-07 conserva fallback de versao para banco antigo | Assercoes cumpridas | Aprovado |
| T-116 | auth.test.ts | AUTH-08 atualiza perfis e permissoes a partir do banco | Assercoes cumpridas | Aprovado |
| T-117 | auth.test.ts | AUTH-09 usuario removido invalida token | Assercoes cumpridas | Aprovado |
| T-118 | auth.test.ts | AUTH-10 alteracao de versao encerra sessao | Assercoes cumpridas | Aprovado |
| T-119 | auth.test.ts | AUTH-11 inativacao encerra sessao existente | Assercoes cumpridas | Aprovado |
| T-120 | auth.test.ts | AUTH-12 token anonimo nao consulta banco | Assercoes cumpridas | Aprovado |
| T-121 | auth.test.ts | AUTH-13 sessao transporta somente dados publicos do token | Assercoes cumpridas | Aprovado |
| T-122 | auth.test.ts | AUTH-14 sessao invalidada remove id | Assercoes cumpridas | Aprovado |
| T-123 | auth.test.ts | AUTH-15 expira apos 30 minutos sem atividade | Assercoes cumpridas | Aprovado |
| T-124 | auth.test.ts | AUTH-16 consulta automatica nao renova o prazo de inatividade | Assercoes cumpridas | Aprovado |
| T-125 | auth.test.ts | AUTH-17 atividade renova com horario do servidor e preserva RBAC | Assercoes cumpridas | Aprovado |
| T-126 | auth.test.ts | AUTH-18 sessao expirada nao pode ser reativada por update | Assercoes cumpridas | Aprovado |
| T-127 | auth.test.ts | AUTH-19 cookie anterior a revisao continua valido | Assercoes cumpridas | Aprovado |
| T-128 | auth.test.ts | AUTH-20 conserva acesso antes de completar o limite | Assercoes cumpridas | Aprovado |
| T-129 | auth.test.ts | AUTH-21 update nao reativa token revogado | Assercoes cumpridas | Aprovado |
| T-130 | guards.test.ts | GUARD-11 informa expiracao por inatividade | Assercoes cumpridas | Aprovado |
| T-131 | guards.test.ts | GUARD-01 redireciona para login sem sessao | Assercoes cumpridas | Aprovado |
| T-132 | guards.test.ts | GUARD-02 rejeita sessao invalidada | Assercoes cumpridas | Aprovado |
| T-133 | guards.test.ts | GUARD-03 rejeita sessao sem identificador | Assercoes cumpridas | Aprovado |
| T-134 | guards.test.ts | GUARD-04 conserva sessao valida | Assercoes cumpridas | Aprovado |
| T-135 | guards.test.ts | GUARD-05 sem sessao nao autoriza | Assercoes cumpridas | Aprovado |
| T-136 | guards.test.ts | GUARD-06 sessao invalidada nao autoriza | Assercoes cumpridas | Aprovado |
| T-137 | guards.test.ts | GUARD-07 sessao sem id nao autoriza | Assercoes cumpridas | Aprovado |
| T-138 | guards.test.ts | GUARD-08 autoriza permissao herdada | Assercoes cumpridas | Aprovado |
| T-139 | guards.test.ts | GUARD-09 nega perfil sem permissao | Assercoes cumpridas | Aprovado |
| T-140 | guards.test.ts | GUARD-10 respeita restricao manual | Assercoes cumpridas | Aprovado |
| T-141 | password.test.ts | PASSWORD-01 gera hash verificavel sem armazenar texto puro | Assercoes cumpridas | Aprovado |
| T-142 | password.test.ts | PASSWORD-02 usa salts distintos | Assercoes cumpridas | Aprovado |
| T-143 | rbac.test.ts | RBAC-01 Admin herda todas as permissoes | Assercoes cumpridas | Aprovado |
| T-144 | rbac.test.ts | RBAC-02 Comunicacao pode criar noticias | Assercoes cumpridas | Aprovado |
| T-145 | rbac.test.ts | RBAC-03 Docente nao pode administrar usuarios | Assercoes cumpridas | Aprovado |
| T-146 | rbac.test.ts | RBAC-04 combina permissoes herdadas de varios perfis | Assercoes cumpridas | Aprovado |
| T-147 | rbac.test.ts | RBAC-05 permissoes manuais prevalecem sobre Admin | Assercoes cumpridas | Aprovado |
| T-148 | rbac.test.ts | RBAC-06 permissao manual autoriza sem perfil | Assercoes cumpridas | Aprovado |
| T-149 | rbac.test.ts | RBAC-07 lista manual vazia conserva heranca | Assercoes cumpridas | Aprovado |
| T-150 | rbac.test.ts | RBAC-08 superAdmin conserva acesso | Assercoes cumpridas | Aprovado |
| T-151 | rbac.test.ts | RBAC-09 sem perfil ou permissao nega acesso | Assercoes cumpridas | Aprovado |
| T-152 | rbac.test.ts | RBAC-10 sentinela manual nega acessos herdados | Assercoes cumpridas | Aprovado |
| T-153 | rbac.test.ts | RBAC-11 identifica perfil sem ampliar autorizacao | Assercoes cumpridas | Aprovado |
| T-154 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso javascript:alert(1) | Assercoes cumpridas | Aprovado |
| T-155 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso JaVaScRiPt:alert(1) | Assercoes cumpridas | Aprovado |
| T-156 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso data:text/html,test | Assercoes cumpridas | Aprovado |
| T-157 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso vbscript:test | Assercoes cumpridas | Aprovado |
| T-158 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso //example.invalid | Assercoes cumpridas | Aprovado |
| T-159 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso /\evil.invalid | Assercoes cumpridas | Aprovado |
| T-160 | security-links.test.ts | SEC-LINK bloqueia protocolo perigoso java script:test | Assercoes cumpridas | Aprovado |
| T-161 | security-links.test.ts | SEC-LINK preserva link legitimo /noticias | Assercoes cumpridas | Aprovado |
| T-162 | security-links.test.ts | SEC-LINK preserva link legitimo https://example.invalid | Assercoes cumpridas | Aprovado |
| T-163 | security-links.test.ts | SEC-LINK preserva link legitimo http://example.invalid/p | Assercoes cumpridas | Aprovado |
| T-164 | security-links.test.ts | SEC-LINK preserva link legitimo mailto:teste@example.invalid | Assercoes cumpridas | Aprovado |
| T-165 | security-links.test.ts | SEC-LINK preserva link legitimo tel:+00000 | Assercoes cumpridas | Aprovado |
| T-166 | security-links.test.ts | SEC-LINK preserva link legitimo #formulario | Assercoes cumpridas | Aprovado |
| T-167 | security-links.test.ts | SEC-LINK preserva link legitimo ?pagina=2 | Assercoes cumpridas | Aprovado |
| T-168 | security-links.test.ts | SEC-LINK preserva link legitimo noticias | Assercoes cumpridas | Aprovado |
| T-169 | security-links.test.ts | SEC-LINK aceita fallback somente para ausencia de URL | Assercoes cumpridas | Aprovado |
| T-170 | security-package-logs.test.ts | exclui .env | Assercoes cumpridas | Aprovado |
| T-171 | security-package-logs.test.ts | exclui .env.local | Assercoes cumpridas | Aprovado |
| T-172 | security-package-logs.test.ts | exclui .env.production | Assercoes cumpridas | Aprovado |
| T-173 | security-package-logs.test.ts | exclui node_modules/a.js | Assercoes cumpridas | Aprovado |
| T-174 | security-package-logs.test.ts | exclui .next-build/a.js | Assercoes cumpridas | Aprovado |
| T-175 | security-package-logs.test.ts | exclui coverage/a.json | Assercoes cumpridas | Aprovado |
| T-176 | security-package-logs.test.ts | exclui uploads/foto.png | Assercoes cumpridas | Aprovado |
| T-177 | security-package-logs.test.ts | exclui logs/error.txt | Assercoes cumpridas | Aprovado |
| T-178 | security-package-logs.test.ts | exclui app/private.key | Assercoes cumpridas | Aprovado |
| T-179 | security-package-logs.test.ts | exclui tests/storage-state.json | Assercoes cumpridas | Aprovado |
| T-180 | security-package-logs.test.ts | exclui tests/cookies.json | Assercoes cumpridas | Aprovado |
| T-181 | security-package-logs.test.ts | exclui prisma/seed.ts | Assercoes cumpridas | Aprovado |
| T-182 | security-package-logs.test.ts | exclui prisma/migrations/a.sql | Assercoes cumpridas | Aprovado |
| T-183 | security-package-logs.test.ts | exclui ../fora.ts | Assercoes cumpridas | Aprovado |
| T-184 | security-package-logs.test.ts | exclui C:\fora.ts | Assercoes cumpridas | Aprovado |
| T-185 | security-package-logs.test.ts | exclui docs/aula12-seguranca/evidencias/linha-base/testes.txt | Assercoes cumpridas | Aprovado |
| T-186 | security-package-logs.test.ts | inclui .env.example | Assercoes cumpridas | Aprovado |
| T-187 | security-package-logs.test.ts | inclui README.md | Assercoes cumpridas | Aprovado |
| T-188 | security-package-logs.test.ts | inclui app/page.tsx | Assercoes cumpridas | Aprovado |
| T-189 | security-package-logs.test.ts | inclui prisma/schema.prisma | Assercoes cumpridas | Aprovado |
| T-190 | security-package-logs.test.ts | inclui docs/aula12-seguranca/RELATORIO_SEGURANCA.md | Assercoes cumpridas | Aprovado |
| T-191 | security-package-logs.test.ts | inclui docs/aula12-seguranca/evidencias/01.png | Assercoes cumpridas | Aprovado |
| T-192 | security-package-logs.test.ts | ZIP real contem codigo e placeholder, nao segredos nem dependencias | Assercoes cumpridas | Aprovado |
| T-193 | security-package-logs.test.ts | remove campos sensiveis e preserva informacao operacional | Assercoes cumpridas | Aprovado |
| T-194 | security-package-logs.test.ts | retira conexoes e parametros de tokens dos logs | Assercoes cumpridas | Aprovado |
| T-195 | security-passwords.test.ts | SEC-PASS-01 rejeita comprimento fora da politica (0) | Assercoes cumpridas | Aprovado |
| T-196 | security-passwords.test.ts | SEC-PASS-01 rejeita comprimento fora da politica (6) | Assercoes cumpridas | Aprovado |
| T-197 | security-passwords.test.ts | SEC-PASS-01 rejeita comprimento fora da politica (14) | Assercoes cumpridas | Aprovado |
| T-198 | security-passwords.test.ts | SEC-PASS-01 rejeita comprimento fora da politica (129) | Assercoes cumpridas | Aprovado |
| T-199 | security-passwords.test.ts | SEC-PASS-02 aceita comprimento permitido sem composicao artificial (15) | Assercoes cumpridas | Aprovado |
| T-200 | security-passwords.test.ts | SEC-PASS-02 aceita comprimento permitido sem composicao artificial (64) | Assercoes cumpridas | Aprovado |
| T-201 | security-passwords.test.ts | SEC-PASS-02 aceita comprimento permitido sem composicao artificial (128) | Assercoes cumpridas | Aprovado |
| T-202 | security-passwords.test.ts | SEC-PASS-03 aceita espacos e Unicode sem truncar | Assercoes cumpridas | Aprovado |
| T-203 | security-passwords.test.ts | SEC-PASS-04 criacao e atualizacao rejeitam senha curta mas login legado nao muda | Assercoes cumpridas | Aprovado |
| T-204 | security-passwords.test.ts | SEC-PASS-05 hash bcrypt antigo continua autenticando senha antiga | Assercoes cumpridas | Aprovado |
| T-205 | security-passwords.test.ts | SEC-PASS-06 distingue sufixos depois de 72 bytes | Assercoes cumpridas | Aprovado |
| T-206 | security-passwords.test.ts | SEC-PASS-07 diferencia Unicode longo e nao aceita formato corrompido | Assercoes cumpridas | Aprovado |
| T-207 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (0) | Assercoes cumpridas | Aprovado |
| T-208 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (1) | Assercoes cumpridas | Aprovado |
| T-209 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (2) | Assercoes cumpridas | Aprovado |
| T-210 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (3) | Assercoes cumpridas | Aprovado |
| T-211 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (4) | Assercoes cumpridas | Aprovado |
| T-212 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (5) | Assercoes cumpridas | Aprovado |
| T-213 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (6) | Assercoes cumpridas | Aprovado |
| T-214 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (7) | Assercoes cumpridas | Aprovado |
| T-215 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (8) | Assercoes cumpridas | Aprovado |
| T-216 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (9) | Assercoes cumpridas | Aprovado |
| T-217 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (10) | Assercoes cumpridas | Aprovado |
| T-218 | security-paths.test.ts | SEC-PATH-01 rejeita escape ou caminho corrompido (11) | Assercoes cumpridas | Aprovado |
| T-219 | security-paths.test.ts | SEC-PATH-02 conserva caminhos legitimos (0) | Assercoes cumpridas | Aprovado |
| T-220 | security-paths.test.ts | SEC-PATH-02 conserva caminhos legitimos (1) | Assercoes cumpridas | Aprovado |
| T-221 | security-paths.test.ts | SEC-PATH-02 conserva caminhos legitimos (2) | Assercoes cumpridas | Aprovado |
| T-222 | security-paths.test.ts | SEC-PATH-02 conserva caminhos legitimos (3) | Assercoes cumpridas | Aprovado |
| T-223 | security-paths.test.ts | SEC-PATH-03 uploadPath tambem exige confinamento | Assercoes cumpridas | Aprovado |
| T-224 | security-paths.test.ts | SEC-PATH-04 exclusao externa bloqueada antes de unlink | Assercoes cumpridas | Aprovado |
| T-225 | security-paths.test.ts | SEC-PATH-05 link simbolico que escapa da raiz e bloqueado | Assercoes cumpridas | Aprovado |
| T-226 | security-paths.test.ts | SEC-PATH-06 arquivo ausente nao exclui outro alvo | Assercoes cumpridas | Aprovado |
| T-227 | security-paths.test.ts | SEC-PATH-07 escrita usa nome aleatorio e criacao exclusiva | Assercoes cumpridas | Aprovado |
| T-228 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (0) | Assercoes cumpridas | Aprovado |
| T-229 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (1) | Assercoes cumpridas | Aprovado |
| T-230 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (2) | Assercoes cumpridas | Aprovado |
| T-231 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (3) | Assercoes cumpridas | Aprovado |
| T-232 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (4) | Assercoes cumpridas | Aprovado |
| T-233 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (5) | Assercoes cumpridas | Aprovado |
| T-234 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (6) | Assercoes cumpridas | Aprovado |
| T-235 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (7) | Assercoes cumpridas | Aprovado |
| T-236 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (8) | Assercoes cumpridas | Aprovado |
| T-237 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (9) | Assercoes cumpridas | Aprovado |
| T-238 | security-rich-html.test.ts | SEC-HTML-01 remove HTML executavel (10) | Assercoes cumpridas | Aprovado |
| T-239 | security-rich-html.test.ts | SEC-HTML-02 preserva formatacao e alinhamento do Quill | Assercoes cumpridas | Aprovado |
| T-240 | security-rich-html.test.ts | SEC-HTML-03 preserva tamanho e alinhamento legitimos das imagens | Assercoes cumpridas | Aprovado |
| T-241 | security-rich-html.test.ts | SEC-HTML-04 exclui classes e CSS fora da allowlist | Assercoes cumpridas | Aprovado |
| T-242 | security-rich-html.test.ts | SEC-HTML-05 preserva protocolo legitimo (0) | Assercoes cumpridas | Aprovado |
| T-243 | security-rich-html.test.ts | SEC-HTML-05 preserva protocolo legitimo (1) | Assercoes cumpridas | Aprovado |
| T-244 | security-rich-html.test.ts | SEC-HTML-05 preserva protocolo legitimo (2) | Assercoes cumpridas | Aprovado |
| T-245 | security-rich-html.test.ts | SEC-HTML-05 preserva protocolo legitimo (3) | Assercoes cumpridas | Aprovado |
| T-246 | security-rich-html.test.ts | SEC-HTML-05 preserva protocolo legitimo (4) | Assercoes cumpridas | Aprovado |
| T-247 | security-rich-html.test.ts | SEC-HTML-05 preserva protocolo legitimo (5) | Assercoes cumpridas | Aprovado |
| T-248 | security-rich-html.test.ts | SEC-HTML-06 remove URL relativa a protocolo e protege nova aba | Assercoes cumpridas | Aprovado |
| T-249 | security-rich-html.test.ts | SEC-HTML-07 normaliza uploads antigos e suporta vazio | Assercoes cumpridas | Aprovado |
| T-250 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria noticias | Assercoes cumpridas | Aprovado |
| T-251 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria eventos | Assercoes cumpridas | Aprovado |
| T-252 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria paginas | Assercoes cumpridas | Aprovado |
| T-253 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria banners | Assercoes cumpridas | Aprovado |
| T-254 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria secretaria | Assercoes cumpridas | Aprovado |
| T-255 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria midia | Assercoes cumpridas | Aprovado |
| T-256 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria config | Assercoes cumpridas | Aprovado |
| T-257 | security-upload-access.test.ts | SEC-ASSET administrador autorizado visualiza previa na categoria documentos | Assercoes cumpridas | Aprovado |
| T-258 | security-upload-access.test.ts | SEC-ASSET noticia publica e HTML rico vinculam arquivo real | Assercoes cumpridas | Aprovado |
| T-259 | security-upload-access.test.ts | SEC-ASSET visitante recebe arquivo de eventos com vinculo publico | Assercoes cumpridas | Aprovado |
| T-260 | security-upload-access.test.ts | SEC-ASSET visitante recebe arquivo de paginas com vinculo publico | Assercoes cumpridas | Aprovado |
| T-261 | security-upload-access.test.ts | SEC-ASSET visitante recebe arquivo de banners com vinculo publico | Assercoes cumpridas | Aprovado |
| T-262 | security-upload-access.test.ts | SEC-ASSET visitante recebe arquivo de secretaria com vinculo publico | Assercoes cumpridas | Aprovado |
| T-263 | security-upload-access.test.ts | SEC-ASSET visitante recebe arquivo de midia com vinculo publico | Assercoes cumpridas | Aprovado |
| T-264 | security-upload-access.test.ts | SEC-ASSET logo e conteudo legal conservam acesso publico | Assercoes cumpridas | Aprovado |
| T-265 | security-upload-access.test.ts | SEC-ASSET arquivo legado orfao nao se torna publico nem por outra permissao | Assercoes cumpridas | Aprovado |
| T-266 | security-uploads.test.ts | SEC-UP-01 aceita PNG com MIME, extensao e assinatura coerentes | Assercoes cumpridas | Aprovado |
| T-267 | security-uploads.test.ts | SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (0) | Assercoes cumpridas | Aprovado |
| T-268 | security-uploads.test.ts | SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (1) | Assercoes cumpridas | Aprovado |
| T-269 | security-uploads.test.ts | SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (2) | Assercoes cumpridas | Aprovado |
| T-270 | security-uploads.test.ts | SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (3) | Assercoes cumpridas | Aprovado |
| T-271 | security-uploads.test.ts | SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (4) | Assercoes cumpridas | Aprovado |
| T-272 | security-uploads.test.ts | SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (5) | Assercoes cumpridas | Aprovado |
| T-273 | security-uploads.test.ts | SEC-UP-03 rejeita arquivo acima do limite (documentos) | Assercoes cumpridas | Aprovado |
| T-274 | security-uploads.test.ts | SEC-UP-03 rejeita arquivo acima do limite (midia) | Assercoes cumpridas | Aprovado |
| T-275 | security-uploads.test.ts | SEC-UP-03 rejeita arquivo acima do limite (banners) | Assercoes cumpridas | Aprovado |
| T-276 | security-uploads.test.ts | SEC-UP-04 aceita PDF e rejeita arquivo vazio ou destino externo | Assercoes cumpridas | Aprovado |
| T-277 | security-uploads.test.ts | SEC-UP-05 identifica conteiner Office real (docx) | Assercoes cumpridas | Aprovado |
| T-278 | security-uploads.test.ts | SEC-UP-05 identifica conteiner Office real (xlsx) | Assercoes cumpridas | Aprovado |
| T-279 | security-uploads.test.ts | SEC-UP-06 ZIP comum nao pode fingir ser documento Office | Assercoes cumpridas | Aprovado |
| T-280 | Navegador / PostgreSQL isolado | PUBLIC-375 paginas publicas sem overflow e com conteudo | Assercoes cumpridas | Aprovado |
| T-281 | Navegador / PostgreSQL isolado | ADMIN-375 listagens e formularios sem overflow | Assercoes cumpridas | Aprovado |
| T-282 | Navegador / PostgreSQL isolado | PUBLIC-768 paginas publicas sem overflow e com conteudo | Assercoes cumpridas | Aprovado |
| T-283 | Navegador / PostgreSQL isolado | ADMIN-768 listagens e formularios sem overflow | Assercoes cumpridas | Aprovado |
| T-284 | Navegador / PostgreSQL isolado | PUBLIC-1366 paginas publicas sem overflow e com conteudo | Assercoes cumpridas | Aprovado |
| T-285 | Navegador / PostgreSQL isolado | ADMIN-1366 listagens e formularios sem overflow | Assercoes cumpridas | Aprovado |
| T-286 | Navegador / PostgreSQL isolado | FLOW-01 painel exige login e API protegida nega acesso | Assercoes cumpridas | Aprovado |
| T-287 | Navegador / PostgreSQL isolado | FLOW-02 menu publico mobile fecha apos navegar | Assercoes cumpridas | Aprovado |
| T-288 | Navegador / PostgreSQL isolado | FLOW-03 tema persiste apos reload e Tab revela skip link | Assercoes cumpridas | Aprovado |
| T-289 | Navegador / PostgreSQL isolado | FLOW-04 menu administrativo mobile e sidebar fixa | Assercoes cumpridas | Aprovado |
| T-290 | Navegador / PostgreSQL isolado | FLOW-05 paginas legais, slug, download e conteudo dinamico | Assercoes cumpridas | Aprovado |
| T-291 | Navegador / PostgreSQL isolado | CRUD-01 noticias com PostgreSQL isolado e fluxo de aprovacao | Assercoes cumpridas | Aprovado |
| T-292 | Navegador / PostgreSQL isolado | CRUD-02 documentos com upload e exclusao apenas em diretorio temporario | Assercoes cumpridas | Aprovado |
| T-293 | Navegador / PostgreSQL isolado | FLOW-06 login informa erros e campos invalidos | Assercoes cumpridas | Aprovado |
| T-294 | Navegador / PostgreSQL isolado | FLOW-07 carrossel automatico sem botao de pausa e imagens de upload | Assercoes cumpridas | Aprovado |
| T-295 | Navegador / PostgreSQL isolado | FLOW-08 configuracao altera texto dinamico sem novo build | Assercoes cumpridas | Aprovado |
| T-296 | Navegador / PostgreSQL isolado | A11Y-01 WCAG A/AA nas telas publicas e formulario administrativo | Assercoes cumpridas | Aprovado |
| T-297 | Navegador / PostgreSQL isolado | SESSION-01 conserva login entre painel e paginas publicas e permite sair | Assercoes cumpridas | Aprovado |
| T-298 | Navegador / PostgreSQL isolado | SESSION-02 servidor bloqueia sessao com 30 minutos de inatividade | Assercoes cumpridas | Aprovado |
| T-299 | Navegador / PostgreSQL isolado | SESSION-03 usuario autorizado pode encerrar outra sessao | Assercoes cumpridas | Aprovado |
| T-300 | Navegador / PostgreSQL isolado | SESSION-04 interacao renova atividade mas consultas de sessao nao renovam | Assercoes cumpridas | Aprovado |
| T-301 | Navegador / PostgreSQL isolado | NAV-01 links do rodape azuis com destaque ao passar o mouse | Assercoes cumpridas | Aprovado |
| T-302 | Navegador / PostgreSQL isolado | NAV-02 icones sociais com cores caracteristicas e links preservados | Assercoes cumpridas | Aprovado |
| T-303 | Navegador / PostgreSQL isolado | SEC-BROWSER-01 politica visivel e senha curta bloqueada no formulario e APIs | Assercoes cumpridas | Aprovado |
| T-304 | Navegador / PostgreSQL isolado | SEC-BROWSER-02 todas as respostas de usuarios omitem credenciais e internos | Assercoes cumpridas | Aprovado |
| T-305 | Navegador / PostgreSQL isolado | SEC-BROWSER-03 HTML antigo sanitizado na renderizacao e na gravacao | Assercoes cumpridas | Aprovado |
| T-306 | Navegador / PostgreSQL isolado | SEC-BROWSER-04 visitante nao ve rascunho, pagina invisivel ou download inativo | Assercoes cumpridas | Aprovado |
| T-307 | Navegador / PostgreSQL isolado | SEC-BROWSER-05 conta legada autentica mas nao administra usuarios | Assercoes cumpridas | Aprovado |
| T-308 | Navegador / PostgreSQL isolado | SEC-BROWSER-06 reset exige politica, consome token uma vez e revoga sessao | Assercoes cumpridas | Aprovado |
| T-309 | Navegador / PostgreSQL isolado | SEC-BROWSER-07 upload falso e excesso recusados; headers e otimizador seguros | Assercoes cumpridas | Aprovado |
