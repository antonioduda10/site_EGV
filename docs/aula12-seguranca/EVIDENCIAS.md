# Evidencias - Aula 12

Capturas 01 a 06: telas reais do portal em Chromium/PostgreSQL isolado. Dados ficticios e senhas esvaziadas antes dos prints. Sem cookies, traces ou videos salvos. Nenhuma captura do ambiente real.

Pasta: `docs/aula12-seguranca/evidencias/`.

| Arquivo | Comprovacao |
| --- | --- |
| 01-formulario-usuario-politica-senha.png | Politica na administracao |
| 02-senha-curta-bloqueada.png | Validacao visivel, sem senha |
| 03-conteudo-publico-sanitizado.png | HTML legitimo preservado; testes verificam ausencia de execucao |
| 04-rascunho-nao-publicado.png | Listagem publica sem rascunho |
| 05-painel-conteudo-restrito.png | Mesmo rascunho acessivel ao administrador |
| 06-controle-acesso.png | Conta sem permissao bloqueada |
| 07-testes-seguranca.png | Resumo dos resultados reais Vitest/Playwright/cobertura |
| 08-validacao-final.png | Comandos e codigos de saida reais |

07/08 sao relatorios visuais, nao telas simuladas do portal ou capturas de terminal. O gerador recusa aprovacao com falhas/skips. Prints isolados nao provam ausencia de XSS/vazamento: as conclusoes dependem das assercoes dos testes.

## Registros

- linha-base/: validacao anterior sanitizada, build/E2E bloqueados explicitamente.
- npm-audit-antes.json: auditoria inicial sanitizada.
- validacao.json e testes/cobertura/lint/typescript/build.txt: ultima validacao encadeada.
- resumo-testes.json: totais reais e cobertura selecionada.
- ../npm-audit-resumo.txt: auditoria final, incluindo riscos restantes.
- ../CASOS_TESTE_SEGURANCA.md: tabela gerada dos relatorios efetivos.

Consulte PENDENCIAS_SEGURANCA.md. Nao se afirma ausencia de toda vulnerabilidade.
