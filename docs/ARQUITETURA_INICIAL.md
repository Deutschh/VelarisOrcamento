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

Recomendacao tecnica: usar adapters/interfaces no backend para e-mail e armazenamento privado, sem escolher fornecedor definitivo nesta etapa. O adapter de e-mail existe em modo `stub`; fornecedor, remetente e templates seguem pendentes.

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
