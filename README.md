# Velaris Orçamentos

Velaris Orçamentos e uma plataforma web responsiva, futuramente instalavel como PWA, para solicitacao, estimativa, revisao, proposta, agendamento assistido, acompanhamento e avaliacao de servicos.

## Fonte de verdade

A fonte principal de verdade do projeto e:

```txt
docs/ESPECIFICACAO_V1.md
```

O conteudo da especificacao nao deve ser alterado sem pedido explicito.

## Estado atual

O projeto concluiu tecnicamente a Sprint 17. Ja existe fundacao tecnica, schema multiempresa,
migrations aplicadas no Neon, autenticacao propria, cadastro empresarial,
status de conta pendente, painel Admin, descoberta publica, perfil publico,
templates fixos, configuracao por empresa com preview/publicacao imutavel e
motor de calculo com regras de preco versionadas, margens, simulacao Admin e
memoria explicavel. O template de limpeza de estofados esta na versao 2, com
itens, tamanhos, tecidos, sujeira, manchas, odor, pelos, impermeabilizacao,
urgencia, acesso, deslocamento e desconto por quantidade. O fluxo publico
`/empresa/:slug/orcamento` cria e retoma rascunho seguro no servidor, permite
multiplos itens, registra metadados de fotos/PDF, calcula estimativa e envia a
solicitacao com codigo publico e idempotencia. O painel da empresa em `/app`
lista solicitacoes, mostra dashboard, detalhe, arquivos, memoria de calculo,
revisao tecnica com motivo, recalculo, aceite para proposta, recusa, historico,
criacao de proposta versionada, preview de valor final, validade, termos e envio
idempotente. Tambem existe agendamento assistido no painel da empresa, com
modos `required_with_proposal`, `optional_with_proposal`,
`after_proposal_acceptance` e `external_only`, tabela de agendamentos, historico,
duracao, timezone da empresa, aviso de conflito sem bloqueio e conclusao de
horario confirmado.

O acompanhamento publico esta disponivel em `/acompanhar/:token`, usando o token
gerado na submissao. A recuperacao esta em `/recuperar`, validando codigo da
solicitacao + e-mail ou WhatsApp informado, enviando OTP exclusivamente pelo
adapter de e-mail e substituindo o token publico apos sucesso. A tela publica
tambem permite confirmar horario ou pedir outro horario quando houver agendamento
ativo e exibe link assistido `wa.me`.

O tracking publico tambem exibe a proposta completa, abre o PDF da proposta por
versao gerado sob demanda pelo backend, permite aceite formal idempotente,
permite recusa formal e registra o aceite em `quote_acceptances` com versoes
legais iniciais, IP e user agent quando disponiveis.

O fluxo de servico realizado e avaliacoes tambem esta implementado tecnicamente:
ao concluir um horario confirmado, a empresa marca o atendimento como realizado,
o backend dispara convite por adapter de e-mail `stub`, o cliente pode avaliar
pelo acompanhamento publico quando elegivel, a avaliacao aparece no perfil
publico, a media da empresa e recalculada e o Admin pode moderar avaliacoes.

A area autenticada do cliente esta disponivel em `/cliente`. Clientes podem
criar conta em `/cadastro/cliente`, entrar pelo login comum, ver solicitacoes,
propostas aguardando confirmacao, proximos agendamentos, historico, favoritos,
empresas recentes, avaliacoes pendentes e notificacoes. Tambem e possivel
favoritar empresas pelo perfil publico e vincular solicitacoes de visitante
quando o contato da solicitacao corresponde ao e-mail ou telefone da conta.

Ainda nao ha textos juridicos definitivos, armazenamento binario definitivo,
metricas, PWA ou deploy. Vidracaria e marmoraria seguem adiadas ate a validacao
do MVP piloto; a proxima etapa recomendada para o MVP e a Sprint 18, metricas e
administracao operacional.

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
