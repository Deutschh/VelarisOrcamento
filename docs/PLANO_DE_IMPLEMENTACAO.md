# Plano de Implementacao - Velaris Orçamentos

Este plano segue a ordem das sprints da especificacao. A Sprint 1 nao deve comecar sem nova autorizacao.

## Estado atual

- Sprint 1 concluida: fundacao tecnica do monorepo, API, web, qualidade e health check.
- Sprint 2 concluida: schema multiempresa, migration inicial, autenticacao propria, refresh tokens e isolamento empresarial.
- Sprint 3 concluida: cadastro empresarial, conta pendente, painel Admin inicial, ativacao, suspensao, publicacao e auditoria.
- Sprint 4 concluida: Home publica, categorias, busca por cidade/CEP, perfil publico por slug, API publica de descoberta e perfil publico editavel pelo Admin.
- Fonte de verdade permanece `docs/ESPECIFICACAO_V1.md`.

## Sprint 0 - Fechamento funcional e prototipo

- Fonte de verdade: secao 30 da especificacao.
- Requisito confirmado: revisar documento, confirmar status, adotar matriz inicial da especificacao, confirmar fluxos, modos de agendamento, textos legais, mapa de rotas, wireframes, prototipo navegavel, responsividade e separacao entre MVP piloto e V1 completa.
- Decisao confirmada: matriz inicial da especificacao e a fonte de verdade.
- Decisao confirmada: MVP piloto e definido pela secao 34.1.
- Decisao confirmada: primeiro nicho e limpeza de estofados.
- Decisao confirmada: vidraçaria e marmoraria entram depois da validacao do MVP.
- Pendente antes do codigo: wireframes, prototipo, textos finais e regras completas do template de limpeza.
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
- Limitacao registrada: descoberta completa por geolocalizacao precisa de refinamento posterior; favoritos continuam fora do MVP piloto conforme secao 34.1.
- Estimativa da especificacao: 16 a 22 horas.

## Sprint 5 - Templates fixos e campos configuraveis

- Requisito confirmado: templates fixos por nicho, tipos de campo predefinidos, opcoes, obrigatoriedade, ativacao por empresa, condicoes simples, ordenacao, preview, configuracao Admin, modo de agendamento, versionamento, simulacao, snapshot e bloqueio de edicao de versao publicada.
- Fora da V1: construtor livre, codigo livre, formulas arbitrarias, regras profundamente aninhadas e novos tipos tecnicos criados pelo Admin.
- Estimativa da especificacao: 18 a 26 horas.

## Sprint 6 - Motor de calculo

- Requisito confirmado: contrato do motor, dinheiro, unidades, preco fixo, quantidade, area, metro linear, multiplicadores, adicionais, percentuais, minimos, faixas, condicoes, deslocamento, margem, valor final sugerido, justificativa fora da faixa, memoria de calculo, snapshot, testes e simulacao.
- Regra confirmada: calculos internos devem usar preferencialmente centavos inteiros; persistencia monetaria usa `NUMERIC(12, 2)`.
- Regra confirmada: regras puras de calculo ficam em `packages/domain`.
- Estimativa da especificacao: 24 a 34 horas.

## Sprint 7 - Template de limpeza de estofados

- Requisito confirmado: primeiro nicho a implementar.
- Requisito confirmado: itens, tamanhos, tecidos, sujeira, manchas, odor, pelos, impermeabilizacao, urgencia, acesso, regras, testes e validacao com empresa real.
- Marco do MVP piloto: nicho completo de limpeza de estofados.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 8 - Template de vidraçaria

- Requisito confirmado: implementar somente depois da validacao do MVP piloto.
- Requisito confirmado: produtos, medidas, vidros, espessuras, cores, acabamentos, ferragens, perfis, instalacao, retirada, acesso, regras de area, area minima, testes e validacao.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 9 - Template de marmoraria

- Requisito confirmado: implementar somente depois da validacao do MVP piloto.
- Requisito confirmado: produtos, materiais, medidas, espessuras, bordas, recortes, frontao, saia, instalacao, transporte, perda tecnica, regras, testes e validacao.
- Estimativa da especificacao: 16 a 22 horas.

## Sprint 10 - Fluxo publico, rascunho e solicitacao

- Requisito confirmado: rascunho seguro no servidor, `draft_token`, dispositivo salva apenas token/etapa, campos configurados, upload, estimativa, revisao, submissao idempotente, codigo, token publico, snapshot, aceites legais, e-mail e limpeza de rascunhos.
- Padrao inicial configuravel: rascunhos expiram em 10 dias.
- Estimativa da especificacao: 22 a 30 horas.

## Sprint 11 - Painel da empresa e revisao

- Requisito confirmado: dashboard, lista, filtros, detalhes, fotos, memoria de calculo, edicao de campos tecnicos, motivo quando necessario, revisao, recalculo, diferenca, aceite/recusa e historico.
- Regra confirmada: estados devem passar por dominio/servicos, nunca por atualizacao livre em controller.
- Estimativa da especificacao: 18 a 26 horas.

## Sprint 12 - Propostas, versoes e valor final

- Requisito confirmado: `quotes`, versoes, codigo por versao, itens, valor final com total interno, validacao de faixa, justificativa fora da faixa, validade, termos, preview, envio idempotente, visualizacao, alteracao, nova versao, bloqueio de versao aceita e expiracao.
- Padrao inicial configuravel: propostas validas por 7 dias.
- Regra confirmada: proposta aceita e imutavel; alteracao comercial posterior gera nova versao.
- Estimativa da especificacao: 20 a 26 horas.

## Sprint 13 - Agendamento assistido

- Requisito confirmado: `appointments`, `scheduling_mode`, data, horario, duracao, timezone, conflito basico com aviso sem bloqueio, confirmacao, solicitacao de outro horario, nova proposta, historico, cancelamento, conclusao e testes.
- Padrao inicial configuravel: timezone inicial das empresas e `America/Sao_Paulo`.
- Fora da V1: agenda automatica completa.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 14 - Acompanhamento, recuperacao e comunicacao

- Requisito confirmado: token e codigo gerados na submissao, tela de acompanhamento, recuperacao, OTP exclusivamente por e-mail, validacao por codigo + e-mail ou codigo + WhatsApp, e-mails transacionais, links `wa.me`, notificacoes internas, vinculacao a conta nova, revogacao/substituicao de token e limites de tentativa.
- Decisao confirmada: nao conectar provedor definitivo de e-mail nesta etapa; planejar interface/adapters futuramente.
- Estimativa da especificacao: 16 a 22 horas.

## Sprint 15 - PDF, aceite e documentos legais

- Requisito confirmado: template PDF, PDF por versao, codigos, validade, itens, agendamento quando existir, termos e versoes, aceite idempotente, IP, user agent, versao da proposta, versoes legais, expiracao e clique duplicado.
- Decisao adiada: textos juridicos definitivos.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 16 - Servico realizado e avaliacoes

- Requisito confirmado: status do servico, marcar realizado, notificar cliente, avaliacao, elegibilidade, bloqueio de duplicacao, exibicao no perfil, media, moderacao e convite por e-mail.
- Estimativa da especificacao: 10 a 16 horas.

## Sprint 17 - Area do cliente

- Requisito confirmado: Home personalizada, solicitacoes, propostas, agendamentos, historico, favoritos, empresas recentes, avaliacoes pendentes, vinculacao de solicitacoes de visitante e notificacoes.
- Estimativa da especificacao: 14 a 20 horas.

## Sprint 18 - Metricas e administracao operacional

- Requisito confirmado: metricas da empresa, metricas Admin, filtros por periodo/nicho/empresa, conversao, tempo de resposta, valores estimado/proposto/aceito, ranking, auditoria e solicitacoes de preco.
- Decisao adiada: analytics externo.
- Estimativa da especificacao: 16 a 24 horas.

## Sprint 19 - PWA, seguranca, desempenho e deploy

- Requisito confirmado: manifest, icones, instalacao, cache seguro, rate limit, permissoes, isolamento, uploads, idempotencia, matriz de estados, timezone, dinheiro, unidades, limpeza de rascunhos, backups, monitoramento, dominio, SSL, homologacao, testes completos, conta piloto, deploy, correcao e suporte.
- Decisoes adiadas: hospedagem, dominio, monitoramento, backups e sistema definitivo de envio de erros.
- Estimativa da especificacao: 22 a 32 horas.
