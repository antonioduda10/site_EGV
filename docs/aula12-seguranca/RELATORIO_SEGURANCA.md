# Relatorio de Seguranca da Informacao - Aula 12

## 1. Contextualizacao

Portal Institucional da Escola Municipal Getulio Vargas, Projeto Extensionista Integrador II, UNITINS. Incremento sobre a copia local 12.0 de site_EGV, sem sincronizacao remota, reescrita ou publicacao. Nenhum commit/push, seed ou migration foi executado. Testes de navegador usam somente schema PostgreSQL e uploads temporarios com dados ficticios. Node 24 LTS foi autorizado pelo usuario; o runtime global nao foi trocado.

## 2. Checklist de seguranca

Matriz completa dos 17 aspectos obrigatorios em DIAGNOSTICO_SEGURANCA.md: autenticacao, autorizacao, RBAC, controle de acesso, validacao, integridade, confidencialidade, dados pessoais, senhas, sessoes, APIs, uploads/downloads, XSS, dependencias, segredos, logs e erros.

Controles preservados: Credentials/bcrypt, conta ativa, guards de permissao, super administrador protegido, sessao JWT, expiracao apos 30 minutos de inatividade, renovacao por interacao e revogacao por versao. Login nao recebeu a regra de 15 caracteres. Nao foi confirmado bypass dos guards RBAC existentes, armazenamento de senha em texto puro ou vazamento de segredo de ambiente em endpoint. Isso nao equivale a auditoria externa completa ou prova de inexistencia de falhas.

## 3. Problemas confirmados

Retorno de senhaHash nas respostas administrativas de usuario; HTML rico sem sanitizacao; GETs e downloads com visibilidade incompleta; politica fraca de novas senhas; confianca em MIME declarado; caminhos de arquivo sem confinamento uniforme; logs com resposta/query desnecessaria; dependencias vulneraveis. Cada item abaixo distingue correcao comprovavel de risco residual.

## 4. Evidencia tecnica inicial

Linha de base antes das correcoes: 110 testes aprovados, zero reprovados; cobertura selecionada 97,50% linhas/statements, 88,78% branches e 92,59% funcoes. Lint sem erros, 23 avisos existentes de img; TypeScript aprovado. Build bloqueado por EPERM em .next-build/trace. E2E inicial nao iniciou sem build utilizavel, portanto zero casos comprovados nessa etapa. Logs sanitizados em evidencias/linha-base/. Auditoria inicial: 12 ocorrencias (1 baixa, 5 moderadas, 4 altas, 2 criticas), registrada em evidencias/npm-audit-antes.json.

## 5. Impacto

Os problemas podiam ampliar acesso a conteudo nao publicado, expor material de autenticacao a clientes autorizados que nao necessitavam dele, persistir HTML executavel e permitir operacoes de arquivo inadequadas. Nao foi feita exploracao contra terceiros nem se afirma comprometimento ocorrido no ambiente real.

## 6. Correcoes implementadas

### Usuario seguro

**Problema identificado:** respostas GET/POST/PATCH podiam incluir senhaHash.

**Categoria de seguranca:** confidencialidade e minimizacao de dados.

**Impacto:** hash disponibilizado desnecessariamente ao navegador.

**Situacao antes:** objetos Prisma amplos retornados como JSON.

**Correcao realizada:** safeUserSelect central, somente campos usados; sem senhaHash, senha, tokens de reset ou sessaoVersao. Query do dashboard tambem minimizada.

**Teste executado:** SEC-USER e SEC-BROWSER-02, com ausencia explicita de campos e mock que respeita o select real.

**Resultado depois:** assercoes aprovadas somente quando a projecao nao inclui campos internos; consultar tabela gerada de casos.

**Evidencia:** lib/safe-user.ts, APIs de usuarios, testes e resumo automatizado; nenhum hash real exibido.

### HTML rico

**Problema identificado:** normalizacao de URLs nao removia scripts, eventos ou protocolos perigosos.

**Categoria de seguranca:** stored XSS e validacao de entrada.

**Impacto:** HTML persistente potencialmente executavel em paginas publicas/editor.

**Situacao antes:** seis sinks publicos usavam HTML do banco sem sanitizador.

**Correcao realizada:** sanitizeRichHtml unico com sanitize-html mantido, allowlist explicita no servidor, ao gravar e renderizar registros antigos; JSON/editor recebem conteudo sanitizado. Quill mantem paragrafos, titulos, listas, enfase, links, imagens seguras e alinhamentos permitidos. Iframes, script, SVG, objetos/embed, on* e protocolos perigosos removidos. Links configurados fora do HTML tambem recebem safeHref na exibicao.

**Teste executado:** SEC-HTML/SEC-LINK, SEC-PUB-06 e SEC-BROWSER-03 (incluindo ausencia de marcador de execucao no window).

**Resultado depois:** payloads controlados removidos; conteudo legitimo preservado conforme testes, nao apenas por inspecao visual.

**Evidencia:** 03-conteudo-publico-sanitizado.png e testes security-rich-html/security-links.

### Visibilidade publica

**Problema identificado:** listagens/detalhes/download ignoravam estados em parte das APIs.

**Categoria de seguranca:** autorizacao e controle de acesso.

**Impacto:** rascunhos, paginas invisiveis e documentos inativos acessiveis por rotas alternativas.

**Situacao antes:** pagina publica filtrava alguns registros, mas JSON ou caminho bruto podiam contornar o filtro.

**Correcao realizada:** PUBLICADO e data permitida em noticias; visivel em paginas; PUBLICADO em eventos; ativo em banners/secretaria; ATIVO em documentos; dataPublicacao em videos; avisos inativos excluidos do JSON publico. Administracao exige permissao especifica, nao apenas sessao. SSR, metadados, busca, download por ID e arquivos brutos alinhados. Preview de upload continua permitido ao editor autorizado. Orfaos sem vinculo publico nao sao servidos. APIs de conteudo sao dinamicas, sem cache publico compartilhado de respostas condicionais.

**Teste executado:** SEC-PUB, SEC-FILE, SEC-ASSET e SEC-BROWSER-04/05.

**Resultado depois:** restrito retorna 404 ao visitante; acao administrativa sem permissao retorna 403; administrador mantem acesso. Midia/AlbumFoto nao possuem status no schema e continuam publicos por definicao existente.

**Evidencia:** 04-rascunho-nao-publicado.png, 05-painel-conteudo-restrito.png e 06-controle-acesso.png.

### Senhas e reset

**Problema identificado:** minimo anterior de seis caracteres; bcrypt puro limita entrada a 72 bytes; reset sem revogacao e consumo atomico.

**Categoria de seguranca:** autenticacao, integridade e sessoes.

**Impacto:** senhas novas fracas, sufixos longos indistinguiveis e sessoes antigas apos reset.

**Situacao antes:** politica curta compartilhada em criacao; reset atualizava sem incrementar versao.

**Correcao realizada:** novas senhas de 15 a 128 pontos de codigo Unicode, aceitando espacos/frases, sem composicao artificial ou truncamento. Novos hashes versionados aplicam HMAC-SHA384/base64 com salt aleatorio por registro antes do bcrypt existente (custo 10). O salt e publico, nao um pepper secreto. Isso evita o limite de 72 bytes; hashes bcrypt antigos continuam verificados sem regravacao automatica. Reset consome token uma vez em transacao e incrementa sessaoVersao; alteracao administrativa tambem revoga.

**Teste executado:** SEC-PASS, SEC-RESET, SEC-USER, SEC-BROWSER-01/05/06 e suite SESSION existente.

**Resultado depois:** senha curta recusada em criacao/alteracao/reset; senha legada curta ainda autentica; sufixos apos 72 bytes sao distintos; reset reutilizado e recusado.

**Evidencia:** 01-formulario-usuario-politica-senha.png e 02-senha-curta-bloqueada.png. Nenhuma senha/hash real faz parte das provas.

### Uploads

**Problema identificado:** MIME informado pela requisicao era tratado como garantia de formato.

**Categoria de seguranca:** validacao de dados/arquivos.

**Impacto:** arquivo incompatível podia ser salvo com extensao/tipo enganoso.

**Situacao antes:** allowlists e limites dispersos, sem verificacao central de assinatura.

**Correcao realizada:** upload-policy central, file-type e extensao/MIME/assinatura/tamanho/destino consistentes. Imagens JPEG/PNG/WebP ate 5 MB; documentos PDF/DOCX/XLSX/JPEG/PNG ate 10 MB; audio/video suportado ate 100 MB. Imagem em midia tambem limitada a 5 MB. Nomes UUID e escrita exclusiva. HTML, SVG nao sanitizado, executaveis e tipos incompatíveis recusados. Leitura de legado verifica assinatura antes de servir. Banner novo e validado antes de remover o antigo.

**Teste executado:** SEC-UP, SEC-FILE e SEC-BROWSER-07; MIME/extensao falsos, excesso, formatos aceitos e nao aceitos.

**Resultado depois:** entradas invalidas nao chegam a escrita; conteudo aceito conserva fluxo. Nao se afirma varredura antivirus.

**Evidencia:** testes security-uploads, security-paths e regressao CRUD-02/FLOW-07.

### Confinamento de arquivos

**Problema identificado:** nem todo caminho de banco/URL era validado antes de ler/excluir.

**Categoria de seguranca:** path traversal e integridade.

**Impacto:** operacao fora de uploads caso caminho fosse adulterado.

**Situacao antes:** protecao parcial na rota bruta, sem helper uniforme para download/exclusao.

**Correcao realizada:** resolvePathInsideUploads unico e verificacao realpath para links simbolicos/ancestrais, antes de readFile, writeFile ou unlink. Bloqueia ../ codificado, absolutos externos, prefixos semelhantes e caminhos corrompidos. Pasta raiz vem de configuracao confiavel, nunca do cliente.

**Teste executado:** SEC-PATH, SEC-FILE-06 e regressao UPLOAD.

**Resultado depois:** caminho externo nao e lido/excluido; destinos legitimos continuam funcionais. Ver limitacao de concorrencia/SO nas pendencias.

**Evidencia:** testes security-paths/security-files e logs automatizados.

### Logs, segredos e headers

**Problema identificado:** logger aceitava resposta bruta/query e nao havia rotina segura de entrega nem todos os headers basicos.

**Categoria de seguranca:** confidencialidade/configuracao e tratamento de erro.

**Impacto:** dados desnecessarios em logs/backup e protecoes de navegador incompletas.

**Situacao antes:** copia indiscriminada de pacote podia conter arquivos privados; alguns catches devolviam mensagem interna.

**Correcao realizada:** redacao central de campos/texto; logger nao transmite corpo de resposta/query; erros externos genericos; .env* ignorado; empacotador por allowlist antes da leitura; nosniff, Referrer-Policy, X-Frame-Options e Permissions-Policy. Sem CSP improvisada.

**Teste executado:** security-package-logs (ZIP real de fixture), testes de erros e SEC-BROWSER-07.

**Resultado depois:** dados operacionais preservados, segredos ficticios excluidos nos testes. Logs antigos nao foram alterados e o redator nao e garantia universal contra segredo arbitrario.

**Evidencia:** manifesto do pacote, SEGREDOS_E_EMPACOTAMENTO.md e testes.

### Dependencias

**Problema identificado:** advisories de NextAuth, Next e dependencias transitivas.

**Categoria de seguranca:** cadeia de dependencias.

**Impacto:** riscos descritos nos advisories oficiais; nao se afirma exploracao concreta de cada um no portal.

**Situacao antes:** NextAuth 4.24.7, Next 14.2.5, sem sharp; auditoria com 12 ocorrencias.

**Correcao realizada:** NextAuth 4.24.15; Next 14.2.35 sem migracao de major; sharp 0.35.5 efetivamente resolvido pelo Next; otimizador desativado; sanitize-html 2.18.1 e file-type 22.2.0; PostCSS 8.5.31 e lodash/lodash-es 4.18.1 por overrides compativeis. eslint-config-next alinhado em 14.2.35. fflate 0.8.3 e tipos do sanitizador como ferramentas de desenvolvimento. Node 24 LTS necessario para as bibliotecas corrigidas.

**Teste executado:** auditoria omit=dev, verificacao do sharp efetivo, suite completa e build; resultados finais em registros associados.

**Resultado depois:** auditoria reduzida para 6 ocorrencias (4 moderadas, 1 alta, 1 critica), nao zero. Next e Zod/editor permanecem pendentes.

**Evidencia:** npm-audit-resumo.txt e PENDENCIAS_SEGURANCA.md.

## 7. Arquivos alterados

Inventario exato em ARQUIVOS_ALTERADOS.md. Grupos: lib/ (politicas centrais), APIs de usuarios/autenticacao/conteudo/arquivos/logs, sinks publicos e props dos editores, formularios de usuario/reset, configuracao Next/runtime, manifestos de dependencias, testes e documentacao. Nenhuma rota foi removida, nenhum schema/seed/migration foi alterado. next-env.d.ts/tsconfig receberam ajustes gerados pelo Next para o diretorio de build isolado.

## 8. Testes criados

Suites security-users/public-access/reset/files (integracao), security-rich-html/passwords/uploads/paths/package-logs/upload-access/links (unidade), security.spec.ts (navegador). Casos obrigatorios incluem explicitamente ausencia de senhaHash, draft/invisivel/inativo, 403, sanitizacao, senha curta, conta legada, MIME falso, limite e traversal. Testes anteriores foram preservados; fixtures foram adequadas apenas aos novos contratos de assinatura, sanitizacao e cache privado. Nenhuma regra global de lint, limite de cobertura ou verificacao de tipos foi desativada.

## 9. Resultado obtido

Validacao final: **279 testes de unidade/integracao e 30 E2E aprovados, zero reprovados e zero ignorados** (309 casos; 169 testes unitarios/integracao e 7 E2E acrescentados). Cobertura selecionada: **92,43% linhas/statements, 87,73% branches, 95,52% funcoes**. Lint: zero erros e 23 avisos img preexistentes. TypeScript, build isolado e validate: codigo de saida zero. Build tambem conserva aviso de base Browserslist desatualizada. Auditoria de producao: 6 ocorrencias restantes, com exit code 1 esperado por haver riscos, nao aprovada como zero vulnerabilidades.

A ultima compilacao de validacao usa conexao ficticia nao operacional, para impedir efeitos sobre dados reais. A primeira compilacao bem-sucedida usou configuracao local: a rotina historica de promocao de noticias agendadas existia no GET antes da deteccao de sessao. Nao foi coletada contagem de registros afetados nessa primeira compilacao, portanto nao se afirma auditoria completa de mutacoes desse momento. As APIs agora declaram comportamento dinamico explicitamente e o build final passou sem acesso ao banco operacional. Nenhum registro real foi criado/editado manualmente ou revertido; os testes de escrita ocorreram exclusivamente no schema temporario.

O resultado final verificavel e `evidencias/resumo-testes.json`, acompanhado por `validacao.json`, logs dos cinco comandos, casos gerados e relatorio E2E. A cobertura foi ampliada para mais arquivos de seguranca; nao e diretamente comparavel ao percentual inicial sobre conjunto menor. Falhas intermediarias de fixture/tipagem nao foram ocultadas: foram corrigidas e reexecutadas. Nao se deve interpretar uma etapa parcial como conclusao.

## 10. Evidencias e prints

Oito caminhos e significados em EVIDENCIAS.md. 01 a 06 sao capturas da aplicacao; 07 e 08 sao resumos visuais gerados de execucoes reais. Sem credenciais/PII real e sem screenshots de terminal como unica prova.

## 11. Riscos que permanecem

PENDENCIAS_SEGURANCA.md detalha Next major, editor/Zod, rate limiting persistente, CSP, transporte de recuperacao, tokens de reset em repouso, antivirus, retencao de logs, HTTPS e isolamento do sistema de arquivos. A mitigacao de imagem nao elimina todos os advisories do Next. O Node global antigo precisa ser selecionado/atualizado pelo operador antes de executar esta versao.

## 12. Conclusao

O incremento concentra controles no servidor e preserva arquitetura e regras existentes. Aprovacao deve ser sustentada pelos resultados finais, nao apenas pelo codigo ou capturas. Riscos residuais foram explicitados, sem declarar o portal livre de vulnerabilidades. Nao houve commit, push ou publicacao automatica. Comandos de reproducao em SEGREDOS_E_EMPACOTAMENTO.md.
