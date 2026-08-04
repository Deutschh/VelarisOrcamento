# Funcionamento das Sprints 12 a 19 - Velaris Orcamentos

Atualizado em: 2026-08-04.

Este documento explica o que foi realizado da Sprint 12 em diante, onde cada
funcionalidade vive no codigo e como os fluxos se conectam em um exemplo real.
A fonte principal de verdade continua sendo `docs/ESPECIFICACAO_V1.md`.

## Visao rapida

| Sprint | Tema                                      | Estado atual                                            |
| ------ | ----------------------------------------- | ------------------------------------------------------- |
| 12     | Propostas, versoes e valor final          | Implementado tecnicamente.                              |
| 13     | Agendamento assistido                     | Implementado tecnicamente.                              |
| 14     | Acompanhamento, recuperacao e comunicacao | Implementado tecnicamente com e-mail `stub`.            |
| 15     | PDF, aceite e documentos legais           | Implementado tecnicamente com PDF sob demanda.          |
| 16     | Servico realizado e avaliacoes            | Implementado tecnicamente com convite `stub`.           |
| 17     | Area do cliente                           | Implementado tecnicamente.                              |
| 18     | Metricas e administracao operacional      | Implementado tecnicamente.                              |
| 19     | PWA, seguranca, desempenho e deploy       | Itens locais adiantados; deploy/infra seguem pendentes. |

## Sprint 12 - Propostas, versoes e valor final

### O que foi entregue

- Criacao de proposta somente para solicitacao em `accepted_for_proposal`.
- Estrutura `quotes` como container comercial da solicitacao.
- Estrutura `quote_versions` como versoes comerciais auditaveis.
- Itens da proposta em `quote_version_items`.
- Eventos da proposta em `quote_version_events`.
- Codigo por versao no formato `ORC-...-Vn`.
- Valor final iniciado pelo total interno recalculado.
- Justificativa obrigatoria quando o valor final sai da faixa estimada.
- Bloqueio de valor negativo.
- Validade inicial configuravel por `QUOTE_VALIDITY_DAYS`.
- Termos comerciais salvos em snapshot.
- Preview/envio pelo painel da empresa.
- Envio idempotente com `Idempotency-Key`.
- Bloqueio de alteracao direta em proposta aceita.

### Onde fica no codigo

- Contratos: `packages/shared/src/proposals.ts`.
- Regras puras: `packages/domain/src/proposal-lifecycle.ts`.
- API: `apps/api/src/company/company-proposal-service.ts`.
- Repositorio: `apps/api/src/company/drizzle-company-proposal-repository.ts`.
- Rotas: `apps/api/src/company/company-router.ts`.
- Tela: `apps/web/src/pages/company-pages.tsx`.
- Schema/tabelas: `database/schemas/index.ts`.
- Migration: `database/migrations/0008_classy_millenium_guard.sql`.
- Testes: `apps/api/src/company/company-proposal-service.test.ts`.

### Como funciona

Depois que a empresa revisa uma solicitacao e aceita para proposta, o painel
habilita a criacao da proposta. O backend recalcula a solicitacao com o snapshot
de configuracao/precos, monta os itens comerciais e sugere o valor final. Quando
a empresa envia, o status da proposta muda por servico de aplicacao e regras de
dominio; o controller nao atualiza estado livremente.

## Sprint 13 - Agendamento assistido

### O que foi entregue

- Tabelas `appointments` e `appointment_history`.
- Modos de agendamento da especificacao:
  `required_with_proposal`, `optional_with_proposal`,
  `after_proposal_acceptance` e `external_only`.
- Timezone da empresa usado como referencia inicial.
- Duracao, data, horario, endereco e observacoes.
- Aviso de conflito sem bloqueio na V1.
- Confirmacao, pedido de outro horario, reagendamento, cancelamento e conclusao.
- Bloqueio de envio de proposta quando o modo exige horario ativo.

### Onde fica no codigo

- Contratos: `packages/shared/src/appointments.ts`.
- Regras puras: `packages/domain/src/appointment-lifecycle.ts`.
- API: `apps/api/src/company/company-appointment-service.ts`.
- Repositorio: `apps/api/src/company/drizzle-company-appointment-repository.ts`.
- Rotas: `apps/api/src/company/company-router.ts`.
- Tela empresa: `apps/web/src/pages/company-pages.tsx`.
- Tela publica de tracking: `apps/web/src/pages/public-pages.tsx`.
- Migration: `database/migrations/0009_white_wilson_fisk.sql`.
- Testes: `apps/api/src/company/company-appointment-service.test.ts`.

### Como funciona

A empresa propoe um horario no painel. Se houver outro atendimento no mesmo
periodo, a API sinaliza conflito, mas nao bloqueia a empresa. O cliente pode
confirmar ou pedir outro horario pelo acompanhamento publico quando o token e a
situacao permitem. Alteracoes ficam em historico.

## Sprint 14 - Acompanhamento, recuperacao e comunicacao

### O que foi entregue

- Acompanhamento publico por token em `/acompanhar/:token`.
- Recuperacao por codigo da solicitacao + e-mail ou WhatsApp informado.
- OTP gerado automaticamente somente para e-mail.
- Hash de OTP/token persistido; token bruto fica apenas com o cliente.
- Tentativas e validade configuraveis.
- Revogacao/substituicao de token publico apos recuperacao.
- Link assistido `wa.me` com mensagem preenchida.
- Tabela `notifications` para notificacoes internas iniciais.
- Acoes publicas de horario pelo tracking.

### Onde fica no codigo

- Contratos: `packages/shared/src/public.ts` e
  `packages/shared/src/quote-requests.ts`.
- API publica: `apps/api/src/public/public-quote-request-service.ts`.
- Repositorio: `apps/api/src/public/drizzle-quote-request-repository.ts`.
- Email stub: `apps/api/src/notifications/email-adapter.ts`.
- Rotas: `apps/api/src/public/public-router.ts`.
- Telas: `apps/web/src/pages/public-pages.tsx`.
- Migration: `database/migrations/0010_overjoyed_storm.sql`.
- Testes: `apps/api/src/public/public-quote-request-service.test.ts`.

### Como funciona

Quando uma solicitacao e enviada, o sistema entrega um token publico de
acompanhamento. Se o cliente perder o link, ele informa codigo e contato em
`/recuperar`; se houver e-mail na solicitacao, a API gera um OTP, registra hash,
limite e expiracao, e chama o adapter de e-mail. Com OTP correto, o token antigo
e revogado e um novo token e emitido.

## Sprint 15 - PDF, aceite e documentos legais

### O que foi entregue

- Rota publica segura para consultar a proposta enviada.
- PDF por versao gerado sob demanda pelo backend.
- Conteudo do PDF com codigos, validade, itens, totais, termos e agendamento
  quando existir.
- Aceite formal idempotente.
- Recusa formal idempotente.
- Registro de IP e user agent quando disponiveis.
- Tabela `quote_acceptances`.
- Versoes legais iniciais preservadas no aceite.
- Historico/eventos e notificacao interna.
- Botao de PDF e acoes de aceite/recusa no tracking.

### Onde fica no codigo

- Contratos: `packages/shared/src/proposals.ts`.
- Regras puras: `packages/domain/src/proposal-lifecycle.ts`.
- Geracao PDF: `apps/api/src/public/proposal-pdf.ts`.
- API publica: `apps/api/src/public/public-quote-request-service.ts`.
- Rotas: `apps/api/src/public/public-router.ts`.
- Tela: `apps/web/src/pages/public-pages.tsx`.
- Migration: `database/migrations/0011_skinny_namor.sql`.
- Testes: `apps/api/src/public/public-router.test.ts` e testes do service
  publico.

### Como funciona

O cliente abre o tracking e a API procura uma proposta enviada para aquele
token. Se existir, mostra a versao atual. Ao aceitar, o backend valida validade,
estado e idempotencia, registra o aceite, preserva versoes legais e marca a
versao como aceita. Versoes aceitas ficam imutaveis; mudancas comerciais futuras
devem gerar nova versao.

## Sprint 16 - Servico realizado e avaliacoes

### O que foi entregue

- Estado de servico em `appointments.service_status`.
- Regra pura de ciclo do servico.
- Empresa marca atendimento confirmado/concluido como realizado.
- Convite de avaliacao via adapter de e-mail `stub`.
- Avaliacao publica elegivel pelo tracking.
- Bloqueio de duplicidade por atendimento.
- Exibicao de avaliacoes visiveis no perfil publico.
- Recalculo de media e contagem da empresa.
- Moderacao Admin para ocultar/restaurar e marcar/limpar suspeita.

### Onde fica no codigo

- Contratos: `packages/shared/src/reviews.ts`.
- Regras puras: `packages/domain/src/service-lifecycle.ts`.
- API publica: `apps/api/src/public/public-quote-request-service.ts`.
- API empresa: `apps/api/src/company/company-appointment-service.ts`.
- API Admin: `apps/api/src/admin/admin-service.ts`.
- Tela publica/Admin/empresa: `apps/web/src/pages/public-pages.tsx`,
  `apps/web/src/pages/admin-pages.tsx` e `apps/web/src/pages/company-pages.tsx`.
- Migration: `database/migrations/0012_stiff_prima.sql`.

### Como funciona

Depois do aceite e do atendimento, a empresa marca o servico como realizado.
Isso torna a avaliacao elegivel no tracking publico se ainda nao existir
avaliacao para aquele atendimento. Avaliacoes visiveis entram na media e na
contagem exibidas no perfil publico; o Admin pode moderar sem apagar o registro.

## Sprint 17 - Area do cliente

### O que foi entregue

- Cadastro de cliente em `/cadastro/cliente`.
- Login comum com redirecionamento por papel.
- Home autenticada em `/cliente`.
- Solicitacoes, propostas aguardando confirmacao, proximos agendamentos e
  historico.
- Favoritos de empresas.
- Empresas recentes.
- Avaliacoes pendentes.
- Notificacoes.
- Vinculacao de solicitacoes feitas como visitante quando o contato corresponde
  ao e-mail verificado da conta.

### Onde fica no codigo

- Contratos: `packages/shared/src/customer.ts`.
- API: `apps/api/src/customer/customer-service.ts`.
- Repositorio: `apps/api/src/customer/drizzle-customer-repository.ts`.
- Rotas: `apps/api/src/customer/customer-router.ts`.
- Tela: `apps/web/src/pages/customer-pages.tsx`.
- Favoritos no perfil publico: `apps/web/src/pages/public-pages.tsx`.
- Migration: `database/migrations/0013_needy_frightful_four.sql`.
- Testes: `apps/api/src/customer/customer-service.test.ts`.

### Como funciona

O cliente pode criar conta depois de ja ter enviado solicitacoes como visitante.
Ao entrar em `/cliente`, a API busca dados vinculados ao usuario autenticado. A
vinculacao assistida compara o e-mail verificado da conta com o contato salvo na
solicitacao; telefone ainda fica pendente porque nao ha verificacao telefonica.

## Sprint 18 - Metricas e administracao operacional

### O que foi entregue

- Metricas da empresa em `/app`.
- Metricas Admin em `/admin`.
- Filtros por periodo, nicho e empresa.
- Volume de solicitacoes, conversao, tempo de resposta, valores estimado,
  proposto e aceito.
- Ranking operacional por empresa.
- Auditoria operacional.
- Solicitacoes de alteracao de preco pela empresa.
- Resolucao Admin de solicitacoes de preco.
- Tabela final `company_price_change_requests`.

### Onde fica no codigo

- Contratos: `packages/shared/src/metrics.ts`.
- API: `apps/api/src/operational/operational-metrics-service.ts`.
- Repositorio:
  `apps/api/src/operational/drizzle-operational-metrics-repository.ts`.
- Rotas: `apps/api/src/company/company-router.ts` e
  `apps/api/src/admin/admin-router.ts`.
- Telas: `apps/web/src/pages/company-operational.tsx` e
  `apps/web/src/pages/admin-operational.tsx`.
- Migrations: `database/migrations/0014_chunky_raza.sql` e
  `database/migrations/0015_blue_bulldozer.sql`.
- Testes: `apps/api/src/operational/operational-metrics-service.test.ts`.

### Como funciona

As metricas sao agregadas a partir do banco transacional do produto, sem
analytics externo. A empresa so acessa seus proprios dados por vinculo e
`company_id`. O Admin pode ver recortes globais e resolver solicitacoes de
alteracao de preco, preservando auditoria.

## Sprint 19 - PWA, seguranca, desempenho e deploy

### O que foi adiantado em codigo

- Manifest PWA em `apps/web/public/manifest.webmanifest`.
- Icones provisorios em `apps/web/public/icons`.
- Service worker em `apps/web/public/sw.js`.
- Registro do service worker em `apps/web/src/pwa.ts` e `apps/web/src/main.tsx`.
- Cache restrito a assets estaticos; rotas sensiveis nao sao cacheadas.
- Headers de seguranca em `apps/api/src/middleware/security-headers.ts`.
- `Cache-Control: no-store` em respostas `/api/*`.
- Rate limit em `apps/api/src/middleware/rate-limit.ts`.
- Variaveis configuraveis em `packages/shared/src/env.ts` e `.env.example`.
- Cookies `secure` em `homologation` e `production`.
- Limpeza de expirados em `apps/api/src/maintenance`.
- Script `npm run maintenance:cleanup`.
- Checagem de prontidao em `apps/api/src/config/production-readiness.ts`.
- Script `npm run check:production`.
- Testes unitarios de rate limit, headers, limpeza e prontidao.

### O que segue pendente

- Deploy real.
- Homologacao publica.
- Dominio e SSL reais.
- Backups e restore testado.
- Monitoramento e alertas.
- Sistema definitivo de envio de erros.
- Provedor real de e-mail.
- Upload binario/armazenamento privado.
- Icones finais aprovados.
- Conta piloto real.

## Exemplo real de funcionamento

### Cenario

Uma empresa chamada "Limpa Sofa Centro" esta ativa, publicada e configurada para
limpeza de estofados. Uma cliente, Ana, quer limpar dois itens diferentes:

- sofa de 3 lugares, tecido suede, sujeira intensa, com pelos e
  impermeabilizacao;
- poltrona, tecido linho, sujeira leve, sem impermeabilizacao.

Como os itens possuem caracteristicas diferentes, Ana cria duas linhas no
orcamento, nao uma unica linha com quantidade 2.

### 1. Preparacao pelo Admin

O Admin ativa a empresa, publica o perfil e publica a configuracao de limpeza de
estofados. A configuracao publicada fica imutavel; novas mudancas geram outra
versao. Regras e precos usados depois ficam preservados em snapshot.

### 2. Solicitacao publica

Ana acessa `/empresa/limpa-sofa-centro/orcamento`. O frontend cria um rascunho
no servidor. O navegador guarda apenas o token bruto do rascunho; o banco guarda
hash.

Ana preenche os itens, contato e endereco. A API calcula uma estimativa usando o
motor de dominio com valores em centavos. Ao enviar, o frontend manda
`Idempotency-Key`; se Ana clicar duas vezes, a API nao duplica a solicitacao. O
sistema gera codigo publico e token de acompanhamento.

### 3. Revisao pela empresa

A empresa entra em `/app`, ve a solicitacao no dashboard e abre o detalhe. O
status passa pela matriz de estados, por servico de aplicacao. Se o tecnico
ajustar algum campo, precisa registrar motivo quando a alteracao afetar a
estimativa. O sistema recalcula e preserva a memoria de calculo.

### 4. Proposta e horario

Com a solicitacao aceita para proposta, a empresa cria uma proposta. O valor
final inicia no total interno recalculado. Se a empresa alterar para fora da
faixa estimada, precisa justificar. Se o servico exigir horario junto com a
proposta, a empresa cadastra um agendamento antes de enviar.

O envio da proposta tambem usa `Idempotency-Key`. A versao recebe codigo proprio,
por exemplo `ORC-20260804-0001-V1`.

### 5. Acompanhamento publico

Ana abre `/acompanhar/:token`. Ela ve status, proposta, horario e link para PDF.
Se o horario estiver proposto, pode confirmar ou pedir outro horario. Se perder
o link, usa `/recuperar` com codigo + contato; o OTP e enviado pelo adapter de
e-mail configurado.

### 6. PDF e aceite

Ana abre o PDF. A API gera o documento da versao atual sob demanda, contendo
codigo, validade, itens, totais, termos, versoes legais e horario quando houver.
Ao aceitar, a API registra aceite com IP/user agent quando disponiveis e bloqueia
mudancas diretas nessa versao. Se houver mudanca comercial depois, deve existir
nova versao.

### 7. Execucao e avaliacao

Depois do atendimento, a empresa marca o servico como realizado. Isso habilita a
avaliacao publica se a proposta foi aceita, o horario esta confirmado/concluido
e ainda nao existe avaliacao para aquele atendimento. Ana avalia pelo tracking;
a media do perfil publico e recalculada. O Admin pode moderar a avaliacao sem
apagar o historico.

### 8. Area do cliente

Se Ana criar conta em `/cadastro/cliente`, a area `/cliente` mostra historico,
propostas, agendamentos, favoritos, empresas recentes, avaliacoes pendentes e
notificacoes. Solicitacoes feitas antes da conta podem ser vinculadas quando o
e-mail verificado da conta corresponde ao e-mail da solicitacao.

### 9. Metricas

As acoes acima alimentam as metricas internas: solicitacoes recebidas, propostas
enviadas, propostas aceitas, taxa de conversao, valor aceito, tempo medio de
resposta, servicos realizados e avaliacoes. A empresa ve o recorte dela; o Admin
ve recortes globais e pedidos de alteracao de preco.

## Como localizar rapidamente

- Propostas: `packages/shared/src/proposals.ts`,
  `apps/api/src/company/company-proposal-service.ts`,
  `apps/web/src/pages/company-pages.tsx`.
- Agendamentos: `packages/shared/src/appointments.ts`,
  `apps/api/src/company/company-appointment-service.ts`.
- Tracking publico: `apps/api/src/public/public-quote-request-service.ts`,
  `apps/web/src/pages/public-pages.tsx`.
- PDF: `apps/api/src/public/proposal-pdf.ts`.
- Avaliacoes: `packages/shared/src/reviews.ts`,
  `packages/domain/src/service-lifecycle.ts`.
- Area do cliente: `apps/api/src/customer`, `apps/web/src/pages/customer-pages.tsx`.
- Metricas: `apps/api/src/operational`,
  `apps/web/src/pages/company-operational.tsx`,
  `apps/web/src/pages/admin-operational.tsx`.
- Sprint 19 local: `apps/api/src/middleware`, `apps/api/src/maintenance`,
  `apps/api/src/config/production-readiness.ts`, `apps/web/public`,
  `apps/web/src/pwa.ts`.

## Limitacoes importantes

- `EMAIL_PROVIDER=stub`: e-mails nao saem de verdade.
- `FILE_STORAGE_PROVIDER=stub`: upload binario real ainda nao existe.
- PDF e gerado sob demanda, nao armazenado em storage privado.
- Textos legais definitivos seguem pendentes.
- Vidracaria e marmoraria seguem adiadas.
- Deploy, dominio, SSL, monitoramento e backups seguem pendentes.
- Ver lista consolidada em `docs/ITENS_ADIADOS.md`.
