# Velaris Orçamentos

Velaris Orçamentos e uma plataforma web responsiva, futuramente instalavel como PWA, para solicitacao, estimativa, revisao, proposta, agendamento assistido, acompanhamento e avaliacao de servicos.

## Fonte de verdade

A fonte principal de verdade do projeto e:

```txt
docs/ESPECIFICACAO_V1.md
```

O conteudo da especificacao nao deve ser alterado sem pedido explicito.

## Estado atual

O projeto esta na Sprint 1, com a fundacao tecnica inicial criada. Ja existe
scaffolding de frontend, API, pacotes compartilhados, configuracao TypeScript,
lint, formatacao, testes unitarios/API, build e health check.

Ainda nao ha tabelas de negocio, migrations reais, autenticacao funcional,
fluxos de orcamento, conexao ao Neon com credenciais reais ou deploy.

## Stack planejada

- Base: TypeScript, ESM, monorepo e npm workspaces.
- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack
  Query, React Hook Form, Zod e Lucide Icons.
- Backend: Node.js, Express, TypeScript, Zod, Pino e tratamento global de
  erros.
- Banco: PostgreSQL no Neon com Drizzle ORM, Drizzle Kit e `pg`.
- Autenticacao: propria, Argon2id, JWT curto, refresh tokens revogaveis e
  cookies seguros quando aplicavel.
- Testes: Vitest, Supertest e Playwright.
- Qualidade: ESLint, Prettier e TypeScript em modo estrito.

## Estrutura do monorepo

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

## Organizacao visual

- `ImagesExemplos/`: referencias visuais fornecidas pelo usuario. Nao modificar, renomear, mover ou usar automaticamente como ativos finais.
- `assets/brand/`: materiais oficiais aprovados para uso real no produto.
- `docs/SISTEMA_VISUAL_INICIAL.md`: registro das observacoes visuais e decisoes pendentes.

## Regras importantes

- O frontend nunca deve acessar o Neon diretamente.
- Todo acesso ao banco deve ocorrer pelo backend.
- Regras puras de negocio ficam em `packages/domain`.
- Tipos, schemas, contratos e constantes compartilhadas ficam em `packages/shared`.
- Nenhuma credencial real deve ser versionada.
- Nao iniciar a Sprint 2 sem nova autorizacao.

## Scripts

```txt
npm run dev:api       # API Express em desenvolvimento
npm run dev:web       # Web React/Vite em desenvolvimento
npm run build         # Build dos pacotes, API e web
npm run typecheck     # TypeScript estrito
npm run test          # Vitest nos workspaces
npm run test:e2e      # Playwright, sem testes E2E reais ainda
npm run lint          # ESLint
npm run format:check  # Prettier em modo verificacao
```
