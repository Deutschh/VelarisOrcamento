# Status Atual do Projeto - Velaris Orcamentos

Atualizado em: 2026-08-04.

Este documento descreve o estado atual do projeto para uma pessoa que ja conhece
os arquivos de planejamento em `docs/`, mas ainda nao conhece a implementacao.
Ele nao substitui a fonte principal de verdade, que continua sendo
`docs/ESPECIFICACAO_V1.md`. A ideia aqui e explicar o que ja existe no codigo,
onde cada parte fica e como os fluxos implementados se conectam.

## Leitura recomendada

Antes de alterar funcionalidades, a ordem de leitura recomendada e:

1. `docs/ESPECIFICACAO_V1.md`: fonte principal de verdade do produto.
2. `docs/PLANO_DE_IMPLEMENTACAO.md`: ordem das sprints, estado planejado e
   pendencias por sprint.
3. `docs/TELAS_E_ROTAS.md`: mapa de telas e endpoints previstos/implementados.
4. `docs/ARQUITETURA_INICIAL.md`: decisoes tecnicas e regras arquiteturais.
5. Este documento: fotografia do estado atual do codigo e guia para se localizar
   no repositorio.

## Resumo executivo

O projeto e um monorepo TypeScript com um web app React/Vite e uma API
Express/Node. O banco e PostgreSQL no Neon, acessado somente pelo backend via
Drizzle ORM. O frontend nunca acessa o banco diretamente.

O produto ja possui implementacao tecnica ate a Sprint 18 e adiantamento local da Sprint 19:

- base tecnica do monorepo;
- autenticacao propria;
- cadastro empresarial;
- painel Admin inicial;
- descoberta publica de empresas;
- perfil publico com logo, capa, galeria e dados comerciais configuraveis pelo Admin;
- templates fixos por nicho;
- configuracao por empresa;
- motor de calculo e regras de preco versionadas;
- template completo de limpeza de estofados;
- fluxo publico de solicitacao com rascunho no servidor e feedback visual de anexos;
- painel da empresa para revisar solicitacoes, com UI operacional refinada;
- propostas versionadas;
- agendamento assistido;
- acompanhamento publico por token;
- recuperacao publica por OTP de e-mail via adapter `stub`;
- acoes publicas de horario;
- notificacoes internas iniciais no banco;
- aceite e recusa formal de proposta pelo acompanhamento publico;
- registro auditavel de aceite em `quote_acceptances`;
- PDF publico da proposta gerado por versao no backend.
- status de servico realizado;
- convite de avaliacao por adapter de e-mail `stub`;
- avaliacao publica elegivel pelo acompanhamento;
- exibicao de avaliacoes visiveis no perfil publico;
- recalculo de media/contagem da empresa;
- moderacao Admin de avaliacoes;
- area autenticada do cliente em `/cliente`;
- perfil autenticado do cliente em `/cliente/perfil`;
- favoritos de empresas;
- empresas recentes, historico, avaliacoes pendentes e notificacoes para cliente;
- vinculacao de solicitacoes feitas como visitante a uma conta criada depois;
- metricas operacionais da empresa e do Admin;
- auditoria operacional e solicitacoes de alteracao de preco;
- PWA base com manifest, icones provisorios, service worker de cache restrito e rewrite de SPA para rotas React na Vercel;
- hardening inicial da API com headers de seguranca, `no-store` em `/api`, rate limit e checagem de prontidao;
- rotina de limpeza de rascunhos, chaves de idempotencia e OTPs expirados.

Os principais blocos pendentes apos o adiantamento local da Sprint 19 sao
homologacao publica final, backups, monitoramento, provedor real de e-mail em
producao, armazenamento privado definitivo, textos legais definitivos e validacao
com empresa piloto. O deploy inicial e o dominio possuem preparacao no codigo e
no guia operacional, mas ainda exigem validacao por ambiente.

Sprints 8 e 9, vidracaria e marmoraria, seguem adiadas por decisao de produto
ate a validacao do MVP piloto de limpeza de estofados.

## Legenda de status

- Implementado tecnicamente: existe codigo, contratos, persistencia e testes
  principais para a entrega planejada da sprint.
- Pendente operacional: depende de validacao comercial, fornecedor externo,
  configuracao real ou decisao de negocio.
- Adiado: decisao confirmada de nao implementar agora.
- Nao iniciado: previsto na especificacao, mas ainda sem implementacao.

## Progresso por sprint

| Sprint    | Tema                                      | Status atual                                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sprint 0  | Fechamento funcional e prototipo          | Parcial/documental. As decisoes tecnicas e de produto foram registradas. Wireframes, prototipo navegavel final, textos legais finais e validacao com empresa real seguem pendentes.                                                                                |
| Sprint 1  | Fundacao do projeto                       | Implementado tecnicamente. Monorepo, apps, packages, scripts, qualidade, health check e base de API/web existem.                                                                                                                                                   |
| Sprint 2  | Banco multiempresa e autenticacao         | Implementado tecnicamente. Schema multiempresa, usuarios, empresas, membros, refresh tokens, cadastro/login/logout/refresh/verificacao de e-mail e isolamento empresarial existem. Recuperacao de senha autenticada ainda responde 501 ate escolha de e-mail real. |
| Sprint 3  | Cadastro, ativacao e Admin inicial        | Implementado tecnicamente. Cadastro empresarial, conta pendente, Admin com lista/detalhe, ativacao, suspensao, publicacao, notas internas e auditoria existem.                                                                                                     |
| Sprint 4  | Home, busca e perfil publico              | Implementado tecnicamente. Home, onboarding, busca/listagem, perfil publico por slug e edicao de perfil publico pelo Admin existem, incluindo logo, capa/banner, galeria, contatos, servicos, regioes e termos comerciais.                                          |
| Sprint 5  | Templates fixos e campos configuraveis    | Implementado tecnicamente. Templates, campos, opcoes, condicoes, configuracoes por empresa, preview e publicacao imutavel existem.                                                                                                                                 |
| Sprint 6  | Motor de calculo                          | Implementado tecnicamente. Motor deterministico, regras de preco versionadas, margens, memoria de calculo e simulacao Admin existem.                                                                                                                               |
| Sprint 7  | Template limpeza de estofados             | Implementado tecnicamente. Primeiro nicho esta consolidado em v2, com regras comerciais e simulacao completa. Falta validacao comercial com empresa real.                                                                                                          |
| Sprint 8  | Template vidracaria                       | Adiado. Deve aguardar validacao do MVP piloto.                                                                                                                                                                                                                     |
| Sprint 9  | Template marmoraria                       | Adiado. Deve aguardar validacao do MVP piloto.                                                                                                                                                                                                                     |
| Sprint 10 | Fluxo publico, rascunho e solicitacao     | Implementado tecnicamente. Rascunho seguro no servidor, multiplos itens, arquivos como metadados, contador/feedback de anexos, estimativa, submissao idempotente, codigo e token publico existem.                                                                  |
| Sprint 11 | Painel da empresa e revisao               | Implementado tecnicamente. Dashboard, lista, detalhe, arquivos, memoria de calculo, revisao tecnica, recalculo, aceite para proposta, recusa, historico e refinamento visual operacional existem.                                                                  |
| Sprint 12 | Propostas, versoes e valor final          | Implementado tecnicamente. Propostas versionadas, valor final, validade, termos, preview e envio idempotente existem. O aceite publico formal foi iniciado posteriormente na Sprint 15.                                                                            |
| Sprint 13 | Agendamento assistido                     | Implementado tecnicamente. Agendamentos, historico, modos, timezone, aviso de conflito, cancelamento, reagendamento pela empresa e conclusao existem.                                                                                                              |
| Sprint 14 | Acompanhamento, recuperacao e comunicacao | Implementado tecnicamente. Tracking por token, recuperacao por OTP, `wa.me`, acoes publicas de horario e notificacoes internas iniciais existem. E-mail real segue pendente.                                                                                       |
| Sprint 15 | PDF, aceite e documentos legais           | Implementado tecnicamente. PDF por versao gerado sob demanda no backend, rota publica segura, botao no tracking, aceite/recusa formal, idempotencia, versoes legais iniciais, IP/user agent, bloqueio de expirada, eventos e frontend publico existem.             |
| Sprint 16 | Servico realizado e avaliacoes            | Implementado tecnicamente. Status de servico, marcacao como realizado, convite stub por e-mail, avaliacao publica elegivel, bloqueio de duplicidade, exibicao no perfil, media atualizada e moderacao Admin existem.                                               |
| Sprint 17 | Area do cliente                           | Implementado tecnicamente. Cadastro/entrada de cliente, home `/cliente`, perfil `/cliente/perfil`, edicao de nome/telefone/foto por URL, solicitacoes, propostas, agendamentos, historico, favoritos, empresas recentes, avaliacoes, notificacoes e vinculacao existem. |
| Sprint 18 | Metricas e administracao operacional      | Implementado tecnicamente. Metricas da empresa/Admin, filtros por periodo/nicho/empresa, conversao, tempo de resposta, valores, ranking, auditoria operacional e solicitacoes de alteracao de preco existem.                                                       |
| Sprint 19 | PWA, seguranca, desempenho e deploy       | Adiantado tecnicamente nos itens locais. Manifest, icones provisorios, service worker seguro, headers, rate limit, limpeza de expirados, checagem de prontidao e rewrite SPA da Vercel existem; servicos externos e homologacao seguem pendentes.                 |

## MVP piloto: o que ja esta pronto e o que falta

### Pronto tecnicamente para o piloto

- Admin Velaris basico.
- Cadastro empresarial.
- Status de empresa pendente.
- Ativacao/suspensao/publicacao pelo Admin.
- Perfil publico por link direto.
- Busca publica por categoria e localidade.
- Template de limpeza de estofados.
- Configuracao de campos, opcoes, regras, margens e modo de agendamento.
- Simulador Admin com memoria de calculo.
- Fluxo visitante de solicitacao.
- Rascunho no servidor.
- Multiplos itens por solicitacao.
- Estimativa publica.
- Submissao idempotente.
- Codigo da solicitacao e link de acompanhamento.
- Painel da empresa.
- Revisao tecnica e recalculo.
- Recusa pela empresa.
- Proposta final versionada.
- Envio de proposta idempotente.
- Agendamento assistido.
- Aceite/recusa formal da proposta no acompanhamento publico.
- PDF publico da proposta por versao.
- Servico realizado.
- Avaliacoes publicas elegiveis.
- Media e contagem de avaliacoes no perfil publico.
- Moderacao Admin de avaliacoes.
- Area autenticada do cliente.
- Favoritos.
- Empresas recentes e notificacoes do cliente.
- Vinculacao de solicitacoes de visitante a conta de cliente.
- Recuperacao de acompanhamento por OTP.
- WhatsApp assistido.

### Ainda faltando para fechar melhor o MVP piloto

- Validacao comercial real com uma empresa de limpeza de estofados.
- Textos legais definitivos.
- Armazenamento binario privado para fotos/PDF.
- Provedor real de e-mail.
- Deploy/homologacao/producao.

## Visao geral da arquitetura

O sistema esta organizado como um monorepo:

```txt
apps/
  web/      # React/Vite: telas, rotas e consumo da API
  api/      # Express/Node: HTTP, servicos, repositorios e banco

packages/
  shared/   # contratos, schemas Zod, tipos, enums e constantes
  domain/   # regras puras de negocio e maquinas de estado
  config/   # configuracoes compartilhadas simples do workspace
  ui/       # pacote reservado para UI compartilhada futura

database/
  schemas/      # schema Drizzle fonte para o banco
  migrations/   # migrations Drizzle geradas/revisaveis
  seeds/        # reservado para seeds

tests/
  e2e/          # testes Playwright

docs/           # especificacao, planejamento e documentos auxiliares
ImagesExemplos/ # referencias visuais fornecidas pelo usuario
assets/brand/   # reservado para ativos finais aprovados
```

Fluxo tecnico de uma requisicao:

```txt
Browser
  -> apps/web React/Vite
  -> fetch para /api/*
  -> apps/api Express
  -> router da area
  -> service de aplicacao
  -> package domain para regras puras
  -> repository Drizzle
  -> PostgreSQL Neon
```

Contratos compartilhados em `packages/shared` evitam duplicacao entre frontend e
backend. Regras puras em `packages/domain` evitam que controllers ou telas
atualizem estados ou calculem precos livremente.

## Como o sistema funciona hoje

### 1. Configuracao local

O arquivo versionado `.env.example` mostra as variaveis esperadas, mas nao deve
conter segredos reais. O `.env` local, nao versionado, deve conter pelo menos:

- `DATABASE_URL`;
- `JWT_ACCESS_TOKEN_SECRET`;
- `JWT_REFRESH_TOKEN_SECRET`;
- variaveis `ADMIN_*` quando for criar o primeiro Admin.

Se `DATABASE_URL` ou `JWT_ACCESS_TOKEN_SECRET` estiverem ausentes, a API sobe
com rotas indisponiveis para os fluxos que dependem de autenticacao/banco. Isso
e intencional para evitar acesso parcial mal configurado.

### 2. Primeiro Admin

O script `npm run admin:create` executa
`apps/api/src/scripts/create-admin.ts`. Ele le `ADMIN_NAME`, `ADMIN_EMAIL` e
`ADMIN_PASSWORD` do `.env` local, gera hash Argon2id e cria um usuario com papel
`admin` se ainda nao existir.

### 3. Cadastro empresarial

O visitante acessa `/cadastro/empresa`, implementado em
`apps/web/src/pages/auth-pages.tsx`. O frontend chama
`POST /api/auth/register/company`, definido em `apps/api/src/auth/auth-router.ts`.

O backend usa:

- `apps/api/src/auth/auth-service.ts`: regra de cadastro/login/sessao;
- `apps/api/src/auth/password.ts`: hash Argon2id;
- `apps/api/src/auth/token-service.ts`: access/refresh tokens;
- `apps/api/src/auth/auth-cookies.ts`: cookies;
- `apps/api/src/auth/drizzle-auth-repository.ts`: persistencia.

A empresa nasce com status pendente. Enquanto pendente, a area `/app` mostra o
painel de status pendente em `CompanyPendingPanel`, dentro de
`apps/web/src/pages/company-pages.tsx`.

### 4. Ativacao e preparacao pelo Admin

O Admin acessa `/admin`, implementado em `apps/web/src/pages/admin-pages.tsx`.
As rotas Admin ficam em `apps/api/src/admin/admin-router.ts`.

O Admin pode:

- listar empresas;
- abrir detalhe de empresa;
- ativar/suspender;
- publicar/despublicar perfil;
- editar perfil publico;
- adicionar notas internas;
- ver auditoria;
- criar configuracao de template;
- ajustar campos/opcoes/regras permitidas;
- simular;
- publicar configuracao.

Arquivos principais:

- `apps/api/src/admin/admin-service.ts`: regras de administracao de empresa;
- `apps/api/src/admin/admin-repository.ts`: contrato de persistencia Admin;
- `apps/api/src/admin/drizzle-admin-repository.ts`: consultas Drizzle;
- `apps/api/src/templates/template-service.ts`: configuracoes/templates;
- `apps/api/src/templates/template-repository.ts`: contrato de templates;
- `apps/api/src/templates/drizzle-template-repository.ts`: persistencia;
- `packages/domain/src/company-lifecycle.ts`: transicoes de empresa/perfil;
- `packages/domain/src/configuration-lifecycle.ts`: regras de rascunho/publicacao
  e condicoes de campos.

### 5. Descoberta publica

As telas publicas estao em `apps/web/src/pages/public-pages.tsx`.

Rotas atuais:

- `/`: Home;
- `/onboarding`: onboarding;
- `/empresas`: busca/listagem;
- `/empresa/:slug`: perfil publico;
- `/empresa/:slug/orcamento`: solicitacao publica;
- `/acompanhar/:token`: acompanhamento;
- `/recuperar`: recuperacao.

O backend publico fica em `apps/api/src/public/public-router.ts`.

Descoberta e perfil usam:

- `apps/api/src/public/public-service.ts`: lista categorias, empresas e perfil;
- `apps/api/src/public/public-profile.ts`: defaults e labels de categoria;
- `apps/api/src/public/public-repository.ts`: contrato;
- `apps/api/src/public/drizzle-public-company-repository.ts`: consultas;
- `packages/domain/src/geo.ts`: calculo de distancia.

Somente empresas ativas e com perfil publicado aparecem publicamente.

### 6. Solicitacao publica de orcamento

O fluxo `/empresa/:slug/orcamento` cria um rascunho no servidor. O cliente nao
precisa ter conta para enviar a solicitacao.

Componentes principais:

- `QuoteRequestPage`: orquestra o fluxo publico;
- `QuoteItemEditor`: edicao de item tecnico;
- `createQuoteDraftItem`: cria linhas de item.

Arquivos principais:

- `apps/web/src/pages/public-pages.tsx`: tela e interacoes;
- `apps/web/src/lib/quote-form-options.ts`: opcoes de fallback de limpeza;
- `packages/shared/src/quote-requests.ts`: schema do rascunho, itens, endereco,
  acesso, contato, arquivos, estimativa, tracking e recuperacao;
- `apps/api/src/public/public-quote-request-service.ts`: regras de rascunho,
  estimativa, submissao, tracking e recuperacao;
- `apps/api/src/public/quote-request-repository.ts`: contrato do fluxo de
  solicitacao;
- `apps/api/src/public/drizzle-quote-request-repository.ts`: persistencia;
- `apps/api/src/quote-requests/quote-request-calculation.ts`: adaptacao entre
  rascunho e motor de calculo;
- `packages/domain/src/quote-request-calculation.ts`: calculo agrupado por
  itens;
- `packages/domain/src/idempotency.ts`: validacao de chave idempotente.

O rascunho salva o token bruto apenas no navegador. O banco guarda hash do token.
Na submissao, o backend exige `Idempotency-Key` UUID v4, gera codigo da
solicitacao, gera token publico para acompanhamento e persiste snapshots de
configuracao, calculo e aceite legal.

Quantidade representa itens identicos. Se dois sofas tiverem sujeira, tecido,
impermeabilizacao ou observacoes diferentes, devem ser cadastrados como linhas
separadas.

### 7. Painel da empresa

O painel `/app` fica em `apps/web/src/pages/company-pages.tsx`.

Componentes principais:

- `CompanyAreaPage`: escolhe entre painel pendente e painel ativo;
- `CompanyQuoteRequestsPanel`: dashboard/lista/detalhe;
- `CompanyDashboardGrid`: indicadores;
- `CompanyQuoteRequestList`: lista de solicitacoes;
- `CompanyQuoteRequestDetailPanel`: detalhe selecionado;
- `CompanyQuoteRequestDetailView`: revisao tecnica;
- `CompanyReviewItemEditor`: edicao de campos tecnicos;
- `CompanyFilesPanel`: arquivos/metadados;
- `CompanyEstimatePanel`: memoria de calculo;
- `CompanyRevisionTimeline`: historico;
- `CompanyProposalPanel`: proposta;
- `CompanyAppointmentPanel`: agendamento.

Endpoints da empresa ficam em `apps/api/src/company/company-router.ts`.

Servicos principais:

- `CompanyAccountService`: dados/status da conta empresarial;
- `CompanyQuoteRequestService`: lista, detalhe, revisao, aceite para proposta e
  recusa;
- `CompanyProposalService`: criacao e envio de propostas;
- `CompanyAppointmentService`: proposta/cancelamento/reagendamento/conclusao de
  horarios.

Repositorios Drizzle:

- `drizzle-company-account-repository.ts`;
- `drizzle-company-quote-request-repository.ts`;
- `drizzle-company-proposal-repository.ts`;
- `drizzle-company-appointment-repository.ts`.

Cada operacao empresarial busca a empresa ativa pelo usuario autenticado e
trabalha com `companyId` derivado do vinculo empresarial. O sistema nao deve
confiar somente no ID recebido pela rota.

### 8. Revisao tecnica pela empresa

Depois que uma solicitacao e submetida, a empresa pode abrir revisao, alterar
campos tecnicos, informar motivo quando houver mudanca e recalcular.

Arquivos relacionados:

- `packages/domain/src/quote-request-lifecycle.ts`: transicoes de solicitacao;
- `apps/api/src/company/company-quote-request-service.ts`: revisao e transicao;
- `database/schemas/index.ts`: tabelas `quote_request_answer_revisions` e
  `quote_request_events`;
- `apps/web/src/pages/company-pages.tsx`: formulario de revisao.

O recalculo preserva historico e impacto financeiro. A memoria de calculo fica
armazenada em snapshot para permitir explicacao posterior.

O status `awaiting_information` esta definido no modelo, mas o fluxo publico
para complemento de informacoes ainda nao foi entregue.

### 9. Propostas versionadas

A empresa cria proposta somente depois que a solicitacao entra em
`accepted_for_proposal`.

Arquivos principais:

- `packages/shared/src/proposals.ts`: contratos e schemas de proposta;
- `packages/domain/src/proposal-lifecycle.ts`: regras puras de valor final,
  validade e transicao;
- `apps/api/src/company/company-proposal-service.ts`: cria versao e envia;
- `apps/api/src/company/company-proposal-repository.ts`: contrato;
- `apps/api/src/company/drizzle-company-proposal-repository.ts`: persistencia;
- `apps/web/src/pages/company-pages.tsx`: `CompanyProposalPanel`.

Tabelas:

- `quotes`: container da proposta por solicitacao;
- `quote_versions`: versoes comerciais;
- `quote_version_items`: itens da versao;
- `quote_version_events`: auditoria/eventos.

O envio exige `Idempotency-Key`. Propostas aceitas devem ser imutaveis, mas o
aceite publico formal, a recusa publica e o PDF por versao foram implementados
na Sprint 15. A empresa consegue criar/enviar proposta e o publico consegue ver
detalhe, PDF, aceite e recusa no tracking.

### 10. Agendamento assistido

O agendamento fica ligado a proposta e solicitacao, mas possui tabelas e
transicoes proprias.

Arquivos principais:

- `packages/shared/src/appointments.ts`: contratos de agendamento;
- `packages/domain/src/appointment-lifecycle.ts`: transicoes, validade de
  horario e regras por modo;
- `apps/api/src/company/company-appointment-service.ts`: fluxo da empresa e
  acoes publicas de cliente;
- `apps/api/src/company/company-appointment-repository.ts`: contrato;
- `apps/api/src/company/drizzle-company-appointment-repository.ts`: persistencia;
- `apps/web/src/pages/company-pages.tsx`: `CompanyAppointmentPanel`;
- `apps/web/src/pages/public-pages.tsx`: `PublicAppointmentPanel`.

Modos suportados:

- `required_with_proposal`;
- `optional_with_proposal`;
- `after_proposal_acceptance`;
- `external_only`.

Quando o servico exige horario com a proposta, o envio da proposta fica bloqueado
ate existir horario ativo. Conflitos de agenda retornam aviso por sobreposicao de
horario da mesma empresa, mas nao bloqueiam.

O cliente publico pode confirmar horario ou pedir outro horario pela tela de
acompanhamento. A empresa pode propor novo horario quando houver pedido de
reagendamento.

### 11. Servico realizado e avaliacoes

A Sprint 16 adicionou um status de servico separado do status do agendamento.
Quando a empresa conclui um horario confirmado, o agendamento passa para
`completed` e o servico passa para `service_realized`. Essa transicao fica em
regra pura de dominio e e chamada pelo servico de aplicacao, nao por update livre
em rota/controller.

Arquivos principais:

- `packages/domain/src/service-lifecycle.ts`: estados do servico e elegibilidade
  de avaliacao;
- `packages/shared/src/reviews.ts`: contratos de avaliacao, status de servico e
  moderacao;
- `apps/api/src/company/company-appointment-service.ts`: marca atendimento como
  realizado e dispara convite via adapter de e-mail `stub`;
- `apps/api/src/public/public-quote-request-service.ts`: cria avaliacao publica
  elegivel e idempotente;
- `apps/api/src/admin/admin-service.ts`: moderacao de avaliacoes;
- `apps/web/src/pages/public-pages.tsx`: painel de avaliacao no tracking e
  exibicao no perfil publico;
- `apps/web/src/pages/admin-pages.tsx`: painel Admin de moderacao.

Tabelas/campos:

- `appointments.service_status`: status operacional do servico;
- `reviews`: avaliacao vinculada a empresa, solicitacao, proposta, versao e
  agendamento.

Uma avaliacao publica exige proposta aceita, horario confirmado/concluido,
servico realizado e ausencia de avaliacao anterior para o mesmo agendamento. A
criacao exige `Idempotency-Key`. Avaliacoes visiveis atualizam
`company_public_profiles.review_average` e `review_count`; o Admin pode ocultar,
restaurar, marcar como suspeita ou limpar suspeita.

### 12. Acompanhamento publico e recuperacao

O token publico e gerado na submissao. A tela `/acompanhar/:token` mostra:

- codigo da solicitacao;
- status atual;
- dados da empresa;
- servico;
- estimativa;
- proposta mais recente em resumo;
- agendamentos;
- link `wa.me` quando houver WhatsApp no perfil publico.

Arquivos principais:

- `apps/web/src/pages/public-pages.tsx`: `PublicTrackingPage`,
  `PublicProposalPanel`, `PublicAppointmentPanel` e `PublicRecoveryPage`;
- `packages/shared/src/quote-requests.ts`: contratos de tracking/recuperacao;
- `apps/api/src/public/public-quote-request-service.ts`: tracking, OTP e troca
  de token;
- `database/schemas/index.ts`: `public_access_tokens`, `recovery_codes` e
  `notifications`.

Recuperacao:

1. Cliente informa codigo da solicitacao e e-mail ou WhatsApp.
2. Backend valida se o contato pertence a solicitacao.
3. OTP e enviado exclusivamente ao e-mail cadastrado, via adapter de e-mail.
4. Backend grava hash do token de recuperacao e hash do OTP.
5. Cliente informa OTP.
6. Backend revoga/substitui token publico e devolve novo caminho de
   acompanhamento.

No ambiente atual, o adapter de e-mail e `stub`; ele registra log, mas nao envia
e-mail real.

### 13. Notificacoes e area do cliente

A Sprint 14 criou a tabela `notifications` e o backend registra notificacoes
para nova solicitacao e acoes publicas de horario. A Sprint 16 adicionou
notificacao de avaliacao recebida e a Sprint 17 passou a exibir notificacoes do
cliente na home autenticada `/cliente`.

A area do cliente usa:

- `apps/web/src/pages/customer-pages.tsx`: home personalizada e perfil do cliente;
- `apps/api/src/customer/customer-router.ts`: endpoints protegidos do cliente;
- `apps/api/src/customer/customer-service.ts`: regras de acesso, vinculo de
  visitante, favoritos e perfil editavel;
- `apps/api/src/customer/drizzle-customer-repository.ts`: consultas do dashboard
  e persistencia de favoritos/perfil;
- `packages/shared/src/customer.ts`: contratos compartilhados da area do cliente;
- `database/schemas/index.ts`: tabelas/colunas `customer_favorite_companies` e
  `customer_profiles.avatar_url`, com relacoes a usuarios, empresas,
  solicitacoes, propostas, agendamentos e notificacoes.

O dashboard retorna solicitacoes, propostas publicas aguardando confirmacao,
proximos agendamentos, historico, favoritos, empresas recentes, avaliacoes
pendentes e notificacoes. A tela `/cliente/perfil` permite editar nome,
telefone e foto por URL. A acao de vincular busca solicitacoes de visitante sem
`customer_id`, ja submetidas, cujo e-mail corresponde ao e-mail verificado da
conta autenticada. Vinculo por telefone fica pendente ate existir verificacao de
telefone.

## Mapa de arquivos por area

### Raiz do repositorio

| Caminho                | Funcao                                                     |
| ---------------------- | ---------------------------------------------------------- |
| `AGENTS.md`            | Instrucoes permanentes para agentes no projeto.            |
| `README.md`            | Resumo geral, scripts e estado atual resumido.             |
| `package.json`         | Workspaces npm, scripts raiz e devDependencies principais. |
| `package-lock.json`    | Lockfile npm.                                              |
| `.env.example`         | Variaveis esperadas sem valores secretos.                  |
| `tsconfig.json`        | Entrada TypeScript do monorepo.                            |
| `tsconfig.base.json`   | Base compartilhada TypeScript.                             |
| `eslint.config.js`     | Configuracao ESLint.                                       |
| `prettier.config.js`   | Configuracao Prettier.                                     |
| `playwright.config.ts` | Configuracao E2E.                                          |
| `drizzle.config.ts`    | Configuracao Drizzle Kit para migrations.                  |
| `vercel.json`          | Build do frontend na Vercel e rewrite SPA para rotas React. |

### Frontend: `apps/web`

| Caminho                                     | Funcao                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/main.tsx`                     | Inicializa React, QueryClient e BrowserRouter.                                                                             |
| `apps/web/src/App.tsx`                      | Declara as rotas da aplicacao.                                                                                             |
| `apps/web/src/styles.css`                   | Tailwind e estilos globais.                                                                                                |
| `apps/web/src/pages/public-pages.tsx`       | Home, onboarding, busca, perfil publico, solicitacao, contador/feedback de anexos, acompanhamento, recuperacao, avaliacao e favoritar empresa. |
| `apps/web/src/pages/auth-pages.tsx`         | Login, escolha de cadastro, cadastro de cliente e cadastro empresarial.                                                    |
| `apps/web/src/pages/customer-pages.tsx`     | Area do cliente: dashboard, perfil, solicitacoes, propostas, agendamentos, historico, favoritos, empresas recentes e notificacoes. |
| `apps/web/src/pages/company-pages.tsx`      | Area da empresa: pendente, dashboard operacional, solicitacoes, revisao tecnica, proposta, agendamento e refinamento visual do fluxo de atendimento. |
| `apps/web/src/pages/admin-pages.tsx`        | Area Admin: empresas, detalhe, perfil publico completo, templates, configuracao, simulacao, publicacao e moderacao de avaliacoes. |
| `apps/web/src/components/ui.tsx`            | Shell, titulos, campos, botoes, timeline, loading e erros comuns.                                                          |
| `apps/web/src/components/form-controls.tsx` | Select e checkbox reutilizaveis.                                                                                           |
| `apps/web/src/components/status-badges.tsx` | Labels e badges para status de empresa, perfil, solicitacao, proposta e agendamento.                                       |
| `apps/web/src/lib/api.ts`                   | Wrapper `apiRequest`, `ApiError` e mensagens padronizadas de erro.                                                         |
| `apps/web/src/lib/formatters.ts`            | Formatacao de dinheiro, datas, horarios, arquivos, enderecos e helpers de proposta/agendamento.                            |
| `apps/web/src/lib/quote-form-options.ts`    | Opcoes de fallback e helpers do formulario de limpeza de estofados.                                                        |
| `apps/web/vite.config.ts`                   | Vite, aliases para packages e proxy `/api` para a API local.                                                               |
| `apps/web/tailwind.config.js`               | Configuracao Tailwind.                                                                                                     |

Observacao: depois da refatoracao recente, `App.tsx` deixou de concentrar a
interface inteira. As telas agora estao separadas por area em `pages/`.

### Backend: nucleo da API

| Caminho                                        | Funcao                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/main.ts`                         | Sobe o servidor HTTP.                                                                                                           |
| `apps/api/src/server.ts`                       | Cria o app Express, middlewares e monta routers.                                                                                |
| `apps/api/src/runtime-dependencies.ts`         | Monta servicos e repositorios reais a partir do `.env`.                                                                         |
| `apps/api/src/config/env.ts`                   | Valida variaveis via schema compartilhado.                                                                                      |
| `apps/api/src/config/load-env.ts`              | Carrega `.env` local.                                                                                                           |
| `apps/api/src/db/client.ts`                    | Cria cliente Drizzle/pg.                                                                                                        |
| `apps/api/src/lib/app-error.ts`                | Erro padronizado da aplicacao.                                                                                                  |
| `apps/api/src/lib/async-handler.ts`            | Wrapper para handlers async do Express.                                                                                         |
| `apps/api/src/lib/logger.ts`                   | Logger Pino.                                                                                                                    |
| `apps/api/src/middleware/authenticate.ts`      | Valida access token por header Bearer ou cookie.                                                                                |
| `apps/api/src/middleware/authorize-admin.ts`   | Exige papel Admin.                                                                                                              |
| `apps/api/src/middleware/authorize-company.ts` | Middleware de autorizacao por empresa; existe e tem teste, embora fluxos atuais da empresa validem principalmente nos servicos. |
| `apps/api/src/middleware/error-handler.ts`     | Tratamento global e resposta padronizada de erros.                                                                              |
| `apps/api/src/routes/health.ts`                | Health/readiness.                                                                                                               |

### Backend: autenticacao

| Caminho                                        | Funcao                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/api/src/auth/auth-router.ts`             | Endpoints de cadastro, login, refresh, logout e verificacao de e-mail. |
| `apps/api/src/auth/auth-service.ts`            | Regra de autenticacao, cadastro de cliente/empresa, login e sessao.    |
| `apps/api/src/auth/auth-repository.ts`         | Interface de persistencia da autenticacao.                             |
| `apps/api/src/auth/drizzle-auth-repository.ts` | Persistencia real com Drizzle.                                         |
| `apps/api/src/auth/password.ts`                | Hash/verificacao Argon2id.                                             |
| `apps/api/src/auth/token-service.ts`           | JWT, refresh token, hash de tokens.                                    |
| `apps/api/src/auth/auth-cookies.ts`            | Cookies de access/refresh token.                                       |
| `apps/api/src/auth/auth-dependencies.ts`       | Fabrica de AuthService e TokenService.                                 |
| `apps/api/src/auth/unavailable-auth-router.ts` | Respostas quando auth nao esta configurada.                            |
| `apps/api/src/auth/auth-errors.ts`             | Erros especificos de auth.                                             |

### Backend: Admin e templates

| Caminho                                                 | Funcao                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/api/src/admin/admin-router.ts`                    | Endpoints Admin.                                                                             |
| `apps/api/src/admin/admin-service.ts`                   | Ativacao, suspensao, publicacao, perfil publico, notas, auditoria e moderacao de avaliacoes. |
| `apps/api/src/admin/admin-repository.ts`                | Interface de persistencia Admin.                                                             |
| `apps/api/src/admin/drizzle-admin-repository.ts`        | Consultas Drizzle para Admin.                                                                |
| `apps/api/src/templates/template-service.ts`            | Templates, configuracao por empresa, simulacao e publicacao.                                 |
| `apps/api/src/templates/template-repository.ts`         | Interface de persistencia de templates/configuracoes.                                        |
| `apps/api/src/templates/drizzle-template-repository.ts` | Persistencia Drizzle de templates, configuracoes e regras de preco.                          |
| `apps/api/src/templates/template-errors.ts`             | Erros de templates/configuracao.                                                             |

### Backend: area publica

| Caminho                                                    | Funcao                                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/public/public-router.ts`                     | Endpoints publicos de descoberta, rascunho, tracking, recuperacao e avaliacao.                                                      |
| `apps/api/src/public/public-service.ts`                    | Busca/listagem/perfil publico de empresas, incluindo avaliacoes visiveis.                                                           |
| `apps/api/src/public/public-profile.ts`                    | Defaults de perfil publico e labels de categoria.                                                                                   |
| `apps/api/src/public/public-repository.ts`                 | Interface de persistencia da descoberta publica.                                                                                    |
| `apps/api/src/public/drizzle-public-company-repository.ts` | Consultas de empresas publicadas e avaliacoes visiveis.                                                                             |
| `apps/api/src/public/public-quote-request-service.ts`      | Rascunho, estimativa, submissao, acompanhamento, recuperacao, acoes publicas de horario e avaliacao.                                |
| `apps/api/src/public/quote-request-repository.ts`          | Interface de persistencia para solicitacoes publicas.                                                                               |
| `apps/api/src/public/drizzle-quote-request-repository.ts`  | Persistencia real de rascunhos, solicitacoes, tokens, calculos, recuperacao, propostas publicas, aceite, avaliacoes e notificacoes. |
| `apps/api/src/public/proposal-pdf.ts`                      | Geracao sob demanda do PDF publico por versao da proposta.                                                                          |
| `apps/api/src/public/public-errors.ts`                     | Erros publicos.                                                                                                                     |
| `apps/api/src/public/unavailable-public-router.ts`         | Resposta quando public quote requests nao estao configuradas.                                                                       |

### Backend: cliente

| Caminho                                                | Funcao                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `apps/api/src/customer/customer-router.ts`             | Endpoints protegidos da area do cliente.                                                |
| `apps/api/src/customer/customer-service.ts`            | Dashboard, perfil editavel, vinculo de solicitacoes de visitante e favoritos.           |
| `apps/api/src/customer/customer-repository.ts`         | Interface de persistencia da area do cliente.                                           |
| `apps/api/src/customer/drizzle-customer-repository.ts` | Consultas Drizzle para solicitacoes, propostas, agendamentos, perfil, favoritos e notificacoes. |
| `apps/api/src/customer/customer-errors.ts`             | Erros especificos da area do cliente.                                                   |
| `apps/api/src/test/in-memory-customer-repository.ts`   | Repositorio em memoria para testes do servico de cliente.                               |

### Backend: empresa, propostas e agendamentos

| Caminho                                                            | Funcao                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `apps/api/src/company/company-router.ts`                           | Endpoints autenticados da empresa.                                                                  |
| `apps/api/src/company/company-account-service.ts`                  | Status da conta empresarial.                                                                        |
| `apps/api/src/company/company-account-repository.ts`               | Interface da conta empresarial.                                                                     |
| `apps/api/src/company/drizzle-company-account-repository.ts`       | Persistencia da conta empresarial.                                                                  |
| `apps/api/src/company/company-quote-request-service.ts`            | Dashboard, lista, detalhe, revisao, aceite para proposta e recusa.                                  |
| `apps/api/src/company/company-quote-request-repository.ts`         | Interface de solicitacoes da empresa.                                                               |
| `apps/api/src/company/drizzle-company-quote-request-repository.ts` | Persistencia de solicitacoes, revisoes, eventos e calculos.                                         |
| `apps/api/src/company/company-proposal-service.ts`                 | Criacao/envio de proposta versionada.                                                               |
| `apps/api/src/company/company-proposal-repository.ts`              | Interface de propostas.                                                                             |
| `apps/api/src/company/drizzle-company-proposal-repository.ts`      | Persistencia de propostas, versoes, itens e idempotencia.                                           |
| `apps/api/src/company/company-appointment-service.ts`              | Agendamento, cancelamento, reagendamento, conclusao, servico realizado e acoes publicas de cliente. |
| `apps/api/src/company/company-appointment-repository.ts`           | Interface de agendamento.                                                                           |
| `apps/api/src/company/drizzle-company-appointment-repository.ts`   | Persistencia de agendamento e historico.                                                            |
| `apps/api/src/company/*-errors.ts`                                 | Erros especificos por modulo.                                                                       |

### Backend: calculo e notificacoes

| Caminho                                                    | Funcao                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/api/src/quote-requests/quote-request-calculation.ts` | Converte dados do rascunho/revisao para o motor de dominio e cria resumo por item.                        |
| `apps/api/src/notifications/email-adapter.ts`              | Interface de e-mail e adapter `stub` para verificacao, ativacao, confirmacao, OTP e convite de avaliacao. |

### Packages compartilhados

| Caminho                                 | Funcao                                                              |
| --------------------------------------- | ------------------------------------------------------------------- |
| `packages/shared/src/index.ts`          | Exporta todos os contratos compartilhados.                          |
| `packages/shared/src/auth.ts`           | Schemas/tipos de usuario, empresa, login, cadastro e refresh.       |
| `packages/shared/src/admin.ts`          | Contratos Admin.                                                    |
| `packages/shared/src/company.ts`        | Status da conta empresarial.                                        |
| `packages/shared/src/customer.ts`       | Contratos da area autenticada do cliente, perfil e favoritos.       |
| `packages/shared/src/public.ts`         | Categorias, busca e perfil publico.                                 |
| `packages/shared/src/templates.ts`      | Templates, campos, opcoes, configuracoes e simulacao.               |
| `packages/shared/src/pricing.ts`        | Regras de preco, medidas, calculo e snapshots.                      |
| `packages/shared/src/quote-requests.ts` | Rascunho, solicitacao, estimativa, tracking, revisao e recuperacao. |
| `packages/shared/src/proposals.ts`      | Propostas, versoes, itens e eventos.                                |
| `packages/shared/src/appointments.ts`   | Agendamentos e acoes de empresa/cliente.                            |
| `packages/shared/src/reviews.ts`        | Status de servico, avaliacoes publicas e moderacao Admin.           |
| `packages/shared/src/constants.ts`      | Defaults e headers compartilhados.                                  |
| `packages/shared/src/env.ts`            | Schema das variaveis de ambiente.                                   |
| `packages/shared/src/contracts.ts`      | Contratos de health/readiness.                                      |

### Regras puras de dominio

| Caminho                                            | Funcao                                                     |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `packages/domain/src/company-lifecycle.ts`         | Ativacao/suspensao/publicacao de empresa.                  |
| `packages/domain/src/configuration-lifecycle.ts`   | Rascunho publicado/imutavel e condicoes de campos.         |
| `packages/domain/src/calculation-engine.ts`        | Motor deterministico de calculo.                           |
| `packages/domain/src/quote-request-calculation.ts` | Calculo agregado por itens de solicitacao.                 |
| `packages/domain/src/quote-request-lifecycle.ts`   | Estados e transicoes de solicitacao.                       |
| `packages/domain/src/proposal-lifecycle.ts`        | Estados de proposta, validade e valor final.               |
| `packages/domain/src/appointment-lifecycle.ts`     | Estados, modos e restricoes de agendamento.                |
| `packages/domain/src/service-lifecycle.ts`         | Estados de servico realizado e elegibilidade de avaliacao. |
| `packages/domain/src/money.ts`                     | Conversao e formatacao segura de dinheiro em centavos.     |
| `packages/domain/src/measurements.ts`              | Normalizacao de medidas.                                   |
| `packages/domain/src/geo.ts`                       | Distancia e raio de atendimento.                           |
| `packages/domain/src/idempotency.ts`               | Validacao de UUID para idempotencia.                       |
| `packages/domain/src/timezone.ts`                  | Timezone padrao e validacao.                               |

### Banco de dados

| Caminho                                  | Funcao                            |
| ---------------------------------------- | --------------------------------- |
| `database/schemas/index.ts`              | Fonte Drizzle do schema atual.    |
| `database/migrations/*.sql`              | Migrations revisaveis ja geradas. |
| `database/migrations/meta/_journal.json` | Diario Drizzle das migrations.    |
| `database/seeds/`                        | Reservado para seeds futuros.     |

Grupos de tabelas atuais:

- usuarios/autenticacao: `users`, `refresh_tokens`,
  `email_verification_tokens`, `password_reset_tokens`;
- multiempresa: `companies`, `company_members`, `plans`,
  `company_subscriptions`;
- Admin/auditoria: `company_internal_notes`, `audit_logs`;
- legal: `legal_document_versions`, `legal_acceptances`;
- perfil publico: `company_public_profiles`;
- templates/configuracao: `niche_templates`, `template_services`,
  `template_fields`, `template_field_options`, `company_configurations`,
  `company_services`, `company_service_fields`, `company_field_options`;
- precificacao: `template_pricing_rules`, `company_pricing_versions`,
  `company_pricing_rules`;
- solicitacoes: `quote_requests`, `quote_request_answers`,
  `quote_request_files`, `quote_request_calculations`,
  `public_access_tokens`, `idempotency_keys`;
- revisao: `quote_request_answer_revisions`, `quote_request_events`;
- propostas: `quotes`, `quote_versions`, `quote_version_items`,
  `quote_version_events`;
- agendamentos e servico: `appointments`, `appointment_history`;
- avaliacoes: `reviews`;
- comunicacao: `recovery_codes`, `notifications`.

Resumo das migrations:

| Migration                             | Conteudo principal                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `0000_nosy_taskmaster.sql`            | Base multiempresa, auth, legal e auditoria.                                  |
| `0001_awesome_grim_reaper.sql`        | Notas internas e timestamps de publicacao de perfil.                         |
| `0002_cute_puppet_master.sql`         | Perfil publico da empresa.                                                   |
| `0003_yummy_gravity.sql`              | Templates, campos, opcoes e configuracoes por empresa.                       |
| `0004_rapid_polaris.sql`              | Regras e versoes de precificacao.                                            |
| `0005_complete_cleaning_template.sql` | Consolidacao tecnica do template de limpeza de estofados.                    |
| `0006_swift_cobalt_man.sql`           | Solicitacoes publicas, rascunhos, arquivos, calculos, tokens e idempotencia. |
| `0007_abandoned_bishop.sql`           | Estados completos de solicitacao, revisoes e eventos.                        |
| `0008_classy_millenium_guard.sql`     | Propostas, versoes, itens e eventos.                                         |
| `0009_white_wilson_fisk.sql`          | Agendamentos e historico.                                                    |
| `0010_overjoyed_storm.sql`            | Recuperacao publica e notificacoes internas.                                 |
| `0011_skinny_namor.sql`               | Aceite formal, recusa formal e documentos legais iniciais de proposta.       |
| `0012_stiff_prima.sql`                | Status de servico e avaliacoes.                                              |
| `0013_needy_frightful_four.sql`       | Favoritos de empresas por cliente.                                           |
| `0016_customer_profile_avatar.sql`    | URL de avatar no perfil do cliente.                                          |

### Testes

| Caminho                         | Funcao                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/domain/src/*.test.ts` | Testes unitarios de dominio: dinheiro, geo, calculo, ciclos de vida, propostas e agendamentos.  |
| `apps/api/src/**/*.test.ts`     | Testes de servicos, routers, autorizacao e fluxos API usando repositorios em memoria/Supertest. |
| `apps/api/src/test/*`           | Repositorios em memoria para testes da API.                                                     |
| `tests/e2e/sprint4.spec.ts`     | E2E Playwright basico de home, cadastro e admin.                                                |

Atencao: ainda nao existem testes E2E completos cobrindo Sprints 10 a 17 de ponta
a ponta no navegador. A cobertura principal dessas sprints esta em testes de
dominio/API.

## Endpoints implementados por area

### Publico

- `GET /api/public/categories`
- `GET /api/public/companies`
- `GET /api/public/companies/:slug`
- `GET /api/public/companies/:slug/services`
- `POST /api/public/quote-requests/drafts`
- `GET /api/public/quote-requests/drafts/:draftToken`
- `PATCH /api/public/quote-requests/drafts/:draftToken`
- `POST /api/public/quote-requests/drafts/:draftToken/files`
- `DELETE /api/public/quote-requests/drafts/:draftToken/files/:fileId`
- `POST /api/public/quote-requests/drafts/:draftToken/estimate`
- `POST /api/public/quote-requests/drafts/:draftToken/submit`
- `GET /api/public/tracking/:token`
- `GET /api/public/tracking/:token/proposal`
- `GET /api/public/tracking/:token/proposal/pdf`
- `POST /api/public/tracking/:token/proposal/accept`
- `POST /api/public/tracking/:token/proposal/reject`
- `POST /api/public/tracking/:token/appointment`
- `POST /api/public/reviews`
- `POST /api/public/recovery/request`
- `POST /api/public/recovery/verify`

### Autenticacao

- `POST /api/auth/register/customer`
- `POST /api/auth/register/company`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password` responde 501 ate provedor de e-mail.
- `POST /api/auth/reset-password` responde 501 ate provedor de e-mail.

### Cliente

- `GET /api/customer/me`
- `GET /api/customer/profile`
- `PATCH /api/customer/profile`
- `POST /api/customer/link-visitor-requests`
- `POST /api/customer/favorites`
- `DELETE /api/customer/favorites/:companyId`

### Empresa

- `GET /api/company/me`
- `GET /api/company/dashboard`
- `GET /api/company/quote-requests`
- `GET /api/company/quote-requests/:quoteRequestId`
- `PATCH /api/company/quote-requests/:quoteRequestId/review`
- `POST /api/company/quote-requests/:quoteRequestId/decline`
- `POST /api/company/quote-requests/:quoteRequestId/proposals`
- `POST /api/company/proposals/:quoteId/send`
- `POST /api/company/proposals/:quoteId/appointment`
- `PATCH /api/company/appointments/:appointmentId`
- `POST /api/company/appointments/:appointmentId/complete`

### Admin

- `GET /api/admin/companies`
- `GET /api/admin/companies/:companyId`
- `POST /api/admin/companies/:companyId/activate`
- `POST /api/admin/companies/:companyId/suspend`
- `POST /api/admin/companies/:companyId/publish`
- `PATCH /api/admin/companies/:companyId/profile`
- `POST /api/admin/companies/:companyId/notes`
- `GET /api/admin/niche-templates`
- `POST /api/admin/company-configurations`
- `PATCH /api/admin/company-configurations/:configurationId`
- `POST /api/admin/company-configurations/:configurationId/simulate`
- `POST /api/admin/company-configurations/:configurationId/publish`
- `PATCH /api/admin/reviews/:reviewId/moderation`

## Telas implementadas

| Rota                         | Arquivo                                 | Status        |
| ---------------------------- | --------------------------------------- | ------------- |
| `/`                          | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/onboarding`                | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/empresas`                  | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/empresa/:slug`             | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/empresa/:slug/orcamento`   | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/acompanhar/:token`         | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/recuperar`                 | `apps/web/src/pages/public-pages.tsx`   | Implementada. |
| `/login`                     | `apps/web/src/pages/auth-pages.tsx`     | Implementada. |
| `/cadastro`                  | `apps/web/src/pages/auth-pages.tsx`     | Implementada. |
| `/cadastro/cliente`          | `apps/web/src/pages/auth-pages.tsx`     | Implementada. |
| `/cadastro/empresa`          | `apps/web/src/pages/auth-pages.tsx`     | Implementada. |
| `/cliente`                   | `apps/web/src/pages/customer-pages.tsx` | Implementada. |
| `/cliente/perfil`            | `apps/web/src/pages/customer-pages.tsx` | Implementada. |
| `/app`                       | `apps/web/src/pages/company-pages.tsx`  | Implementada. |
| `/app/pendente`              | `apps/web/src/pages/company-pages.tsx`  | Implementada. |
| `/admin`                     | `apps/web/src/pages/admin-pages.tsx`    | Implementada. |
| `/admin/empresas/:companyId` | `apps/web/src/pages/admin-pages.tsx`    | Implementada. |

Rotas ainda previstas, mas nao implementadas como telas completas:

- metricas;
- auditoria visual completa.

## Estados principais

### Empresa

- `pending`;
- `active`;
- `suspended`.

Transicoes ficam em `packages/domain/src/company-lifecycle.ts` e sao chamadas
pelo Admin.

### Perfil publico

- `draft`;
- `published`;
- `unpublished`.

Somente empresas ativas e publicadas devem aparecer publicamente.

### Solicitacao

- `draft`;
- `submitted`;
- `under_review`;
- `awaiting_information`;
- `accepted_for_proposal`;
- `declined_by_company`;
- `cancelled`;
- `archived`.

Transicoes ficam em `packages/domain/src/quote-request-lifecycle.ts`.

### Proposta

Container `quotes`:

- `draft`;
- `sent`;
- `viewed`;
- `accepted`;
- `rejected`;
- `expired`;
- `cancelled`.

Versoes `quote_versions`:

- `draft`;
- `sent`;
- `viewed`;
- `accepted`;
- `rejected`;
- `expired`;
- `superseded`.

Transicoes ficam em `packages/domain/src/proposal-lifecycle.ts`.

### Agendamento

- `none`;
- `proposed`;
- `confirmed`;
- `reschedule_requested`;
- `rescheduled`;
- `completed`;
- `cancelled`.

Transicoes ficam em `packages/domain/src/appointment-lifecycle.ts`.

### Servico

- `not_started`;
- `scheduled`;
- `in_progress`;
- `service_realized`;
- `closed`.

Transicoes ficam em `packages/domain/src/service-lifecycle.ts`.

### Avaliacao

- `visible`;
- `hidden`.

A moderacao tambem pode marcar a avaliacao como suspeita sem necessariamente
oculta-la.

## Regras importantes que ja aparecem no codigo

- O frontend consome somente a API.
- O backend monta dependencias reais apenas quando ambiente essencial esta
  configurado.
- O acesso ao banco fica encapsulado em repositorios Drizzle.
- Operacoes empresariais validam conta ativa e papel empresarial nos servicos.
- Estados sao alterados por funcoes de dominio/servicos, nao por update livre no
  controller.
- Dinheiro e calculado em centavos.
- Persistencia monetaria usa `NUMERIC(12, 2)` no schema.
- Snapshots usam `JSONB` quando precisam preservar configuracao, calculo,
  termos, regras e metadados historicos.
- Tokens brutos de rascunho, acompanhamento e recuperacao nao sao salvos em
  texto puro; o banco armazena hashes.
- Acoes criticas usam idempotencia onde ja implementado: submissao publica,
  envio de proposta, aceite publico e avaliacao publica.
- Configuracoes publicadas e versoes comerciais sao preservadas por snapshot.
- Avaliacoes so sao permitidas para atendimentos realizados e sem avaliacao
  anterior para o mesmo agendamento.
- Arquivos publicos ainda sao metadados; armazenamento binario real esta
  pendente.

## Como rodar localmente

1. Criar `.env` local a partir de `.env.example`.
2. Preencher `DATABASE_URL`, segredos JWT e demais variaveis locais necessarias.
3. Aplicar migrations quando necessario:

```txt
npm run db:migrate
```

4. Criar Admin inicial quando necessario:

```txt
npm run admin:create
```

5. Subir API:

```txt
npm run dev:api
```

6. Subir web:

```txt
npm run dev:web
```

Por padrao:

- web: `http://127.0.0.1:5173`;
- API: `http://127.0.0.1:3333`;
- Vite faz proxy de `/api` e `/health` para a API.

## Scripts importantes

| Script                        | Uso                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| `npm run dev:api`             | Sobe API em desenvolvimento.                                       |
| `npm run dev:web`             | Sobe frontend em desenvolvimento.                                  |
| `npm run build`               | Build completo dos pacotes, API e web.                             |
| `npm run typecheck`           | TypeScript estrito no monorepo.                                    |
| `npm run test`                | Vitest nos workspaces.                                             |
| `npm run test:e2e`            | Playwright.                                                        |
| `npm run lint`                | ESLint.                                                            |
| `npm run format:check`        | Verificacao Prettier.                                              |
| `npm run db:generate`         | Gera migration Drizzle.                                            |
| `npm run db:migrate`          | Aplica migrations no banco configurado.                            |
| `npm run admin:create`        | Cria Admin inicial usando `.env` local.                            |
| `npm run maintenance:cleanup` | Remove rascunhos, chaves de idempotencia e OTPs expirados.         |
| `npm run check:production`    | Executa checagem local de prontidao antes de homologacao/producao. |

## Pendencias funcionais e tecnicas conhecidas

### Produto/negocio

- Validar precos, margens, nomes de campos e regras com empresa real de limpeza
  de estofados.
- Definir textos legais finais.
- Definir estrategia comercial para vidracaria e marmoraria apos MVP.

### Sprint 15

- Concluida tecnicamente: aceite formal da proposta, recusa formal, rotas
  publicas de proposta no tracking, registro de IP/user agent, versoes legais
  iniciais, idempotencia, eventos, notificacao interna, frontend publico, PDF por
  versao gerado sob demanda, rota publica de PDF e botao de PDF no tracking.
- Pendente operacional: textos juridicos definitivos e armazenamento privado
  definitivo para arquivos quando essa decisao for tomada.

### Sprint 16

- Concluida tecnicamente: status de servico realizado, convite por adapter de
  e-mail `stub`, avaliacao publica elegivel, bloqueio de duplicidade, exibicao
  no perfil publico, media atualizada e moderacao Admin.
- Pendente operacional: provedor real de e-mail e criterios operacionais finais
  de moderacao, caso a Velaris queira politicas mais detalhadas.

### Sprint 17

- Concluida tecnicamente: area autenticada do cliente, historico de
  solicitacoes/propostas/agendamentos, perfil editavel, favoritos, empresas
  recentes, vinculacao de solicitacoes feitas como visitante a uma conta criada
  depois e notificacoes para cliente.
- Pendente operacional: refinamento futuro da descoberta por geolocalizacao
  completa e criterios finais de UX apos validacao com usuarios reais.

### Sprint 18

- Implementado tecnicamente.
- Metricas para empresa em `/app`, com periodo, recebidas, em analise,
  recusadas, propostas enviadas/visualizadas/aceitas, conversao, valores,
  tempo medio, servicos realizados e avaliacoes.
- Metricas Admin em `/admin`, com filtros por periodo, nicho e empresa,
  status das empresas, volume, conversao, valores, armazenamento registrado,
  ranking por empresa e recorte por nicho.
- Auditoria operacional por periodo/empresa/acao via `GET /api/admin/audit`.
- Solicitacoes de alteracao de preco via empresa e fila de resolucao Admin.
- Tabela final: `company_price_change_requests`, alinhada ao nome listado na
  especificacao.
- Migrations geradas/aplicadas: `database/migrations/0014_chunky_raza.sql` e
  `database/migrations/0015_blue_bulldozer.sql`.
- Limitacao registrada: analytics externo e BI avancado seguem adiados; os
  indicadores atuais sao agregados a partir do banco transacional.

### Sprint 19

- Adiantado tecnicamente: PWA base, manifest, icones provisorios, service worker
  com cache restrito, headers de seguranca, `no-store` nas rotas `/api`, rate
  limit global/autenticacao, cookies seguros em homologacao/producao, rewrite
  SPA da Vercel, limpeza de expirados, checagem de prontidao e testes unitarios.
- Pendente operacional: upload binario real/seguro, backups, monitoramento,
  homologacao publica final, conta piloto real e validacao do deploy por
  ambiente.
- Detalhamento de funcionamento das Sprints 12 a 19:
  `docs/SPRINT_12_A_19_FUNCIONAMENTO.md`.
- Lista consolidada de adiados: `docs/ITENS_ADIADOS.md`.

### Servicos externos ainda adiados

- Provedor real de e-mail.
- Armazenamento privado de arquivos.
- Hospedagem do frontend.
- Hospedagem da API.
- Dominio.
- Monitoramento.
- Backups.
- Analytics.
- Sistema definitivo de envio de erros.

## Limitacoes atuais importantes

- `EMAIL_PROVIDER=stub`: e-mails nao sao enviados de verdade, incluindo OTPs e
  convites de avaliacao.
- `FILE_STORAGE_PROVIDER=stub`: arquivos ainda sao apenas metadados.
- A recuperacao publica depende de e-mail cadastrado na solicitacao; sem e-mail,
  o OTP automatico nao pode ser entregue.
- O tracking publico ja permite aceitar/recusar proposta, abrir o PDF gerado por
  versao e avaliar quando o servico estiver realizado.
- `awaiting_information` existe como status, mas ainda nao possui fluxo publico
  de complemento.
- `notifications` ja existe no banco, mas nao ha central visual de notificacoes.
- `packages/ui` ainda esta reservado; os componentes visuais reais usados hoje
  estao em `apps/web/src/components`.
- Existem poucos E2E de navegador; fluxos recentes estao mais cobertos em testes
  de dominio/API.
- `database/README.md` esta desatualizado em relacao ao estado real, pois ainda
  descreve o banco como sem tabelas/migrations.
- O driver `pg` avisou que `sslmode=require/prefer/verify-ca` mudara de
  semantica em versoes futuras; avaliar `sslmode=verify-full` na string local
  quando formos tratar hardening/deploy.

## Checklist rapido para achar uma funcionalidade

- Quero mudar uma tela publica: `apps/web/src/pages/public-pages.tsx`.
- Quero mudar tela de login/cadastro: `apps/web/src/pages/auth-pages.tsx`.
- Quero mudar area do cliente: `apps/web/src/pages/customer-pages.tsx` e
  `apps/api/src/customer`.
- Quero mudar painel da empresa: `apps/web/src/pages/company-pages.tsx`.
- Quero mudar metricas/pedidos operacionais da empresa:
  `apps/web/src/pages/company-operational.tsx`.
- Quero mudar Admin: `apps/web/src/pages/admin-pages.tsx`.
- Quero mudar metricas/auditoria operacional Admin:
  `apps/web/src/pages/admin-operational.tsx`.
- Quero mudar estilos/componentes comuns: `apps/web/src/components`.
- Quero mudar chamadas HTTP do frontend: `apps/web/src/lib/api.ts`.
- Quero mudar formatacao de datas/dinheiro: `apps/web/src/lib/formatters.ts`.
- Quero mudar contrato de API: `packages/shared/src/*`.
- Quero mudar regra de estado: `packages/domain/src/*-lifecycle.ts`.
- Quero mudar elegibilidade de avaliacao/servico realizado:
  `packages/domain/src/service-lifecycle.ts`.
- Quero mudar calculo: `packages/domain/src/calculation-engine.ts` e
  `packages/domain/src/quote-request-calculation.ts`.
- Quero mudar contratos de avaliacao: `packages/shared/src/reviews.ts`.
- Quero mudar metricas/auditoria/pedidos de preco na API:
  `apps/api/src/operational`.
- Quero mudar persistencia: repositorio Drizzle correspondente em `apps/api/src`.
- Quero mudar schema de banco: `database/schemas/index.ts` e gerar migration.
- Quero mudar endpoints: router correspondente em `apps/api/src/*/*-router.ts`.
- Quero mudar regra de aplicacao: service correspondente em `apps/api/src`.
- Quero mudar testes unitarios de dominio: `packages/domain/src/*.test.ts`.
- Quero mudar testes API: `apps/api/src/**/*.test.ts`.
- Quero mudar E2E: `tests/e2e`.

## Estado recomendado para a proxima etapa

A proxima etapa recomendada e validar localmente a Sprint 19 e fechar as
decisoes externas de homologacao/producao. Antes de deploy, vale revisar:

- estrategia de hospedagem frontend/API;
- dominio, SSL e ambientes de homologacao/producao;
- rate limit e hardening de permissoes;
- cache seguro/PWA sem expor dados sensiveis;
- upload real e armazenamento privado;
- monitoramento, backups e politica de logs;
- ajuste da string Neon para modo SSL futuro mais explicito, se aplicavel.

Nao e recomendado iniciar vidracaria ou marmoraria antes da validacao comercial
do MVP piloto de limpeza de estofados.
