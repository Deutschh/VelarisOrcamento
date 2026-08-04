# Decisoes Tecnicas Pendentes - Velaris Orçamentos

Este documento lista apenas decisoes que continuam abertas. Decisoes ja confirmadas pela especificacao ou pela consolidacao atual foram removidas daqui.

Lista consolidada de adiados e decisoes externas: `docs/ITENS_ADIADOS.md`.

## Produto e UX

- Decisao pendente: wireframes de onboarding, Home, perfil publico, formulario, revisao, acompanhamento, painel da empresa e painel Admin.
- Decisao pendente: prototipo navegavel do MVP piloto.
- Decisao pendente: textos finais de interface para estimativa, aceite, recuperacao, recusas, cancelamentos e mensagens de WhatsApp assistido.
- Decisao pendente: URL/canal oficial de contato da Velaris para a tela de conta pendente.
- Decisao pendente: ajuste fino das margens de estimativa por template/servico/empresa apos validacao do piloto.
- Decisao pendente: politica operacional final de moderacao de avaliacoes, caso a Velaris queira criterios alem das acoes iniciais de ocultar/restaurar e marcar/limpar suspeita.
- Decisao pendente: refinamento visual e hierarquia final dos dashboards operacionais apos validacao com usuarios reais.
- Decisao pendente: criterios finais de ordenacao e destaque da home do cliente apos validacao com usuarios reais.

## Identidade visual

- Decisao pendente: tokens visuais finais.
- Decisao pendente: fontes finais da identidade.
- Decisao pendente: logos, icones e ativos definitivos em `assets/brand/`.
- Decisao pendente: aprovacao formal de qualquer imagem, logo, texto ou elemento especifico vindo de `ImagesExemplos/`.

## Banco e dados

- Decisao pendente: convencao final de nomes para tabelas, colunas, indices e enums.
- Decisao pendente: organizacao exata dos schemas Drizzle em `database/schemas`.
- Decisao pendente: politica de seeds ficticios para ambientes local e homologacao alem do template fixo inicial.
- Decisao pendente: politica de reversao detalhada para migrations quando a reversao total nao for segura.

## Autenticacao e seguranca

- Decisao pendente: duracao exata dos access tokens.
- Decisao pendente: duracao e rotacao exata dos refresh tokens.
- Decisao pendente: politica minima de senha.
- Decisao pendente: limites numericos definitivos de tentativa para login, OTP e recuperacao em producao; o padrao inicial configuravel do OTP publico e 5 tentativas.
- Decisao pendente: duracao definitiva dos OTPs em producao; o padrao inicial configuravel do OTP publico e 10 minutos.
- Decisao pendente: politica de expiracao/revogacao de sessoes em multiplos dispositivos.
- Decisao pendente: formato final dos papeis e permissoes internas.

## Comunicacao

- Decisao inicial registrada: Resend como primeiro provedor real de e-mail
  transacional.
- Decisao pendente: templates finais dos e-mails transacionais.
- Decisao pendente: remetente final, caixa de resposta e configuracao de
  entregabilidade no DNS.

## Arquivos

- Decisao pendente: provedor futuro de armazenamento privado.
- Decisao pendente: contrato/interface interna definitiva para upload binario, leitura privada e troca de fornecedor.
- Decisao pendente: politica de compressao e geracao de miniaturas.
- Decisao pendente: tempo de expiracao das URLs temporarias.
- Decisao pendente: limite de armazenamento por empresa.
- Decisao pendente: estrategia de exclusao controlada e limpeza de arquivos orfaos.

## Infraestrutura e operacao

- Decisao pendente: hospedagem do frontend.
- Decisao pendente: hospedagem da API.
- Decisao pendente: dominio de producao.
- Decisao pendente: estrategia de SSL.
- Decisao pendente: politica explicita de SSL na string do Neon, incluindo avaliar `sslmode=verify-full` para evitar ambiguidades futuras do driver `pg`.
- Decisao pendente: monitoramento e alertas.
- Decisao pendente: backups e retencao.
- Decisao pendente: analytics.
- Decisao pendente: sistema definitivo de envio de erros.
- Decisao pendente: estrategia final de variaveis sensiveis por ambiente.

## Testes e qualidade

- Decisao pendente: cobertura minima esperada por pacote/app.
- Decisao pendente: organizacao dos fixtures de testes para nichos.
- Decisao pendente: estrategia de testes E2E para fluxos publicos com token seguro.
- Decisao pendente: criterios de aceite automatizados para MVP piloto.
