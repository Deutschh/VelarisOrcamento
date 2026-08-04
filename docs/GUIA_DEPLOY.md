# Guia de Deploy - Velaris Orcamentos

Atualizado em: 2026-08-04.

Este guia descreve o processo recomendado para publicar o Velaris Orcamentos com
frontend na Vercel, API na Render e banco PostgreSQL no Neon. Ele nao deve conter
segredos reais.

## Decisao recomendada

```txt
Frontend: Vercel
API: Render Web Service
Banco: Neon PostgreSQL
Dominio: velarisorcamentos.com.br
```

Subdominios recomendados:

```txt
app.velarisorcamentos.com.br -> frontend Vercel
api.velarisorcamentos.com.br -> API Render
www.velarisorcamentos.com.br -> landing/redirecionamento futuro
velarisorcamentos.com.br     -> landing/redirecionamento futuro
```

## O que ja foi ajustado no codigo

- A API aceita `PORT` injetado pela plataforma e escuta em `0.0.0.0`.
- O frontend aceita `VITE_API_BASE_URL` para chamar a API em outro dominio.
- O link publico do PDF usa o mesmo resolvedor de URL da API.
- O `.env.example` documenta `PORT` e `VITE_API_BASE_URL` sem valores secretos.
- O build de producao nao compila arquivos `*.test.ts`.
- A raiz declara Node `22.x` para a Vercel e `.node-version`/`.nvmrc` mantem
  `22.15.0` para ambientes que suportam versao exata.
- O `vercel.json` fixa install, build e output do frontend no monorepo.

## Antes de publicar

1. Confirme que todas as alteracoes foram commitadas.
2. Confirme que `docs/ESPECIFICACAO_V1.md` nao foi alterado.
3. Rode localmente:

```txt
npm run typecheck
npm run lint
npm test
npm run build -w @velaris/web
npm run check:production
```

4. Resolva qualquer erro bloqueante.
5. Nao execute `npm run maintenance:cleanup` em banco real sem decidir antes,
   porque ele remove rascunhos, idempotencias e OTPs expirados.

## Deploy da API na Render

### Criacao do servico

1. Acesse a Render.
2. Crie um novo **Web Service**.
3. Conecte o repositorio Git do Velaris.
4. Use o branch principal, normalmente `main`.
5. Configure como Node.js.

### Comandos

Build command:

```txt
npm ci --include=dev && npm run build -w @velaris/database-schema && npm run build -w @velaris/shared && npm run build -w @velaris/domain && npm run build -w @velaris/api
```

O `--include=dev` e necessario porque o build usa ferramentas de
desenvolvimento, como TypeScript. Os arquivos de teste nao entram no build de
producao.

Start command:

```txt
npm run start -w @velaris/api
```

Health check path:

```txt
/health
```

### Variaveis de ambiente da API

Definir na Render, nunca no codigo:

```txt
NODE_ENV=production
APP_NAME=Velaris Orcamentos
APP_LOCALE=pt-BR
APP_TIMEZONE=America/Sao_Paulo
APP_CURRENCY=BRL

DATABASE_URL=<valor_real_do_Neon>
DATABASE_SSL_MODE=require

CORS_ORIGIN=https://app.velarisorcamentos.com.br
# Opcional: use quando precisar liberar dominio final e URL temporaria da Vercel.
CORS_ORIGINS=
TRUST_PROXY=true
SECURITY_HSTS_ENABLED=true

RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=30

JWT_ACCESS_TOKEN_SECRET=<segredo_forte>
JWT_REFRESH_TOKEN_SECRET=<segredo_forte>
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30

DRAFT_EXPIRATION_DAYS=10
QUOTE_VALIDITY_DAYS=7
PUBLIC_RECOVERY_OTP_TTL_MINUTES=10
PUBLIC_RECOVERY_MAX_ATTEMPTS=5

EMAIL_PROVIDER=stub
FILE_STORAGE_PROVIDER=stub
```

Nao definir manualmente `PORT` na Render, a menos que a propria plataforma peca.
A Render injeta `PORT` automaticamente.

Se estiver testando antes de o dominio final estar ativo, configure a Render com
a origem exata aberta no navegador. Exemplos:

```txt
CORS_ORIGIN=https://app.velarisorcamentos.com.br
```

ou, temporariamente, para liberar tambem a URL da Vercel:

```txt
CORS_ORIGINS=https://app.velarisorcamentos.com.br,https://seu-projeto.vercel.app
```

O valor precisa ser exatamente o `origin` do navegador: protocolo `https`,
subdominio e dominio, sem barra final.

### Dominio da API

1. No servico da Render, adicione o dominio customizado:

```txt
api.velarisorcamentos.com.br
```

2. A Render mostrara o registro DNS necessario.
3. No Registro.br, crie o registro indicado pela Render.
4. Volte na Render e clique para verificar o dominio.
5. Aguarde o TLS/HTTPS ficar ativo.

## Deploy do frontend na Vercel

### Criacao do projeto

1. Acesse a Vercel.
2. Importe o mesmo repositorio Git.
3. Configure como projeto Vite/React.
4. Use a raiz do repositorio como base do monorepo.
5. Em **Settings > Build and Deployment > Node.js Version**, selecione `22.x`
   se a Vercel nao respeitar automaticamente o `engines.node`.

### Configuracao do build

Build command:

```txt
npm run build -w @velaris/shared && npm run build -w @velaris/ui && npm run build -w @velaris/web
```

Output directory:

```txt
apps/web/dist
```

Install command:

```txt
npm ci --include=dev
```

Se a Render ou a Vercel reaproveitar cache antigo depois de uma correcao de
build, use a opcao de redeploy limpando o cache do build.

### Variaveis de ambiente do frontend

Definir na Vercel:

```txt
VITE_API_BASE_URL=https://api.velarisorcamentos.com.br
VITE_VELARIS_CONTACT_URL=<url_publica_de_contato_quando_definida>
```

Se o contato oficial ainda nao estiver definido, manter
`VITE_VELARIS_CONTACT_URL` vazio.

### Dominio do frontend

1. No projeto da Vercel, adicione:

```txt
app.velarisorcamentos.com.br
```

2. A Vercel mostrara os registros DNS necessarios.
3. No Registro.br, crie os registros indicados.
4. Volte na Vercel e aguarde a verificacao.
5. Quando estiver tudo verde, acesse:

```txt
https://app.velarisorcamentos.com.br
```

## DNS no Registro.br

Nao invente registros antes de ver as instrucoes da Vercel/Render. Em geral:

- `app` sera um CNAME apontando para a Vercel.
- `api` sera um CNAME apontando para a Render.
- `www` e o dominio raiz podem ficar para uma landing page futura.

Depois, para e-mail transacional, tambem serao adicionados registros SPF, DKIM e
DMARC conforme o provedor escolhido.

## Migrations no Neon

Para o primeiro deploy, use um banco de homologacao/producao separado do local.
Antes de liberar uso real:

1. Confirme `DATABASE_URL` do ambiente alvo.
2. Rode as migrations intencionalmente:

```txt
npm run db:migrate
```

3. Nunca cole credenciais reais em arquivo versionado.
4. Guarde o resultado do deploy e da migration para auditoria operacional.

## Checagens apos deploy

API:

```txt
https://api.velarisorcamentos.com.br/health
```

Frontend:

```txt
https://app.velarisorcamentos.com.br
https://app.velarisorcamentos.com.br/manifest.webmanifest
https://app.velarisorcamentos.com.br/sw.js
```

Fluxos manuais minimos:

1. Login Admin.
2. Cadastro de empresa.
3. Ativacao/publicacao pelo Admin.
4. Acesso ao perfil publico.
5. Solicitacao publica de orcamento.
6. Revisao pela empresa.
7. Proposta e PDF.
8. Aceite publico.
9. Agendamento.
10. Servico realizado.
11. Avaliacao.
12. Area do cliente.
13. Metricas da empresa/Admin.

## Alertas importantes

- A API na Render Free pode dormir por inatividade. Para piloto real, prefira um
  plano que nao faca spin down.
- `EMAIL_PROVIDER=stub` significa que e-mails reais ainda nao serao enviados.
- `FILE_STORAGE_PROVIDER=stub` significa que uploads reais ainda nao estao
  persistidos em storage privado.
- So aponte dominio de producao depois de confirmar CORS, cookies, SSL e
  migrations.
- Use ambientes separados para local, homologacao e producao.
