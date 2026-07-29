# Velaris Orçamentos

Velaris Orçamentos e uma plataforma web responsiva, futuramente instalavel como PWA, para solicitacao, estimativa, revisao, proposta, agendamento assistido, acompanhamento e avaliacao de servicos.

## Fonte de verdade

A fonte principal de verdade do projeto e:

```txt
docs/ESPECIFICACAO_V1.md
```

O conteudo da especificacao nao deve ser alterado sem pedido explicito.

## Estado atual

O projeto concluiu tecnicamente a Sprint 7. Ja existe fundacao tecnica, schema multiempresa,
migrations aplicadas no Neon, autenticacao propria, cadastro empresarial,
status de conta pendente, painel Admin, descoberta publica, perfil publico,
templates fixos, configuracao por empresa com preview/publicacao imutavel e
motor de calculo com regras de preco versionadas, margens, simulacao Admin e
memoria explicavel. O template de limpeza de estofados esta na versao 2, com
itens, tamanhos, tecidos, sujeira, manchas, odor, pelos, impermeabilizacao,
urgencia, acesso, deslocamento e desconto por quantidade.

Ainda nao ha fluxo publico completo de orcamento, uploads, propostas,
agendamento assistido completo, PDF ou deploy. Vidracaria e marmoraria seguem
adiadas ate a validacao do MVP piloto; a proxima etapa recomendada para o MVP e
a Sprint 10, fluxo publico, rascunho e solicitacao.

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
- Credenciais reais ficam apenas em `.env`, nunca em arquivos versionados.

## Scripts

```txt
npm run dev:api       # API Express em desenvolvimento
npm run dev:web       # Web React/Vite em desenvolvimento
npm run build         # Build dos pacotes, API e web
npm run typecheck     # TypeScript estrito
npm run test          # Vitest nos workspaces
npm run test:e2e      # Playwright nas rotas principais
npm run lint          # ESLint
npm run format:check  # Prettier em modo verificacao
npm run db:generate   # Gera migrations Drizzle
npm run db:migrate    # Aplica migrations no banco configurado
npm run admin:create  # Cria o primeiro Admin usando ADMIN_* do .env local
```

## Bootstrap Admin

Para criar o primeiro usuario Admin, preencha somente no `.env` local:

```txt
ADMIN_NAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Depois execute `npm run admin:create`. O script nao possui credenciais padrao e
nao deve ser executado com valores reais em arquivos versionados.
