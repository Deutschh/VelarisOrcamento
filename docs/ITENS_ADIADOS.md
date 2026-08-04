# Itens Adiados e Decisoes Externas - Velaris Orcamentos

Atualizado em: 2026-08-04.

Este documento consolida o que foi deliberadamente adiado ao longo do projeto.
Ele nao substitui `docs/ESPECIFICACAO_V1.md`; serve para separar o que ja foi
adiantado em codigo do que ainda depende de validacao comercial, fornecedor,
infraestrutura, textos finais ou aprovacao do usuario.

## Regra de leitura

- Requisito confirmado: deve seguir a especificacao e a ordem das sprints.
- Implementacao local adiantada: existe codigo preparado, sem fornecedor real.
- Decisao pendente: ainda precisa ser escolhida/aprovada.
- Adiado: nao deve ser implementado agora.

## Produto, validacao e UX

### Validacao do MVP piloto

- Status: pendente operacional.
- Motivo: o primeiro nicho, limpeza de estofados, ainda precisa ser validado com
  empresa real antes de abrir vidracaria e marmoraria.
- Impacto: valores, margens, nomes de campos, regras comerciais e experiencia do
  fluxo podem precisar de ajustes finos.
- Onde o codigo esta preparado: templates, configuracao e precos versionados em
  `packages/domain`, `packages/shared`, `apps/api/src/templates`,
  `database/schemas/index.ts` e telas Admin.

### Wireframes e prototipo navegavel final

- Status: pendente.
- Motivo: o produto ja possui telas funcionais, mas os wireframes/prototipo
  finais da Sprint 0 ainda nao foram fechados como artefatos formais.
- Impacto: melhorias visuais podem continuar acontecendo, mas nao devem inventar
  fluxo fora da especificacao.

### Textos finais de interface

- Status: pendente.
- Motivo: mensagens de estimativa, aceite, recusa, recuperacao, cancelamento e
  WhatsApp assistido ainda usam textos iniciais.
- Impacto: antes do piloto publico, revisar tom, clareza, responsabilidade e
  consistencia juridica.

### Canal oficial de contato Velaris

- Status: pendente.
- Motivo: a tela de empresa pendente ainda precisa de URL/canal oficial.
- Impacto: nao hardcodear WhatsApp, e-mail ou link comercial sem aprovacao.

## Nichos adiados

### Sprint 8 - Vidracaria

- Status: adiada por decisao de produto.
- Motivo: implementar somente depois da validacao do MVP piloto de limpeza de
  estofados.
- Nao fazer agora: criar templates, campos, formulas, telas ou regras de
  vidracaria.

### Sprint 9 - Marmoraria

- Status: adiada por decisao de produto.
- Motivo: implementar somente depois da validacao do MVP piloto de limpeza de
  estofados.
- Nao fazer agora: criar templates, campos, formulas, telas ou regras de
  marmoraria.

## Identidade visual e ativos finais

### Tokens visuais finais

- Status: decisao pendente.
- Motivo: `ImagesExemplos/` foi usado apenas como referencia visual; ainda nao
  ha tokens oficiais finais.
- Impacto: cores, sombras, radius, espacamentos e estados visuais podem ser
  refinados, mas devem permanecer reversiveis.

### Fontes finais

- Status: decisao pendente.
- Motivo: nenhuma fonte final oficial foi aprovada.
- Impacto: manter stack de fontes simples ate definicao.

### Logos, icones e ativos oficiais

- Status: decisao pendente.
- Motivo: `assets/brand/` esta reservado para materiais finais aprovados.
- Implementacao local adiantada: Sprint 19 criou icones PWA provisorios em
  `apps/web/public/icons`.
- Nao fazer agora: copiar logo, texto ou elemento especifico de
  `ImagesExemplos/` para o produto sem confirmacao de uso oficial.

## Comunicacao e e-mail

### Provedor real de e-mail transacional

- Status: decisao pendente.
- Motivo: foi confirmado que nao seria escolhido/conectado fornecedor definitivo
  nesta etapa.
- Implementacao local adiantada: existe adapter `stub` em
  `apps/api/src/notifications/email-adapter.ts`.
- Fluxos afetados: verificacao de e-mail, recuperacao publica por OTP, convite
  de avaliacao, liberacao de empresa e comunicacoes futuras.
- Proximo passo: escolher fornecedor, remetente, dominio, entregabilidade e
  templates antes do uso publico.

### Envio automatico de WhatsApp

- Status: fora do escopo atual.
- Implementado: link assistido `wa.me` com mensagem preenchida.
- Nao prometer agora: envio automatico de mensagens por API de WhatsApp.

## Arquivos, uploads e PDFs

### Armazenamento privado definitivo

- Status: decisao pendente.
- Motivo: nenhum fornecedor privado foi conectado.
- Implementacao local atual: arquivos de solicitacao sao metadados; PDF da
  proposta e gerado sob demanda pelo backend.
- Onde preparar: contratos em `packages/shared`, repositorios publicos/empresa e
  futuro adapter de storage.
- Proximo passo: escolher provedor, politica de acesso privado, URL temporaria,
  retencao, limites por empresa e limpeza de orfaos.

### Upload binario real

- Status: pendente operacional/tecnico.
- Motivo: Sprint 10 registrou metadados; Sprint 19 ainda nao conectou storage.
- Impacto: antes de producao, testar tamanho, tipo MIME, antiviru/sanitizacao se
  aplicavel, quotas e autorizacao de leitura.

### Persistencia de PDF em storage

- Status: adiada.
- Motivo: o PDF atual e gerado sob demanda, evitando fornecedor pago.
- Impacto: se houver necessidade de prova documental armazenada como arquivo,
  sera preciso adapter de storage e politica de retencao.

## Legal e compliance

### Textos juridicos definitivos

- Status: decisao pendente.
- Motivo: versoes legais iniciais existem para preservar snapshot/aceite, mas
  nao substituem revisao juridica.
- Fluxos afetados: solicitacao publica, proposta, aceite, recusa, termos de uso,
  privacidade e documentos de consentimento.

### Politica final de privacidade e termos

- Status: decisao pendente.
- Motivo: depende de revisao juridica e operacao real.
- Nao fazer agora: usar textos juridicos definitivos sem aprovacao.

## Infraestrutura e operacao

### Hospedagem do frontend

- Status: decisao pendente.
- Motivo: nenhum provedor foi escolhido.
- Implementacao local adiantada: Vite build/PWA preparados, sem deploy.

### Hospedagem da API

- Status: decisao pendente.
- Motivo: nenhum provedor foi escolhido.
- Impacto: precisa fechar variaveis seguras, trust proxy, logs, health check,
  escalabilidade e estrategia de start.

### Dominio e SSL

- Status: decisao pendente.
- Motivo: dominio real e certificados ainda nao foram definidos.
- Implementacao local adiantada: cookies seguros para `homologation` e
  `production`, HSTS configuravel e checagem de `CORS_ORIGIN` HTTPS.

### Neon e SSL do banco

- Status: decisao pendente de hardening fino.
- Banco confirmado: PostgreSQL no Neon.
- Pendente: avaliar string com modo SSL mais explicito, como `sslmode=verify-full`,
  conforme comportamento futuro do driver `pg`.

### Backups

- Status: decisao pendente.
- Motivo: depende do plano Neon/estrategia operacional.
- Nao fazer agora: prometer backup sem politica de retencao, restore e teste de
  recuperacao.

### Monitoramento, alertas e envio definitivo de erros

- Status: decisao pendente.
- Motivo: nenhum servico foi conectado.
- Implementacao local atual: logs Pino e checagem `npm run check:production`.
- Proximo passo: escolher ferramenta, eventos minimos, mascaramento de dados,
  alertas e responsaveis.

### Analytics

- Status: adiado.
- Motivo: Sprint 18 implementou metricas internas a partir do banco; analytics
  externo/BI fica fora do MVP piloto.

## Seguranca e qualidade

### Limites definitivos de rate limit

- Status: configuravel, pendente de calibragem.
- Implementacao local: variaveis `RATE_LIMIT_*` e `AUTH_RATE_LIMIT_*`.
- Proximo passo: ajustar numeros em homologacao com trafego real.

### Politica final de senha/sessoes

- Status: decisao pendente.
- Implementado: Argon2id, JWT curto, refresh tokens persistidos/revogaveis e
  cookies `httpOnly`.
- Proximo passo: definir requisitos minimos de senha, rotacao multi-dispositivo
  e revogacao operacional.

### E2E completos do MVP

- Status: pendente.
- Motivo: ha testes de dominio/API para fluxos recentes, mas poucos E2E de
  navegador ponta a ponta.
- Proximo passo: criar cenarios Playwright para cadastro, solicitacao,
  proposta, agendamento, aceite, servico realizado, avaliacao, cliente e metricas.

## Operacao do piloto

### Conta piloto real

- Status: pendente.
- Motivo: depende de empresa real e dados aprovados.
- Proximo passo: criar empresa piloto em ambiente de homologacao/producao apos
  decidir infraestrutura e validar textos/ativos.

### Deploy

- Status: nao realizado.
- Motivo: o usuario ainda nao autorizou hospedagem/deploy.
- Nao fazer agora: configurar remoto, publicar frontend/API, apontar dominio,
  conectar servicos pagos ou alterar configuracoes globais do Windows.
