# Plano de Implementacao - Velaris Orçamentos

Este plano segue a ordem das sprints da especificacao. A proxima sprint nao deve comecar sem nova autorizacao.

## Estado atual

- Sprint 1 concluida: fundacao tecnica do monorepo, API, web, qualidade e health check.
- Sprint 2 concluida: schema multiempresa, migration inicial, autenticacao propria, refresh tokens e isolamento empresarial.
- Sprint 3 concluida: cadastro empresarial, conta pendente, painel Admin inicial, ativacao, suspensao, publicacao e auditoria.
- Sprint 4 concluida: Home publica, categorias, busca por cidade/CEP, perfil publico por slug, API publica de descoberta e perfil publico editavel pelo Admin.
- Sprint 5 concluida: templates fixos, configuracao por empresa, preview, simulacao, publicacao imutavel e snapshot de configuracao.
- Sprint 6 concluida: motor de calculo deterministico, regras de preco versionadas, margens, memoria de calculo, simulacao Admin e migration aplicada no Neon.
- Sprint 7 concluida tecnicamente: template de limpeza de estofados v2, regras comerciais do nicho, testes e simulador Admin completo.
- Sprint 10 concluida tecnicamente: fluxo publico de solicitacao, rascunho seguro no servidor, multiplos itens, estimativa, submissao idempotente, codigo e token publico.
- Sprint 11 concluida tecnicamente: painel da empresa, dashboard, lista, filtros, detalhe, arquivos, memoria de calculo, revisao tecnica, recalculo, aceite para proposta, recusa e historico.
- Sprint 12 concluida tecnicamente: propostas versionadas, valor final, validade, termos, preview no painel, envio idempotente e migration.
- Sprint 13 concluida tecnicamente: agendamento assistido, tabelas de agendamento/historico, modos configuraveis, timezone da empresa, aviso de conflito sem bloqueio, painel da empresa e testes.
- Pendencia operacional: validacao comercial com empresa real.
- Sprint 14 concluida tecnicamente: acompanhamento publico por token, recuperacao por OTP de e-mail, `wa.me`, notificacoes internas iniciais e acoes publicas de horario.
- Sprint 15 concluida tecnicamente: PDF por versao gerado sob demanda no backend, rota publica segura pelo tracking, botao de PDF no frontend, aceite formal, recusa formal, idempotencia, registro de IP/user agent, versoes legais iniciais, historico, notificacao interna e migration `quote_acceptances`.
- Sprint 16 concluida tecnicamente: status de servico realizado, convite stub por e-mail, avaliacao publica elegivel, bloqueio de duplicidade, exibicao no perfil publico, media atualizada e moderacao Admin.
- Sprint 17 concluida tecnicamente: area autenticada do cliente com home personalizada, cadastro/entrada de cliente, solicitacoes, propostas aguardando confirmacao, proximos agendamentos, historico, favoritos, empresas recentes, avaliacoes pendentes, notificacoes e vinculacao de solicitacoes de visitante.
- Sprint 18 concluida tecnicamente: metricas operacionais da empresa/Admin, filtros por periodo/nicho/empresa, conversao, tempo de resposta, valores, ranking, auditoria operacional e solicitacoes de alteracao de preco.
- Sprint 19 adiantada tecnicamente nos itens locais: PWA base, cache seguro, headers, rate limit, limpeza de expirados, checagem de prontidao e testes desses blocos.
- Proxima etapa recomendada para o MVP piloto: fechar decisoes externas de infraestrutura/homologacao e validar o fluxo piloto com empresa real antes de deploy.
- Sprints 8 e 9 permanecem adiadas ate a validacao do MVP piloto.
- Fonte de verdade permanece `docs/ESPECIFICACAO_V1.md`.

## Sprint 0 - Fechamento funcional e prototipo

- Fonte de verdade: secao 30 da especificacao.
- Requisito confirmado: revisar documento, confirmar status, adotar matriz inicial da especificacao, confirmar fluxos, modos de agendamento, textos legais, mapa de rotas, wireframes, prototipo navegavel, responsividade e separacao entre MVP piloto e V1 completa.
- Decisao confirmada: matriz inicial da especificacao e a fonte de verdade.
- Decisao confirmada: MVP piloto e definido pela secao 34.1.
- Decisao confirmada: primeiro nicho e limpeza de estofados.
- Decisao confirmada: vidraçaria e marmoraria entram depois da validacao do MVP.
- Pendencia funcional: wireframes, prototipo, textos finais e validacao comercial com empresa real.
- Estimativa da especificacao: 8 a 12 horas.

## Sprint 1 - Fundacao do projeto

- Fonte de verdade: secao 30 da especificacao.
- Stack confirmada: TypeScript, ESM, monorepo, npm workspaces, sem Turborepo, React, Vite, Tailwind CSS, Express, Drizzle, Neon, Zod, Pino, Vitest, Supertest, Playwright, ESLint e Prettier.
- Requisito confirmado: frontend e backend devem subir somente quando a Sprint 1 for autorizada.
- Requisito confirmado: banco conecta somente pelo backend; frontend nunca acessa Neon diretamente.
- Requisito confirmado: preparar variaveis de ambiente sem credenciais reais.
- Requisito confirmado: definir base para erros, logs, health check, `TIMESTAMPTZ`, dinheiro, medidas e idempotencia.
- Estimativa da especificacao: 10 a 14 horas.

## Sprint 2 - Banco multiempresa e autenticacao

- Requisito confirmado: criar usuarios, empresas, membros, clientes, planos, assinatura, refresh tokens, documentos legais, aceites, cadastro, login, logout, verificacao de e-mail, recuperacao de senha, autorizacao e testes de isolamento.
- Requisito confirmado: empresa pendente fica bloqueada.
- Requisito confirmado: toda consulta empresarial valida usuario, vinculo, funcao e `company_id`.
- Stack confirmada: Drizzle ORM, Drizzle Kit, `pg`, Argon2id, JWT curto e refresh tokens revogaveis.
- Estimativa da especificacao: 18 a 26 horas.

## Sprint 3 - Cadastro, ativacao e painel inicial do Admin

- Requisito confirmado: cadastro empresarial, confirmacao de e-mail, conta pendente, contato com Velaris, lista/detalhe de empresas no Admin, ativacao, suspensao, publicacao, observacoes internas, auditoria e e-mail de liberacao.
- Requisito confirmado: pagamento ocorre fora da plataforma.
- Implementado Sprint 3: API Admin inicial, tela de cadastro empresarial, tela de conta pendente, painel/lista/detalhe Admin, observacoes internas, auditoria e adapter stub para e-mails.
- Pendente para operacao real: definir canal oficial de contato Velaris e provedor/templates de e-mail.
- Estimativa da especificacao: 12 a 18 horas.

## Sprint 4 - Home, busca e perfil publico

- Requisito confirmado: onboarding, Home publica, categorias, busca por cidade/CEP, localizacao, distancia, raio de atendimento, listagem, perfil publico, galeria, avaliacoes resumidas, CTA de orcamento e favoritos para autenticados.
- Regra confirmada: link direto para `/empresa/:slug` nao deve ser bloqueado pelo onboarding.
- Implementado Sprint 4: rotas `/`, `/onboarding`, `/empresas`, `/empresa/:slug` e `/empresa/:slug/orcamento`; API `GET /api/public/categories`, `GET /api/public/companies`, `GET /api/public/companies/:slug` e `GET /api/public/companies/:slug/services`; tabela `company_public_profiles`; formulario Admin para dados publicos basicos, servicos, cidade, raio e regioes atendidas.
- Limitacao registrada: descoberta completa por geolocalizacao precisa de refinamento posterior; favoritos autenticados foram implementados posteriormente na Sprint 17.
- Estimativa da especificacao: 16 a 22 horas.

## Sprint 5 - Templates fixos e campos configuraveis

- Requisito confirmado: templates fixos por nicho, tipos de campo predefinidos, opcoes, obrigatoriedade, ativacao por empresa, condicoes simples, ordenacao, preview, configuracao Admin, modo de agendamento, versionamento, simulacao, snapshot e bloqueio de edicao de versao publicada.
- Implementado Sprint 5: tabelas `niche_templates`, `template_services`, `template_fields`, `template_field_options`, `company_configurations`, `company_services`, `company_service_fields` e `company_field_options`; template inicial fixo de limpeza de estofados; contratos compartilhados; regras puras de ciclo/condicoes; API Admin de templates/configuracoes; painel Admin para criar rascunho, ajustar campos/opcoes, simular condicionais e publicar versoes imutaveis.
- Limitacao registrada: regras comerciais iniciais de preco foram criadas na Sprint 6 e consolidadas tecnicamente na Sprint 7; validacao real segue como pendencia operacional.
- Fora da V1: construtor livre, codigo livre, formulas arbitrarias, regras profundamente aninhadas e novos tipos tecnicos criados pelo Admin.
- Estimativa da especificacao: 18 a 26 horas.

## Sprint 6 - Motor de calculo

- Requisito confirmado: contrato do motor, dinheiro, unidades, preco fixo, quantidade, area, metro linear, multiplicadores, adicionais, percentuais, minimos, faixas, condicoes, deslocamento, margem, valor final sugerido, justificativa fora da faixa, memoria de calculo, snapshot, testes e simulacao.
- Regra confirmada: calculos internos devem usar preferencialmente centavos inteiros; persistencia monetaria usa `NUMERIC(12, 2)`.
- Regra confirmada: regras puras de calculo ficam em `packages/domain`.
- Implementado Sprint 6: contratos compartilhados de regras e respostas de calculo em `packages/shared`; motor puro em `packages/domain`; tabelas `template_pricing_rules`, `company_pricing_versions` e `company_pricing_rules`; regras iniciais versionadas para limpeza de estofados; margens por servico; snapshot de precos; simulacao Admin retornando preview e memoria de calculo.
- Limitacao registrada: os valores comerciais semeados sao padroes iniciais configuraveis e ainda precisam de validacao real.
- Estimativa da especificacao: 24 a 34 horas.

## Sprint 7 - Template de limpeza de estofados

- Requisito confirmado: primeiro nicho a implementar.
- Requisito confirmado: itens, tamanhos, tecidos, sujeira, manchas, odor, pelos, impermeabilizacao, urgencia, acesso, regras, testes e validacao com empresa real.
- Implementado Sprint 7: template de limpeza de estofados v2; regras de tecido, acesso, deslocamento e desconto por quantidade; ajuste de regras por quantidade; simulador Admin com respostas completas do nicho; versionamento correto de template em snapshot; testes para recalculo por sujeira e desativacao de tecido.
- Pendencia operacional: validar valores, margens e nomenclaturas com empresa real antes do piloto.
- Marco do MVP piloto: nicho completo de limpeza de estofados.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 8 - Template de vidraçaria

- Requisito confirmado: implementar somente depois da validacao do MVP piloto.
- Requisito confirmado: produtos, medidas, vidros, espessuras, cores, acabamentos, ferragens, perfis, instalacao, retirada, acesso, regras de area, area minima, testes e validacao.
- Status: adiada por decisao de produto ate a validacao do MVP piloto de limpeza de estofados.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 9 - Template de marmoraria

- Requisito confirmado: implementar somente depois da validacao do MVP piloto.
- Requisito confirmado: produtos, materiais, medidas, espessuras, bordas, recortes, frontao, saia, instalacao, transporte, perda tecnica, regras, testes e validacao.
- Status: adiada por decisao de produto ate a validacao do MVP piloto de limpeza de estofados.
- Estimativa da especificacao: 16 a 22 horas.

## Sprint 10 - Fluxo publico, rascunho e solicitacao

- Requisito confirmado: rascunho seguro no servidor, `draft_token`, dispositivo salva apenas token/etapa, campos configurados, upload, estimativa, revisao, submissao idempotente, codigo, token publico, snapshot, aceites legais, e-mail e limpeza de rascunhos.
- Padrao inicial configuravel: rascunhos expiram em 10 dias.
- Implementado Sprint 10: rotas publicas de rascunho/estimativa/submissao; tabelas `quote_requests`, `quote_request_answers`, `quote_request_files`, `quote_request_calculations`, `public_access_tokens` e `idempotency_keys`; tela `/empresa/:slug/orcamento`; token bruto salvo apenas no navegador; hash de token no banco; multiplos itens por rascunho; estimativa agregada por itens; snapshot de configuracao/calculo/aceite; envio com `Idempotency-Key`.
- Limitacao registrada: arquivos ainda sao registrados como metadados com `FILE_STORAGE_PROVIDER=stub`; upload binario e armazenamento privado aguardam fornecedor/contrato definitivo.
- Limitacao registrada: e-mail de confirmacao usa adapter `stub` ate escolha do provedor transacional.
- Estimativa da especificacao: 22 a 30 horas.

## Sprint 11 - Painel da empresa e revisao

- Requisito confirmado: dashboard, lista, filtros, detalhes, fotos, memoria de calculo, edicao de campos tecnicos, motivo quando necessario, revisao, recalculo, diferenca, aceite/recusa e historico.
- Regra confirmada: estados devem passar por dominio/servicos, nunca por atualizacao livre em controller.
- Implementado Sprint 11: status completos da matriz inicial para solicitacoes; funcao pura de transicao em `packages/domain`; contratos compartilhados para dashboard/lista/detalhe/revisao/recusa; tabelas `quote_request_answer_revisions` e `quote_request_events`; API `GET /api/company/dashboard`, `GET /api/company/quote-requests`, `GET /api/company/quote-requests/:id`, `PATCH /api/company/quote-requests/:id/review` e `POST /api/company/quote-requests/:id/decline`; painel `/app` com dashboard, filtros, lista, detalhe, arquivos, memoria de calculo, revisao tecnica, motivo obrigatorio quando campos mudam, recalculo, aceite para proposta e recusa.
- Limitacao registrada: `awaiting_information` ainda nao possui fluxo publico de complemento nesta entrega.
- Estimativa da especificacao: 18 a 26 horas.

## Sprint 12 - Propostas, versoes e valor final

- Requisito confirmado: `quotes`, versoes, codigo por versao, itens, valor final com total interno, validacao de faixa, justificativa fora da faixa, validade, termos, preview, envio idempotente, visualizacao, alteracao, nova versao, bloqueio de versao aceita e expiracao.
- Padrao inicial configuravel: propostas validas por 7 dias.
- Regra confirmada: proposta aceita e imutavel; alteracao comercial posterior gera nova versao.
- Implementado Sprint 12: enums `quote_status` e `quote_version_status`; tabelas `quotes`, `quote_versions`, `quote_version_items` e `quote_version_events`; contratos compartilhados de propostas; dominio puro para transicoes e validacao de valor final; API `POST /api/company/quote-requests/:id/proposals` e `POST /api/company/proposals/:id/send`; painel `/app` com criacao/preview/envio de proposta; envio com `Idempotency-Key`; preservacao de versoes anteriores; testes de valor fora da faixa, expiracao, envio duplicado, versao aceita bloqueada e proposta sem agendamento.
- Limitacao registrada: visualizacao publica, aceite/rejeicao do cliente, PDF e documentos legais versionados foram tratados posteriormente nas Sprints 14 e 15; solicitacao publica de complemento ainda segue pendente.
- Estimativa da especificacao: 20 a 26 horas.

## Sprint 13 - Agendamento assistido

- Requisito confirmado: `appointments`, `scheduling_mode`, data, horario, duracao, timezone, conflito basico com aviso sem bloqueio, confirmacao, solicitacao de outro horario, nova proposta, historico, cancelamento, conclusao e testes.
- Padrao inicial configuravel: timezone inicial das empresas e `America/Sao_Paulo`.
- Implementado Sprint 13: enum `appointment_status`; tabelas `appointments` e `appointment_history`; contratos compartilhados de agendamento; dominio puro para transicoes, validade do horario e restricoes por modo; API `POST /api/company/proposals/:id/appointment`, `PATCH /api/company/appointments/:id` e `POST /api/company/appointments/:id/complete`; painel `/app` com proposta de horario, duracao, endereco, observacoes, aviso de conflito, cancelamento e conclusao; envio de proposta bloqueado quando `required_with_proposal` nao possui horario ativo; migration aplicada no Neon; testes de conflito, modo externo, depois do aceite, reagendamento e conclusao.
- Limitacao registrada: confirmacao publica pelo cliente, acompanhamento por token, aceite/rejeicao de proposta e PDF foram tratados posteriormente nas Sprints 14 e 15.
- Fora da V1: agenda automatica completa.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 14 - Acompanhamento, recuperacao e comunicacao

- Requisito confirmado: token e codigo gerados na submissao, tela de acompanhamento, recuperacao, OTP exclusivamente por e-mail, validacao por codigo + e-mail ou codigo + WhatsApp, e-mails transacionais, links `wa.me`, notificacoes internas, vinculacao a conta nova, revogacao/substituicao de token e limites de tentativa.
- Decisao confirmada: nao conectar provedor definitivo de e-mail nesta etapa; planejar interface/adapters futuramente.
- Padrao inicial configuravel: OTP de recuperacao publica expira em 10 minutos e permite 5 tentativas.
- Implementado Sprint 14: contratos compartilhados de acompanhamento/recuperacao; rotas `GET /api/public/tracking/:token`, `POST /api/public/recovery/request`, `POST /api/public/recovery/verify` e `POST /api/public/tracking/:token/appointment`; telas `/acompanhar/:token` e `/recuperar`; tabela `recovery_codes` com hash de token/OTP, validade, uso unico, tentativas e revogacao; tabela `notifications`; substituicao do token publico apos recuperacao; link `wa.me` com mensagem preenchida; testes de token, recuperacao por e-mail, identificacao por WhatsApp e expiracao de OTP.
- Limitacao registrada: entrega local usa `EMAIL_PROVIDER=stub`; o contrato de e-mail transacional existe, mas chegada real de e-mail depende da decisao futura do provedor.
- Limitacao registrada: aceite/rejeicao formal de proposta, PDF por versao e registro juridico do aceite foram tratados na Sprint 15; textos juridicos definitivos seguem decisao futura.
- Implementado posteriormente na Sprint 17: vinculacao manual assistida de solicitacoes antigas a conta do cliente quando o contato da solicitacao corresponde ao e-mail verificado da conta autenticada.
- Estimativa da especificacao: 16 a 22 horas.

## Sprint 15 - PDF, aceite e documentos legais

- Requisito confirmado: template PDF, PDF por versao, codigos, validade, itens, agendamento quando existir, termos e versoes, aceite idempotente, IP, user agent, versao da proposta, versoes legais, expiracao e clique duplicado.
- Implementado Sprint 15: tabela `quote_acceptances`, contratos compartilhados de proposta publica, regras de dominio para aceitar/recusar, rotas `GET /api/public/tracking/:token/proposal`, `GET /api/public/tracking/:token/proposal/pdf`, `POST /api/public/tracking/:token/proposal/accept` e `POST /api/public/tracking/:token/proposal/reject`, service publico, PDF por versao gerado sob demanda no backend, inclusao de codigos, validade, itens, termos, versoes e agendamento quando existir, repositorios real/em memoria, testes de aceite/PDF/rota, frontend publico de detalhe/aceite/recusa/PDF e idempotencia no frontend.
- Limitacao registrada: o PDF ainda nao e persistido em armazenamento privado definitivo; a geracao sob demanda evita fornecedor pago ate a decisao futura de arquivos privados.
- Decisao adiada: textos juridicos definitivos.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 16 - Servico realizado e avaliacoes

- Requisito confirmado: status do servico, marcar realizado, notificar cliente, avaliacao, elegibilidade, bloqueio de duplicacao, exibicao no perfil, media, moderacao e convite por e-mail.
- Implementado Sprint 16: contrato compartilhado de `serviceStatus` e avaliacoes, regra pura de ciclo do servico em `packages/domain`, coluna `appointments.service_status`, tabela `reviews`, rota `POST /api/public/reviews`, elegibilidade por proposta aceita + horario confirmado/concluido + servico realizado + ausencia de avaliacao anterior, idempotencia de avaliacao, notificacao interna `review_received`, convite por adapter de e-mail `stub`, listagem de avaliacoes visiveis no perfil publico, recalculo de media/contagem no perfil publico e moderacao Admin por `PATCH /api/admin/reviews/:reviewId/moderation`.
- Implementado frontend: painel de avaliacao no acompanhamento publico quando elegivel, exibicao de avaliacoes no perfil publico da empresa e painel Admin de moderacao no detalhe da empresa.
- Migration gerada: `database/migrations/0012_stiff_prima.sql`.
- Limitacao registrada: convite de avaliacao ainda usa `EMAIL_PROVIDER=stub`; envio real depende da decisao futura de provedor transacional.
- Estimativa da especificacao: 10 a 16 horas.

## Sprint 17 - Area do cliente

- Requisito confirmado: Home personalizada, solicitacoes, propostas, agendamentos, historico, favoritos, empresas recentes, avaliacoes pendentes, vinculacao de solicitacoes de visitante e notificacoes.
- Implementado Sprint 17: rota web `/cliente`; escolha de cadastro em `/cadastro`; cadastro de cliente em `/cadastro/cliente`; redirecionamento de login por papel; API protegida `/api/customer/me`, `/api/customer/link-visitor-requests`, `POST /api/customer/favorites` e `DELETE /api/customer/favorites/:companyId`; tabela `customer_favorite_companies`; dashboard do cliente com solicitacoes, propostas publicas aguardando confirmacao, proximos agendamentos, historico, empresas recentes, favoritos, avaliacoes pendentes e notificacoes; acao de favoritar no perfil publico da empresa; testes unitarios do servico de cliente.
- Migration gerada: `database/migrations/0013_needy_frightful_four.sql`.
- Limitacao registrada: a descoberta por empresas proximas reutiliza a busca publica por cidade/categoria; geolocalizacao completa ainda fica para refinamento posterior.
- Limitacao registrada: vinculo de visitante por telefone fica pendente ate existir verificacao de telefone; a Sprint 17 implementa vinculo por e-mail verificado.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 18 - Metricas e administracao operacional

- Requisito confirmado: metricas da empresa, metricas Admin, filtros por periodo/nicho/empresa, conversao, tempo de resposta, valores estimado/proposto/aceito, ranking, auditoria e solicitacoes de preco.
- Implementado Sprint 18: contratos compartilhados de metricas e solicitacoes de alteracao de preco; tabela final `company_price_change_requests`; API empresarial `GET /api/company/metrics`, `GET /api/company/price-change-requests` e `POST /api/company/price-change-requests`; API Admin `GET /api/admin/metrics`, `GET /api/admin/audit`, `GET /api/admin/price-change-requests` e `POST /api/admin/price-change-requests/:id/resolve`; painel operacional da empresa; painel operacional Admin com filtros, ranking, auditoria e resolucao de pedidos de preco.
- Migrations geradas/aplicadas: `database/migrations/0014_chunky_raza.sql` e `database/migrations/0015_blue_bulldozer.sql`.
- Decisao adiada: analytics externo segue fora da V1/MVP piloto.
- Limitacao registrada: metricas sao agregadas pela aplicacao a partir do banco atual; dashboards analiticos avancados, cohort/BI externo e monitoramento definitivo ficam para decisao futura.
- Estimativa da especificacao: 16 a 24 horas.

## Sprint 19 - PWA, seguranca, desempenho e deploy

- Requisito confirmado: manifest, icones, instalacao, cache seguro, rate limit, permissoes, isolamento, uploads, idempotencia, matriz de estados, timezone, dinheiro, unidades, limpeza de rascunhos, backups, monitoramento, dominio, SSL, homologacao, testes completos, conta piloto, deploy, correcao e suporte.
- Implementado localmente: manifest PWA em `apps/web/public/manifest.webmanifest`, icones provisorios em `apps/web/public/icons`, service worker em `apps/web/public/sw.js`, registro em `apps/web/src/pwa.ts`, headers de seguranca em `apps/api/src/middleware/security-headers.ts`, `no-store` para `/api`, rate limit configuravel em `apps/api/src/middleware/rate-limit.ts`, cookies seguros para homologacao/producao, limpeza de expirados em `apps/api/src/maintenance`, script `npm run maintenance:cleanup`, checagem `npm run check:production` e testes unitarios.
- Decisoes adiadas: hospedagem, dominio, monitoramento, backups, sistema definitivo de envio de erros, provedor real de e-mail, armazenamento privado definitivo, icones finais, homologacao publica, conta piloto real e deploy.
- Documento complementar: `docs/SPRINT_12_A_19_FUNCIONAMENTO.md`.
- Documento de adiados: `docs/ITENS_ADIADOS.md`.
- Estimativa da especificacao: 22 a 32 horas.
