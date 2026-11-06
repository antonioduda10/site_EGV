# Pendencias de seguranca - Aula 12

## Alta prioridade

- **Next.js**: patch 14.2.35 aplicado, mas a major 14 permanece afetada. Migrar para major suportada em tarefa separada, com regressao de App Router, cache e middleware. Nao se declara o framework integralmente corrigido.
- **Image Optimization**: sem uso encontrado de next/image, next/og ou ImageResponse. Endpoint explicitamente desativado (`images.unoptimized`); sharp 0.35.5 instalado como mitigacao oficial de GHSA-2464-fhr4-w9xw. Nao corrige outros advisories do Next. E2E verifica o bloqueio do endpoint.
- **Editor e Zod**: pacotes afetados constam da auditoria final. React Quill e plugins dependem de Quill legado. Migrar editor e Zod exige regressao propria. Sanitizacao no servidor nao elimina todos os riscos das dependencias no navegador.
- **Forca bruta/abuso**: nao existe limitador persistente de login, recuperacao, contato ou contadores. Implementar em proxy/armazenamento compartilhado, considerando NAT escolar. Nenhum contador em memoria foi apresentado como protecao robusta.
- **Runtime**: selecionar Node 24 LTS, autorizado pelo usuario. Node global nao foi substituido. Reconstruir antes de usar o incremento.

## Proximos incrementos

- CSP correta para Next/Quill, primeiro Report-Only. Nenhuma CSP improvisada foi adicionada.
- Recuperacao: geracao de token e resposta generica ja existiam, mas nao envio de email. Integrar transporte e armazenamento apenas do digest do token. Reset agora aplica politica, consumo unico e revogacao.
- Antivirus/quarentena e limites de corpo no proxy. Magic bytes nao sao antivirus nem validacao completa de documentos complexos.
- Retencao/revisao dos logs historicos. Redacao nova nao modifica logs reais antigos nem reconhece todo segredo arbitrario.
- Permissoes do SO devem impedir que outros usuarios alterem uploads. Confinamento/symlinks nao substituem isolamento contra trocas concorrentes maliciosas de diretorios.
- HTTPS/cookies seguros e revisao operacional antes de exposicao externa. Esta tarefa nao publicou a aplicacao.

## Linha de base e referencias

Limitacao operacional: a primeira compilacao bem-sucedida usou configuracao local, sem contagem de agendamentos eventualmente processados pelo GET historico de noticias. Nao e possivel comprovar retrospectivamente zero mutacoes dessa rotina. A validacao final usa conexao ficticia nao operacional e APIs explicitamente dinamicas; nao houve tentativa de reverter registros reais.

Build inicial bloqueado por EPERM em `.next-build/trace`; E2E inicial sem build utilizavel, zero casos aprovados. Validacao final usa `.next-aula12`, preservando servidor original. Falhas intermediarias de fixtures/tipagem foram corrigidas; considerar o ultimo `evidencias/validacao.json` completo.

- https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279
- Demais advisories: `npm-audit-resumo.txt`.
