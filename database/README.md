# Database

Esta pasta reserva a estrutura de banco para PostgreSQL no Neon com Drizzle ORM.

## Estado atual

- Sprint 1: configuracao base criada.
- Nao ha tabelas de negocio.
- Nao ha migrations reais.
- Nao ha credenciais reais.
- Nao ha conexao ativa ao Neon.

## Politicas confirmadas

- Datas persistidas devem usar `TIMESTAMPTZ`.
- Valores monetarios persistidos devem usar `NUMERIC(12, 2)`.
- Snapshots e metadados podem usar `JSONB` quando adequado.
- Toda migration deve ser revisavel e reversivel quando tecnicamente possivel.
- O frontend nunca deve acessar o banco diretamente.
