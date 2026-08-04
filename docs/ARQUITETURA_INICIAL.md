# Arquitetura Inicial - Velaris Orçamentos

## Fonte de verdade

- Requisito confirmado: `docs/ESPECIFICACAO_V1.md` e a fonte principal de verdade do projeto.
- Requisito confirmado: o conteudo da especificacao deve ser preservado integralmente.
- Requisito confirmado: a matriz inicial de estados e transicoes da especificacao deve ser adotada como fonte de verdade.

## Decisoes confirmadas

- Nome oficial do produto: Velaris Orçamentos.
- Produto: web app responsivo e futuramente instalavel como PWA.
- Arquitetura: multiempresa.
- Primeiro nicho do MVP: limpeza de estofados.
- Vidraçaria e marmoraria serao implementadas somente depois da validacao do MVP.
- Escopo do MVP piloto: secao 34.1 da especificacao.
- Banco: PostgreSQL no Neon.
- O frontend nunca acessara o Neon diretamente.
- Todo acesso ao banco ocorrera pelo backend.
- Itens fora da V1 nao devem ser implementados.

## Stack confirmada

### Base

- TypeScript.
- Modulos ESM.
- Monorepo.
- npm workspaces.
- Sem Turborepo inicialmente.
- Node.js na versao atualmente instalada.
- npm na versao atualmente instalada.

### Frontend

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- React Router.
- TanStack Query.
- React Hook Form.
- Zod.
- Lucide Icons quando forem necessarios icones.

### Backend

- Node.js.
- Express.
- TypeScript.
- Zod.
- Pino para logs.
- Tratamento global e padronizado de erros.

### Banco de dados

- PostgreSQL no Neon.
- Drizzle ORM.
- Drizzle Kit para migrations.
- `pg`/node-postgres como driver.
- `TIMESTAMPTZ` para datas.
- `NUMERIC(12, 2)` para valores monetarios persistidos.
- `JSONB` para snapshots e metadados quando adequado.

### Autenticacao

- Autenticacao propria.
- Argon2id para hash de senhas.
- Access token JWT de curta duracao.
- Refresh tokens persistidos e revogaveis.
- Cookies `httpOnly`, `secure` e `sameSite` adequado quando aplicavel.
- Autorizacao por funcao e vinculo empresarial.

### Testes e qualidade

- Vitest para testes unitarios.
- Supertest para testes da API.
- Playwright para testes E2E.
- ESLint.
- Prettier.
- TypeScript em modo estrito.
- Scripts padronizados no `package.json`.

## Arquitetura proposta

Recomendacao tecnica: iniciar como monorepo TypeScript com uma API modular monolitica. O escopo exige consistencia transacional entre solicitacoes, propostas, versoes, agendamentos, aceites, auditoria e idempotencia; microservicos nao sao recomendados para a V1.

Recomendacao tecnica: separar dominio puro, contratos compartilhados, API e UI para reduzir acoplamento e facilitar testes.

Recomendacao tecnica: manter o motor de calculo em `packages/domain`, sem dependencia direta de HTTP, banco ou componentes visuais.

Recomendacao tecnica: manter schemas, tipos, enums de status, constantes, contratos HTTP e validacoes compartilhadas em `packages/shared`.

Requisito implementado: a API usa servicos de aplicacao para Auth, Admin e Company Account, com repositorios Drizzle no runtime e repositorios em memoria nos testes.

Requisito implementado: mudancas de estado administrativo de empresas passam por funcoes puras em `packages/domain` e por servicos de aplicacao, nao por atualizacao livre em controllers.

Requisito implementado: descoberta publica usa API propria em `apps/api/src/public`, com contratos em `packages/shared`, filtro por empresa ativa/perfil publicado e calculo puro de distancia em `packages/domain`.

Requisito implementado: dados de perfil publico ficam em `company_public_profiles`, separados de `companies`, para permitir publicacao, busca, servicos, galeria, contatos, localizacao e regioes atendidas sem expor dados internos.

Requisito implementado: templates fixos e configuracoes por empresa usam contratos em `packages/shared`, regras puras de ciclo/condicoes em `packages/domain`, servico de aplicacao em `apps/api/src/templates` e persistencia Drizzle no backend.

Requisito implementado: configuracoes publicadas sao imutaveis no servico de dominio/aplicacao; alteracoes futuras criam novo rascunho/versionamento e a publicacao grava snapshot em `JSONB`.

Requisito implementado: o motor de calculo fica em `packages/domain`, sem dependencia de HTTP, banco ou UI, e trabalha com centavos inteiros, basis points para percentuais, medidas normalizadas, memoria explicavel e resultado deterministico.

Requisito implementado: contratos de precificacao, respostas tecnicas, regras, snapshots e resultado de calculo ficam em `packages/shared`, permitindo uso consistente entre API, dominio e web sem expor codigo interno da API ao frontend.

Requisito implementado: regras de preco e versoes de preco sao persistidas no backend por `template_pricing_rules`, `company_pricing_versions` e `company_pricing_rules`; valores monetarios persistidos usam `NUMERIC(12, 2)` e snapshots comerciais usam `JSONB`.

Requisito implementado: o frontend Admin consome somente a API para listar templates, criar/editar rascunhos, ajustar campos, ajustar regras de preco permitidas, simular preview/calculo e publicar configuracoes; ele nao acessa o Neon diretamente.

Requisito implementado: o template de limpeza de estofados possui versionamento proprio (`templateVersion`) nos contratos e snapshots; a versao tecnica atual e v2.

Requisito implementado: novos rascunhos criados a partir de uma versao publicada mesclam o template atual com as personalizacoes existentes, adicionando campos/regras novos sem editar configuracoes publicadas.

Requisito implementado: o fluxo publico de solicitacao fica em `apps/api/src/public`, separado da descoberta publica, com `PublicQuoteRequestService`, repositório proprio, contratos em `packages/shared` e regras puras de ciclo/calculo em `packages/domain`.

Requisito implementado: rascunhos publicos persistem em `quote_requests`, respostas normalizadas em `quote_request_answers`, arquivos em `quote_request_files`, calculos em `quote_request_calculations`, tokens publicos em `public_access_tokens` e envios criticos em `idempotency_keys`.

Requisito implementado: o token bruto de rascunho fica somente no dispositivo do visitante; o backend persiste apenas `draft_token_hash`.

Requisito implementado: o modelo publico aceita multiplas linhas de item. Quantidade representa itens identicos; quando dois itens tem atributos diferentes, cada um deve ser uma linha separada.

Requisito implementado: a estimativa publica agrupa calculos por item e aplica regras de pedido, como deslocamento, desconto por quantidade, minimo e arredondamento, uma unica vez no agregado.

Requisito implementado: a submissao publica exige `Idempotency-Key` UUID v4, gera codigo da solicitacao, token publico e snapshots de configuracao, aceite legal e calculo.

Requisito implementado: a revisao empresarial de solicitacoes fica em `apps/api/src/company`, com `CompanyQuoteRequestService`, repositorio Drizzle especifico, contratos em `packages/shared` e transicoes puras em `packages/domain`.

Requisito implementado: solicitacoes submetidas podem transicionar para `under_review`, `accepted_for_proposal` ou `declined_by_company` apenas por servico de aplicacao usando a matriz de estados da especificacao.

Requisito implementado: revisoes tecnicas persistem auditoria em `quote_request_answer_revisions`, eventos em `quote_request_events` e recalculos em `quote_request_calculations`, preservando snapshot de calculo e versoes de configuracao/preco.

Requisito implementado: o painel da empresa em `apps/web` consome somente endpoints da API para dashboard, lista, detalhe, revisao, recalculo, aceite para proposta e recusa; nao acessa o Neon diretamente.

Requisito implementado: propostas comerciais ficam separadas das solicitacoes. A Sprint 12 adiciona `quotes` como container da proposta da solicitacao e `quote_versions` como cada versao comercial imutavel/auditavel, com itens em `quote_version_items` e eventos em `quote_version_events`.

Requisito implementado: a API da empresa cria versoes comerciais apenas para solicitacoes em `accepted_for_proposal`, sugere o valor final a partir do total interno recalculado, valida faixa estimada, exige justificativa fora da faixa, bloqueia valor negativo/zero nao gratuito e preserva snapshots de solicitacao, calculo, itens, termos e totais.

Requisito implementado: envio de proposta ocorre pelo backend em `POST /api/company/proposals/:id/send`, exige `Idempotency-Key` UUID v4, persiste a chave em `idempotency_keys` e retorna o estado atual sem duplicar envio quando a mesma chave e repetida.

Requisito implementado: o painel `/app` permite criar preview/versao de proposta no detalhe da solicitacao aceita para proposta e enviar a ultima versao em rascunho. O frontend continua sem acesso direto ao Neon.

Requisito implementado: agendamento assistido fica separado de propostas em `appointments` e `appointment_history`. A Sprint 13 adiciona contratos compartilhados em `packages/shared`, transicoes puras em `packages/domain`, servico de aplicacao em `apps/api/src/company` e persistencia Drizzle no backend.

Requisito implementado: modos `required_with_proposal`, `optional_with_proposal`, `after_proposal_acceptance` e `external_only` sao validados no backend. Quando o servico e `required_with_proposal`, o envio da proposta exige horario ativo antes de chamar a transicao de envio.

Requisito implementado: horarios persistem data, fim calculado, duracao, timezone da empresa, endereco/snapshot, observacoes, responsavel, conflitos avisados e historico. Conflitos basicos sao detectados por sobreposicao de horario da mesma empresa e retornam aviso sem bloqueio.

Requisito implementado: o painel `/app` consome somente a API para propor horario, cancelar, reagendar quando o cliente pedir outro horario e marcar como concluido quando confirmado. O frontend continua sem acesso direto ao Neon.

Requisito implementado: acompanhamento publico fica no backend por token bruto no link e hash em `public_access_tokens`. A rota `GET /api/public/tracking/:token` retorna estado da solicitacao, estimativa, proposta resumida, agendamentos, dados do servico e link `wa.me` quando o perfil publico possui WhatsApp.

Requisito implementado: recuperacao publica usa `recovery_codes` com token de recuperacao hasheado, OTP hasheado, validade curta, uso unico, tentativas limitadas e metadados de auditoria. A validacao aceita codigo + e-mail ou codigo + WhatsApp informado na solicitacao, mas o OTP automatico e enviado exclusivamente por e-mail.

Requisito implementado: a confirmacao publica de horario e o pedido de outro horario usam `POST /api/public/tracking/:token/appointment`, mas ainda passam pelo mesmo `CompanyAppointmentService` e pelas transicoes de `packages/domain`.

Requisito implementado: notificacoes internas iniciais ficam em `notifications` para nova solicitacao, acoes publicas de horario, avaliacoes e vinculacao de solicitacoes. A Sprint 17 expoe notificacoes do cliente na home autenticada `/cliente`.

Requisito implementado: a visualizacao publica completa da proposta usa `GET /api/public/tracking/:token/proposal`, o aceite e a recusa usam rotas publicas idempotentes, e o PDF por versao e gerado sob demanda no backend em `GET /api/public/tracking/:token/proposal/pdf`.

Limitacao registrada: textos juridicos definitivos e armazenamento privado definitivo de arquivos seguem como decisoes futuras; o PDF atual e gerado sob demanda a partir da versao imutavel da proposta.

Requisito implementado: servico realizado e avaliacoes usam regra pura em `packages/domain/src/service-lifecycle.ts`, contratos em `packages/shared/src/reviews.ts`, coluna `appointments.service_status` e tabela `reviews`.

Requisito implementado: a empresa marca atendimento confirmado como realizado pelo servico de aplicacao de agendamento; o status de servico nao e atualizado livremente por controller.

Requisito implementado: avaliacao publica e criada somente por `POST /api/public/reviews`, com token publico, `Idempotency-Key`, proposta aceita, horario confirmado/concluido, servico realizado e ausencia de avaliacao anterior para o mesmo agendamento.

Requisito implementado: avaliacoes visiveis aparecem no perfil publico, atualizam media/contagem em `company_public_profiles` e podem ser moderadas pelo Admin em `PATCH /api/admin/reviews/:reviewId/moderation`.

Requisito implementado: a area autenticada do cliente fica em `apps/api/src/customer` e `apps/web/src/pages/customer-pages.tsx`, com contratos em `packages/shared/src/customer.ts`. A API protegida `/api/customer/*` exige usuario autenticado com papel `customer`.

Requisito implementado: favoritos de cliente ficam em `customer_favorite_companies`, com unicidade por par cliente/empresa e acesso sempre pelo backend. O perfil publico da empresa chama `POST /api/customer/favorites` para favoritar sem expor acesso direto ao banco.

Requisito implementado: a home `/cliente` organiza solicitacoes em andamento, propostas aguardando confirmacao, proximos agendamentos, historico, empresas recentes, favoritos, avaliacoes pendentes, notificacoes e atalhos de descoberta/categorias.

Requisito implementado: a vinculacao de solicitacoes de visitante ocorre por `POST /api/customer/link-visitor-requests`, comparando o contato da solicitacao com o e-mail verificado da conta autenticada e mantendo rascunhos fora da area do cliente.

Limitacao registrada: a especificacao permite e-mail ou telefone verificado para vinculo de visitante; a implementacao atual usa e-mail verificado porque ainda nao existe verificacao de telefone.

Recomendacao tecnica: usar adapters/interfaces no backend para e-mail e armazenamento privado, sem escolher fornecedor definitivo nesta etapa. O adapter de e-mail existe em modo `stub`; fornecedor, remetente e templates seguem pendentes.

Limitacao registrada: `quote_request_files` registra metadados de fotos/PDF com `storageProvider = stub`; armazenamento binario privado, thumbnails e URLs temporarias aguardam decisao futura.

## Estrutura de monorepo

```txt
apps/
  web/
  api/

packages/
  shared/
  domain/
  config/
  ui/

database/
  migrations/
  seeds/
  schemas/

tests/
  unit/
  integration/
  e2e/

docs/
  references/
    visual/

assets/
  brand/

ImagesExemplos/
```

## Responsabilidades por pasta

- `apps/web`: aplicacao React/Vite, rotas de tela, integracao com API e PWA futuro.
- `apps/api`: API Express, autenticacao, autorizacao, controllers, servicos de aplicacao, adapters, jobs e acesso ao banco.
- `packages/shared`: tipos, schemas Zod, contratos, constantes, enums e helpers compartilhados.
- `packages/domain`: regras puras de negocio, maquinas de estado, motor de calculo, dinheiro, medidas, snapshots e validacoes de dominio.
- `packages/config`: configuracoes compartilhadas de TypeScript, ESLint, Prettier e testes quando forem inicializadas.
- `packages/ui`: componentes visuais reutilizaveis que nao dependem da API.
- `database/migrations`: migrations Drizzle revisaveis.
- `database/seeds`: seeds ficticios e scripts de carga local quando autorizados.
- `database/schemas`: organizacao dos schemas Drizzle quando a Sprint 1/2 iniciar.
- `tests/unit`: testes unitarios.
- `tests/integration`: testes de integracao e API.
- `tests/e2e`: testes Playwright.
- `docs/references/visual`: referencias documentais e analises visuais.
- `ImagesExemplos`: imagens de referencia fornecidas pelo usuario.
- `assets/brand`: ativos finais aprovados para uso no produto.

## Regras arquiteturais obrigatorias

- Regras puras de negocio devem ficar em `packages/domain`.
- Tipos, schemas, contratos e constantes compartilhadas devem ficar em `packages/shared`.
- Configuracoes compartilhadas devem ficar em `packages/config`.
- Componentes visuais reutilizaveis devem ficar em `packages/ui`.
- A aplicacao web nao podera importar codigo interno exclusivo da API.
- A API nao devera depender de componentes visuais.
- O frontend nunca devera acessar o banco diretamente.
- Toda operacao empresarial devera validar usuario autenticado, vinculo em `company_members`, funcao permitida e `company_id` do recurso.
- Nunca confiar apenas em IDs recebidos pela rota.
- Estados nao poderao ser atualizados livremente por rotas ou controllers.
- Alteracoes de estado deverao passar por servicos ou funcoes de dominio.

## Requisitos tecnicos confirmados

- Dinheiro nao deve usar ponto flutuante nas regras de negocio.
- Calculos internos devem trabalhar preferencialmente com centavos inteiros.
- Persistencia monetaria deve usar `NUMERIC(12, 2)`.
- Medidas devem guardar valor e unidade originais, alem do valor e unidade normalizados.
- Acoes criticas devem prever idempotencia.
- Conflitos de horario da V1 devem avisar e nao bloquear.
- Agendamentos devem preservar timezone da empresa, endereco/snapshot, duracao e historico de transicoes.
- Configuracoes publicadas devem ser imutaveis.
- Configuracoes publicadas devem gerar snapshot com template, campos, opcoes, condicoes, regras, precos, margens, modo de agendamento e dados de calculo usados naquela versao.
- Propostas aceitas devem ser imutaveis.
- Alteracoes comerciais posteriores devem gerar nova versao.
- Snapshots devem preservar regras, precos e configuracoes usados em cada solicitacao.
- Variaveis sensiveis devem permanecer fora do codigo.
- Nenhuma credencial real deve ser criada, solicitada ou escrita em arquivos versionados.
- Toda migration deve ser revisavel e reversivel quando tecnicamente possivel.
- O sistema deve estar preparado para ambientes local, homologacao e producao.

## Padroes iniciais configuraveis

- Expiracao de rascunhos: 10 dias.
- Validade inicial das propostas: 7 dias.
- Timezone inicial das empresas: `America/Sao_Paulo`.
- Locale inicial da interface: `pt-BR`.
- Moeda inicial: real brasileiro, `BRL`.

## Fora da V1

- Pagamento integrado, cobranca de taxa, estorno e nota fiscal.
- Assinatura digital certificada.
- Agenda automatica completa, equipes, estoque e financeiro.
- WhatsApp Cloud API, OTP automatico por WhatsApp e recuperacao por SMS.
- Video.
- Solicitacao aberta para varias empresas.
- Dominio proprio, white label completo, CSS/fontes/layouts personalizados por empresa.
- Construtor livre de formularios, editor livre de formulas e novos tipos de campo criados pelo Admin.
- Inteligencia artificial, integracao com fornecedores e app nativo separado.

## Servicos adiados

- Provedor definitivo de e-mail transacional.
- Armazenamento privado de arquivos.
- Hospedagem do frontend.
- Hospedagem da API.
- Dominio.
- Monitoramento.
- Backups.
- Textos juridicos definitivos.
- Analytics.
- Tokens visuais finais.
- Fontes finais da identidade.
- Sistema definitivo de envio de erros.

Para e-mail e armazenamento, a recomendacao tecnica e planejar contratos/interfaces trocaveis, sem conectar servicos pagos nesta etapa.
