# Telas e Rotas - Velaris Orçamentos

## Premissas confirmadas

- Fonte de verdade: `docs/ESPECIFICACAO_V1.md`.
- Produto: Velaris Orçamentos.
- MVP piloto: secao 34.1 da especificacao.
- Primeiro nicho: limpeza de estofados.
- Vidraçaria e marmoraria entram depois da validacao do MVP.
- A matriz inicial de estados e transicoes da especificacao deve ser respeitada.
- O frontend consome a API; nunca acessa o Neon diretamente.

## Areas da aplicacao

- Requisito confirmado: area publica para descoberta, perfil de empresa, solicitacao, acompanhamento e recuperacao.
- Requisito confirmado: area autenticada do cliente.
- Requisito confirmado: area da empresa.
- Requisito confirmado: area Admin Velaris.
- Requisito confirmado: empresa pendente possui acesso restrito ao status do cadastro, dados informados, apresentacao do produto, botao de contato com a Velaris e logout.

## Rotas de tela previstas

| Area    | Rota                       | Tela/uso                                    | Status                 |
| ------- | -------------------------- | ------------------------------------------- | ---------------------- |
| Publica | `/`                        | Home publica                                | Implementado Sprint 4  |
| Publica | `/onboarding`              | Onboarding geral                            | Implementado Sprint 4  |
| Publica | `/empresas`                | Busca/listagem de empresas                  | Implementado Sprint 4  |
| Publica | `/empresa/:slug`           | Perfil publico da empresa                   | Implementado Sprint 4  |
| Publica | `/empresa/:slug/orcamento` | Fluxo de solicitacao de orcamento           | Implementado Sprint 10 |
| Publica | `/acompanhar/:token`       | Acompanhamento publico seguro               | Requisito confirmado   |
| Publica | `/recuperar`               | Recuperacao por codigo + e-mail/WhatsApp    | Requisito confirmado   |
| Auth    | `/login`                   | Login                                       | Requisito confirmado   |
| Auth    | `/cadastro`                | Escolha do tipo de cadastro                 | Requisito confirmado   |
| Auth    | `/cadastro/empresa`        | Cadastro empresarial                        | Implementado Sprint 3  |
| Cliente | `/cliente`                 | Home personalizada do cliente               | Requisito confirmado   |
| Empresa | `/app`                     | Painel da empresa                           | Implementado Sprint 11 |
| Empresa | `/app/pendente`            | Status de cadastro pendente                 | Implementado Sprint 3  |
| Admin   | `/admin`                   | Painel da Velaris                           | Requisito confirmado   |
| Admin   | `/admin/empresas/:id`      | Detalhe, ativacao, configuracao e simulacao | Implementado Sprint 7  |

## Telas publicas

- Home publica: apresentacao curta, busca por cidade/CEP/localizacao, categorias, empresas publicadas, login do cliente e acesso empresarial. Implementado Sprint 4.
- Onboarding: tres telas com acoes Pular, Continuar e Comecar. Implementado Sprint 4.
- Busca de empresas: filtros por nicho/localizacao e listagem considerando regiao atendida, raio, status ativo e perfil publicado. Implementado Sprint 4.
- Perfil publico da empresa: logotipo, capa, cor principal moderada, descricao, galeria, contatos, endereco, servicos, termos, raio/regioes e CTA de orcamento. Implementado Sprint 4.
- Fluxo de solicitacao: servico, rascunho, campos tecnicos, fotos/PDF em metadados `stub`, dados pessoais, endereco, estimativa, revisao, termos e confirmacao. Implementado Sprint 10.
- Acompanhamento: estado atual da jornada, codigo da solicitacao, proposta quando houver, agendamento quando aplicavel, acoes permitidas e WhatsApp assistido.
- Recuperacao: entrada de codigo + e-mail ou codigo + WhatsApp, envio de OTP ao e-mail cadastrado e verificacao.

## Telas do MVP piloto

- Admin Velaris basico.
- Cadastro e status de uma empresa de limpeza de estofados.
- Perfil por link direto.
- Fluxo visitante de solicitacao.
- Rascunho no servidor.
- Campos configurados para limpeza de estofados.
- Upload de fotos/PDF com metadados vinculados ao rascunho; armazenamento binario definitivo segue pendente.
- Estimativa e revisao.
- Codigo e link de acompanhamento.
- Painel da empresa.
- Revisao e recalculo. Implementado Sprint 11.
- Proposta final.
- Agendamento assistido.
- Recuperacao por e-mail.
- WhatsApp assistido.
- Servico realizado.
- Avaliacao.

## Telas posteriores da V1 completa

- Descoberta completa por localizacao.
- Area autenticada completa do cliente.
- Favoritos.
- Historico completo.
- Templates e fluxos de vidraçaria.
- Templates e fluxos de marmoraria.
- PDF.
- Metricas completas.
- PWA.
- Moderacao.
- Seguranca e refinamentos de producao.

## Telas do cliente autenticado

- Home personalizada.
- Solicitacoes em andamento.
- Propostas aguardando confirmacao.
- Proximos agendamentos.
- Historico.
- Empresas proximas.
- Categorias.
- Empresas utilizadas recentemente.
- Favoritos.
- Avaliacoes pendentes.
- Notificacoes.

## Telas da empresa

- Status de cadastro pendente.
- Dashboard.
- Lista de solicitacoes. Implementado Sprint 11.
- Detalhe da solicitacao. Implementado Sprint 11.
- Revisao de campos tecnicos. Implementado Sprint 11.
- Recalculo e memoria de calculo. Implementado Sprint 11.
- Recusa com motivo. Implementado Sprint 11.
- Criacao/preview/envio de proposta. Implementado Sprint 12 no detalhe da solicitacao aceita para proposta.
- Agendamento assistido. Implementado Sprint 13 no detalhe da solicitacao aceita para proposta.
- Clientes.
- Historico.
- Metricas.
- Solicitacao de alteracao de precos.

## Telas do Admin Velaris

- Dashboard/Admin inicial.
- Empresas pendentes, ativas e suspensas.
- Detalhe da empresa.
- Ativacao, suspensao e reativacao.
- Publicacao/despublicacao de perfil.
- Templates de nicho.
- Configuracao personalizada por empresa. Implementado Sprint 5 no detalhe Admin.
- Precos, adicionais, multiplicadores, margens, area minima, deslocamento e duracao. Implementado Sprint 6 em modo controlado pelo template e ampliado na Sprint 7 para o nicho completo de limpeza.
- Simulacao de configuracao. Implementado Sprint 5 para preview de campos/condicoes, ampliado na Sprint 6 com calculo, faixa estimada, total interno e memoria explicavel, e ampliado na Sprint 7 com respostas tecnicas completas de limpeza.
- Solicitacoes de alteracao de preco.
- Auditoria.
- Metricas gerais.
- Moderacao de avaliacoes.

## Rotas de API previstas

### Publicas - descoberta

- `GET /api/public/categories`
- `GET /api/public/companies`
- `GET /api/public/companies/:slug`
- `GET /api/public/companies/:slug/services`

Status Sprint 4: rotas publicas de descoberta implementadas.

### Publicas - rascunho e solicitacao

- `POST /api/public/quote-requests/drafts`
- `GET /api/public/quote-requests/drafts/:draftToken`
- `PATCH /api/public/quote-requests/drafts/:draftToken`
- `POST /api/public/quote-requests/drafts/:draftToken/files`
- `DELETE /api/public/quote-requests/drafts/:draftToken/files/:fileId`
- `POST /api/public/quote-requests/drafts/:draftToken/estimate`
- `POST /api/public/quote-requests/drafts/:draftToken/submit`

Status Sprint 10: rotas publicas de rascunho, arquivos em metadados, estimativa e submissao implementadas. Submissao exige `Idempotency-Key`.

### Publicas - acompanhamento

- `GET /api/public/tracking/:token`
- `POST /api/public/recovery/request`
- `POST /api/public/recovery/verify`
- `POST /api/public/proposals/:token/accept`
- `POST /api/public/proposals/:token/reject`
- `POST /api/public/proposals/:token/reschedule`
- `POST /api/public/reviews`

### Autenticacao

- `POST /api/auth/register/customer`
- `POST /api/auth/register/company`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Empresa

- `GET /api/company/me`
- `GET /api/company/dashboard`
- `GET /api/company/quote-requests`
- `GET /api/company/quote-requests/:id`
- `PATCH /api/company/quote-requests/:id/review`
- `POST /api/company/quote-requests/:id/decline`

Status Sprint 11: rotas de dashboard, lista, detalhe, revisao e recusa implementadas.

- `POST /api/company/quote-requests/:id/proposals`. Implementado Sprint 12.
- `POST /api/company/proposals/:id/send`. Implementado Sprint 12 com `Idempotency-Key`.
- `POST /api/company/proposals/:id/appointment`. Implementado Sprint 13.
- `PATCH /api/company/appointments/:id`. Implementado Sprint 13.
- `POST /api/company/appointments/:id/complete`. Implementado Sprint 13.
- `GET /api/company/customers`
- `GET /api/company/metrics`
- `POST /api/company/price-change-requests`

### Admin Velaris

- `GET /api/admin/companies`
- `GET /api/admin/companies/:id`
- `POST /api/admin/companies/:id/activate`
- `POST /api/admin/companies/:id/suspend`
- `PATCH /api/admin/companies/:id/profile`
- `POST /api/admin/companies/:id/publish`
- `PATCH /api/admin/companies/:id/profile`
- `POST /api/admin/companies/:id/notes`
- `GET /api/admin/niche-templates`
- `POST /api/admin/company-configurations`
- `PATCH /api/admin/company-configurations/:id`
- `POST /api/admin/company-configurations/:id/simulate`
- `POST /api/admin/company-configurations/:id/publish`

Status Sprint 7: rotas Admin de templates/configuracoes implementadas; `POST /api/admin/company-configurations/:id/simulate` retorna `preview` e `calculation` usando o template completo de limpeza quando aplicavel.

- `GET /api/admin/price-change-requests`
- `POST /api/admin/price-change-requests/:id/resolve`
- `GET /api/admin/audit`
- `GET /api/admin/metrics`

## Regras transversais de rota

- Requisito confirmado: acoes criticas devem aceitar `Idempotency-Key: <uuid>`.
- Requisito confirmado: aplicar idempotencia em submissao da solicitacao, envio da proposta, aceite, confirmacao do agendamento, servico realizado e avaliacao.
- Requisito confirmado: rotas empresariais nunca devem confiar apenas no ID da rota; devem validar usuario, papel, associacao e `company_id`.
- Requisito confirmado: rotas/controllers nao devem atualizar estados livremente; devem chamar servicos/funcoes de dominio.
