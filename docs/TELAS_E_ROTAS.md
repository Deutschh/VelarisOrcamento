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

| Area    | Rota                       | Tela/uso                                 | Status                |
| ------- | -------------------------- | ---------------------------------------- | --------------------- |
| Publica | `/`                        | Home publica                             | Requisito confirmado  |
| Publica | `/onboarding`              | Onboarding geral                         | Requisito confirmado  |
| Publica | `/empresas`                | Busca/listagem de empresas               | Requisito confirmado  |
| Publica | `/empresa/:slug`           | Perfil publico da empresa                | Requisito confirmado  |
| Publica | `/empresa/:slug/orcamento` | Fluxo de solicitacao de orcamento        | Requisito confirmado  |
| Publica | `/acompanhar/:token`       | Acompanhamento publico seguro            | Requisito confirmado  |
| Publica | `/recuperar`               | Recuperacao por codigo + e-mail/WhatsApp | Requisito confirmado  |
| Auth    | `/login`                   | Login                                    | Requisito confirmado  |
| Auth    | `/cadastro`                | Escolha do tipo de cadastro              | Requisito confirmado  |
| Auth    | `/cadastro/empresa`        | Cadastro empresarial                     | Implementado Sprint 3 |
| Cliente | `/cliente`                 | Home personalizada do cliente            | Requisito confirmado  |
| Empresa | `/app`                     | Painel da empresa                        | Requisito confirmado  |
| Empresa | `/app/pendente`            | Status de cadastro pendente              | Implementado Sprint 3 |
| Admin   | `/admin`                   | Painel da Velaris                        | Requisito confirmado  |
| Admin   | `/admin/empresas/:id`      | Detalhe e ativacao de empresa            | Implementado Sprint 3 |

## Telas publicas

- Home publica: apresentacao curta, busca por cidade/CEP/localizacao, categorias, empresas proximas, empresas em destaque, Como funciona, acesso ao historico por codigo, login do cliente e acesso empresarial.
- Onboarding: tres telas com acoes Pular, Continuar e Comecar.
- Busca de empresas: filtros por nicho/localizacao e listagem considerando regiao atendida, raio, status ativo e perfil publicado.
- Perfil publico da empresa: logotipo, capa, cor principal moderada, descricao, galeria, contatos, endereco, redes sociais, servicos, termos, raio/regioes e CTA de orcamento.
- Fluxo de solicitacao: servico, rascunho, campos tecnicos, fotos/PDF, dados pessoais, endereco, estimativa, revisao, termos e confirmacao.
- Acompanhamento: estado atual da jornada, codigo da solicitacao, proposta quando houver, agendamento quando aplicavel, acoes permitidas e WhatsApp assistido.
- Recuperacao: entrada de codigo + e-mail ou codigo + WhatsApp, envio de OTP ao e-mail cadastrado e verificacao.

## Telas do MVP piloto

- Admin Velaris basico.
- Cadastro e status de uma empresa de limpeza de estofados.
- Perfil por link direto.
- Fluxo visitante de solicitacao.
- Rascunho no servidor.
- Campos configurados para limpeza de estofados.
- Upload de fotos.
- Estimativa e revisao.
- Codigo e link de acompanhamento.
- Painel da empresa.
- Revisao e recalculo.
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
- Lista de solicitacoes.
- Detalhe da solicitacao.
- Revisao de campos tecnicos.
- Recalculo e memoria de calculo.
- Recusa com motivo.
- Criacao/preview/envio de proposta.
- Agendamento assistido.
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
- Configuracao personalizada por empresa.
- Precos, adicionais, multiplicadores, margens, area minima, deslocamento e duracao.
- Simulacao de configuracao.
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

### Publicas - rascunho e solicitacao

- `POST /api/public/quote-requests/drafts`
- `GET /api/public/quote-requests/drafts/:draftToken`
- `PATCH /api/public/quote-requests/drafts/:draftToken`
- `POST /api/public/quote-requests/drafts/:draftToken/files`
- `DELETE /api/public/quote-requests/drafts/:draftToken/files/:fileId`
- `POST /api/public/quote-requests/drafts/:draftToken/estimate`
- `POST /api/public/quote-requests/drafts/:draftToken/submit`

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
- `POST /api/company/quote-requests/:id/proposals`
- `POST /api/company/proposals/:id/send`
- `POST /api/company/proposals/:id/appointment`
- `PATCH /api/company/appointments/:id`
- `POST /api/company/appointments/:id/complete`
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
- `POST /api/admin/companies/:id/notes`
- `GET /api/admin/niche-templates`
- `POST /api/admin/company-configurations`
- `PATCH /api/admin/company-configurations/:id`
- `POST /api/admin/company-configurations/:id/simulate`
- `POST /api/admin/company-configurations/:id/publish`
- `GET /api/admin/price-change-requests`
- `POST /api/admin/price-change-requests/:id/resolve`
- `GET /api/admin/audit`
- `GET /api/admin/metrics`

## Regras transversais de rota

- Requisito confirmado: acoes criticas devem aceitar `Idempotency-Key: <uuid>`.
- Requisito confirmado: aplicar idempotencia em submissao da solicitacao, envio da proposta, aceite, confirmacao do agendamento, servico realizado e avaliacao.
- Requisito confirmado: rotas empresariais nunca devem confiar apenas no ID da rota; devem validar usuario, papel, associacao e `company_id`.
- Requisito confirmado: rotas/controllers nao devem atualizar estados livremente; devem chamar servicos/funcoes de dominio.
