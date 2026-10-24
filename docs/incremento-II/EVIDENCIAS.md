# Evidencias do Incremento II

## Capturas do portal

As imagens mostram o Next.js executando o codigo do projeto com registros ficticios em um schema PostgreSQL temporario. Nao sao mockups. O objetivo e demonstrar a interface sem divulgar dados pessoais, senhas, tokens ou cookies reais.

| Arquivo em `evidencias/` | Conteudo |
| --- | --- |
| `01-home-desktop.png` | Home em 1366 px |
| `02-home-mobile.png` | Home em 375 px |
| `03-tela-publica-mobile.png` | Documentos em 375 px |
| `04-login.png` | Login com campos vazios |
| `05-dashboard.png` | Visao geral autenticada com usuario ficticio |
| `06-tela-administrativa.png` | Documentos: formulario com rotulos associados |
| `07-testes-aprovados.png` | Resumo gerado dos resultados reais Vitest/Playwright e cobertura |
| `08-build-validacao.png` | Resumo dos codigos de saida dos comandos de validacao |
| `09-home-escuro.png` | Home no tema escuro |
| `10-login-escuro.png` | Login no tema escuro, campos vazios |
| `11-rodape-links.png` | Rodape com links em azul mais intenso, revisado apos solicitacao |
| `12-redes-sociais-desktop.png` | Icones sociais com cores caracteristicas em desktop |
| `13-redes-sociais-mobile.png` | Os mesmos icones e links em largura de celular |

Os arquivos 07/08 sao resumos visuais de execucao, gerados de JSON/logs reais. Nao simulam um terminal e nao substituem as capturas da aplicacao 01 a 06. O gerador se recusa a produzir aprovacao quando ha comando reprovado, teste falhando ou E2E ignorado.

## Evidencias tecnicas

- `evidencias/testes.txt`, `cobertura.txt`, `lint.txt`, `typescript.txt`, `build.txt`: saidas da validacao.
- `evidencias/e2e.txt`: execucao final do Playwright, com 23 testes aprovados e confirmacao de limpeza do schema temporario.
- `evidencias/validacao.json`: comandos, codigo de saida e horarios de inicio/fim.
- `evidencias/acessibilidade-antes.json`: primeira auditoria, com falhas de contraste encontradas.
- `evidencias/acessibilidade.json`: auditoria mais recente, com rota, impacto e seletores quando ha falha.
- `evidencias/resumo-testes.json`: contagens finais e cobertura resumida, sem credenciais.
- `evidencias/resumo-testes.html` e `resumo-validacao.html`: fontes das capturas 07/08.
- [CASOS_TESTE.md](CASOS_TESTE.md): tabela CASO DE TESTE | FUNCIONALIDADE | RESULTADO ESPERADO | RESULTADO OBTIDO | SITUACAO, gerada dos relatorios de execucao.
- `coverage/index.html`, `test-results/vitest.json`, `test-results/e2e.json` e `playwright-report/index.html`: relatorios locais regeneraveis, ignorados pelo Git.

Os horarios dos JSONs sao gravados em UTC. As larguras de 375/768/1366 px representam celular/tablet/desktop simulados no Chromium, e nao testes em aparelhos fisicos.

Resultado final apos a revisao: 110 casos Vitest e 23 Playwright aprovados, nenhuma falha; 15 telas/estados avaliados pelo axe sem violacoes nas regras selecionadas. Lint, TypeScript e build aprovados. Os 23 avisos antigos de imagens e as pendencias de seguranca de dependencias estao registrados no relatorio.

## Escopo visual e funcional

Dez rotas publicas/login e treze paginas administrativas sao percorridas nas tres larguras. Os casos adicionais verificam protecao sem sessao, menu publico, menu administrativo, sidebar, tema persistente, foco de teclado, paginas legais, slugs, noticias publicadas, upload/download de documentos, carrossel e configuracao dinamica.

Na revisao solicitada, SESSION-01 confere ida do painel ao site publico, reload, retorno ao painel sem senha e saida voluntaria; SESSION-02 verifica rejeicao de JWT inativo por 30 minutos; SESSION-03 verifica encerramento por usuario autorizado; SESSION-04 distingue interacao real de consultas automaticas. Os prazos sao simulados apenas em cookies assinados com a chave efemera do ambiente de testes, sem esperar 30 minutos reais ou tocar em sessoes do banco principal. NAV-01 verifica cor azul e destaque dos links do rodape; FLOW-07 verifica troca automatica de banners sem botao de pausa.

NAV-02 verifica as cores dos cinco icones sociais existentes, o degrade do Instagram, os detalhes do TikTok, nomes acessiveis e preservacao dos links/abertura em nova aba. As capturas 12/13 usam apenas links ficticios cadastrados no schema temporario; nenhuma configuracao real do rodape e alterada.

A auditoria axe avalia regras WCAG A/AA nas telas selecionadas. O resultado nao comprova conformidade completa de todos os conteudos cadastrados ou combinacoes futuras de cores/imagens. A evidencia anterior registra o defeito encontrado; o arquivo mais recente registra o resultado apos as correcoes.

## Como regenerar

```powershell
npm run validate
npm run test:e2e
npm run test:evidence
```

Na primeira execucao, instalar o Chromium com `npx playwright install chromium`. O PostgreSQL deve estar disponivel. Nao rodar o seed do banco real para obter as capturas: o runner cria os registros ficticios automaticamente e remove o schema e os arquivos temporarios ao terminar.
