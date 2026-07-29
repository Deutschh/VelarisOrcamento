# AGENTS.md - Velaris Orçamentos

## Fonte de verdade

- A fonte principal de verdade do projeto e `docs/ESPECIFICACAO_V1.md`.
- O conteudo da especificacao deve ser preservado integralmente, salvo pedido explicito do usuario.
- Antes de implementar qualquer funcionalidade, consultar `docs/ESPECIFICACAO_V1.md` e os documentos derivados em `docs/`.
- A matriz inicial de estados e transicoes da especificacao deve ser adotada como fonte de verdade. Nao criar matriz incompatível.

## Escopo e parada atual

- Esta etapa consolida decisoes, organiza workspace e inicializa Git.
- Nao instalar dependencias.
- Nao implementar frontend.
- Nao implementar backend.
- Nao criar tabelas ou migrations reais.
- Nao conectar ao Neon.
- Nao criar arquivos com credenciais.
- Nao fazer deploy.
- Nao implementar regras de negocio.
- Nao alterar configuracoes globais do Windows.
- Nao iniciar a Sprint 1 sem nova autorizacao do usuario.

## Decisoes de produto confirmadas

- Nome oficial: Velaris Orçamentos.
- Produto: web app responsivo, futuramente instalavel como PWA.
- Arquitetura: multiempresa.
- MVP piloto: definido pela secao 34.1 da especificacao.
- Primeiro nicho: limpeza de estofados.
- Vidraçaria e marmoraria entram somente depois da validacao do MVP.
- Itens fora da V1 nao devem ser implementados.
- Banco: PostgreSQL no Neon.
- O frontend nunca acessa o Neon diretamente; todo acesso ao banco ocorre pelo backend.

## Stack tecnica confirmada

- Base: TypeScript, modulos ESM, monorepo, npm workspaces, sem Turborepo inicialmente.
- Runtime: Node.js e npm nas versoes atualmente instaladas no workspace.
- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod e Lucide Icons quando forem necessarios icones.
- Backend: Node.js, Express, TypeScript, Zod, Pino e tratamento global padronizado de erros.
- Banco: PostgreSQL no Neon, Drizzle ORM, Drizzle Kit, `pg`/node-postgres, `TIMESTAMPTZ`, `NUMERIC(12, 2)` e `JSONB`.
- Autenticacao: propria, Argon2id, access token JWT curto, refresh tokens persistidos/revogaveis e cookies `httpOnly`, `secure` e `sameSite` adequado quando aplicavel.
- Testes: Vitest, Supertest e Playwright.
- Qualidade: ESLint, Prettier, TypeScript em modo estrito e scripts padronizados no `package.json`.

## Estrutura arquitetural obrigatoria

- Regras puras de negocio ficam em `packages/domain`.
- Tipos, schemas, contratos e constantes compartilhadas ficam em `packages/shared`.
- Configuracoes compartilhadas ficam em `packages/config`.
- Componentes visuais reutilizaveis ficam em `packages/ui`.
- A aplicacao web nao pode importar codigo interno exclusivo da API.
- A API nao deve depender de componentes visuais.
- O frontend nunca deve acessar o banco diretamente.
- Todo acesso ao banco deve ocorrer pelo backend.

## Regras permanentes de seguranca e dominio

- Toda operacao empresarial deve validar usuario autenticado, vinculo em `company_members`, funcao permitida e `company_id` do recurso.
- Nunca confiar apenas em IDs recebidos pela rota.
- Valores monetarios nao podem usar ponto flutuante nas regras de negocio.
- Calculos internos devem trabalhar preferencialmente com centavos inteiros.
- Valores monetarios persistidos devem usar `NUMERIC(12, 2)`.
- Medidas devem guardar valor/unidade originais e valor/unidade normalizados.
- Alteracoes de estado devem passar por servicos ou funcoes de dominio.
- Estados nao podem ser atualizados livremente por rotas ou controllers.
- Acoes criticas devem prever idempotencia.
- Configuracoes publicadas devem ser imutaveis.
- Propostas aceitas devem ser imutaveis.
- Alteracoes comerciais posteriores devem gerar nova versao.
- Snapshots devem preservar regras, precos e configuracoes usados em cada solicitacao.
- Variaveis sensiveis devem permanecer fora do codigo.
- Nenhuma credencial real deve ser criada, solicitada ou escrita em arquivos versionados.
- Toda migration deve ser revisavel e reversivel quando tecnicamente possivel.
- O sistema deve permanecer preparado para ambientes local, homologacao e producao.

## Padroes iniciais configuraveis

- Expiracao de rascunhos: 10 dias.
- Validade inicial das propostas: 7 dias.
- Timezone inicial das empresas: `America/Sao_Paulo`.
- Locale inicial da interface: `pt-BR`.
- Moeda inicial: real brasileiro, `BRL`.

## Referencias visuais

- `ImagesExemplos/` e reservado para referencias visuais fornecidas pelo usuario.
- Nao renomear, mover, excluir ou modificar imagens originais em `ImagesExemplos/`.
- Tratar imagens dessa pasta apenas como referencia visual.
- Nao usar automaticamente essas imagens como ativos finais do produto.
- Nao copiar logotipos, textos ou elementos especificos sem confirmar que sao materiais oficiais da marca.
- `assets/brand/` e reservado para logos, icones e ativos aprovados para uso real no produto.
- A analise visual deve ser registrada em `docs/SISTEMA_VISUAL_INICIAL.md`.

## Servicos adiados

- Nao escolher nem conectar servicos definitivos de e-mail, armazenamento privado, hospedagem do frontend, hospedagem da API, dominio, monitoramento, backups, analytics ou envio definitivo de erros nesta etapa.
- Para e-mail e armazenamento, planejar apenas contratos/interfaces trocaveis futuramente.
- Nao conectar servicos pagos sem autorizacao explicita.

## Ordem de trabalho

- Seguir a ordem das sprints da especificacao.
- Sprint 0 deve fechar fluxos, matriz de estados, modos de agendamento, textos legais, mapa de rotas, wireframes, prototipo navegavel e separacao entre MVP piloto e V1 completa.
- Sprint 1 inicia a fundacao tecnica somente apos nova autorizacao do usuario.
