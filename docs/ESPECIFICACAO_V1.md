# Velaris Orçamentos — Especificação Técnica, Funcional e Plano de Ação da V1

**Versão:** 1.1  
**Status:** Planejado — revisado  
**Produto:** Plataforma web responsiva e PWA da Velaris  
**Nichos iniciais:** Limpeza de estofados, vidraçarias e marmorarias  
**Modelo comercial inicial:** Plano único, ativação manual pela Velaris e pagamentos fora da plataforma  

---

# 0. ALTERAÇÕES CONSOLIDADAS DA VERSÃO 1.1

Esta revisão incorpora decisões técnicas necessárias para impedir retrabalho durante o desenvolvimento:

- o código público e o token seguro passam a ser gerados quando a solicitação é enviada, e não apenas após a proposta final;
- o orçamento iniciado pelo visitante passa a existir como rascunho no servidor;
- o dispositivo guarda somente o token do rascunho e a etapa atual;
- a recuperação automática da V1 será realizada por e-mail;
- o WhatsApp será usado como contato, validação complementar e redirecionamento assistido, sem envio automático de OTP;
- o Admin Velaris configurará templates fixos dos três nichos, sem criar formulários ou fórmulas livres;
- o agendamento será configurável por empresa e serviço;
- conflitos de horário gerarão aviso, não bloqueio;
- as transições de status passam a seguir uma matriz formal;
- valores monetários e medidas terão normalização obrigatória;
- ações críticas serão idempotentes;
- termos, avisos e políticas serão versionados;
- o produto passa a possuir dois marcos claros: MVP piloto e V1 completa.

As alterações desta versão não mudam a proposta comercial central do produto. Elas tornam a implementação mais segura, previsível e compatível com o escopo da V1.

---

# 1. PRINCÍPIO CENTRAL

```txt
O cliente descreve o que precisa
↓
O sistema calcula uma estimativa
↓
A empresa revisa dados e fotos
↓
O sistema recalcula
↓
A empresa envia a proposta final
↓
O cliente confirma valor e, quando aplicável, horário
↓
O serviço é realizado
↓
O cliente pode avaliar a empresa
```

O Velaris Orçamentos será uma plataforma multiempresa da Velaris. Cada empresa possuirá seu próprio perfil, serviços, identidade visual moderada e regras de preço, mas a marca, a navegação e a infraestrutura principal continuarão pertencendo à Velaris.

A plataforma deverá funcionar como um web app responsivo e instalável como PWA. O cliente poderá acessar pelo navegador sem instalar nada e sem criar uma conta obrigatoriamente.

---

# 2. OBJETIVO GERAL

O sistema deverá reduzir:

- demora na criação de orçamentos;
- solicitações incompletas;
- cálculos repetitivos;
- divergências entre cliente e empresa;
- perda de oportunidades por falta de retorno;
- dificuldade de acompanhar propostas e agendamentos;
- falta de histórico e métricas.

O produto não será apenas um gerador de PDFs. Ele será uma jornada completa de solicitação, estimativa, revisão, proposta, agendamento, acompanhamento e avaliação.

---

# 3. PERFIS DE USUÁRIO

## 3.1 Cliente visitante

Pode:

- acessar a Home pública;
- buscar empresas por nicho e localização;
- abrir o perfil público de uma empresa;
- preencher uma solicitação;
- visualizar a estimativa antes de enviar;
- acompanhar pelo link ou código seguro;
- confirmar proposta;
- solicitar outro horário;
- cancelar;
- avaliar após o serviço realizado.

Não precisa criar conta.

## 3.2 Cliente autenticado

Possui todos os recursos do visitante e também:

- Home personalizada;
- histórico de solicitações;
- propostas aguardando confirmação;
- próximos agendamentos;
- empresas utilizadas recentemente;
- favoritos;
- notificações;
- recuperação mais simples do histórico.

## 3.3 Empresa pendente

A empresa realizou o cadastro, mas ainda não foi ativada pela Velaris.

Pode acessar somente:

- status do cadastro;
- dados informados;
- apresentação do produto;
- botão “Falar com a Velaris”;
- logout.

Não pode:

- publicar perfil;
- receber solicitações;
- criar propostas;
- acessar dados de clientes;
- cadastrar preços;
- alterar regras de cálculo.

## 3.4 Empresa ativa

Pode:

- acessar o painel;
- receber solicitações;
- analisar respostas e fotos;
- corrigir campos técnicos;
- acompanhar o recálculo;
- aceitar ou recusar solicitações;
- definir valor final;
- propor dia e horário, quando aplicável;
- enviar proposta;
- acompanhar confirmação;
- marcar serviço como realizado;
- consultar clientes, histórico e métricas;
- solicitar alterações de preços à Velaris.

## 3.5 Administrador Velaris

Pode:

- visualizar empresas pendentes;
- ativar, suspender e reativar empresas;
- definir dados do plano único;
- publicar ou despublicar perfis;
- cadastrar e editar preços;
- ativar ou desativar campos por empresa;
- configurar margens de estimativa;
- criar e versionar tabelas de preço;
- revisar solicitações de alteração;
- prestar suporte;
- consultar auditoria;
- visualizar métricas gerais da plataforma.

---

# 4. FORMATO DO PRODUTO

## 4.1 V1

```txt
Web app responsivo
+
PWA instalável
+
Backend compartilhado
+
Banco multiempresa
```

## 4.2 Rotas principais sugeridas

```txt
/                              Home pública
/onboarding                    Apresentação geral
/empresas                      Busca de empresas
/empresa/:slug                 Perfil público da empresa
/empresa/:slug/orcamento       Fluxo de solicitação
/acompanhar/:token             Acompanhamento público seguro
/recuperar                     Recuperação por código
/login                         Login
/cadastro                      Escolha do tipo de cadastro
/cliente                       Área do cliente
/app                           Painel da empresa
/admin                         Painel da Velaris
```

## 4.3 Marca

A plataforma principal manterá a identidade Velaris.

Cada empresa poderá personalizar:

- logotipo;
- capa;
- cor principal;
- descrição;
- galeria;
- contatos;
- endereço;
- redes sociais;
- serviços;
- termos;
- raio e regiões atendidas.

Não entram na V1:

- domínio próprio por empresa;
- remoção total da marca Velaris;
- layouts completamente diferentes;
- CSS personalizado;
- fontes personalizadas por empresa.

Esses recursos pertencerão à oferta de sistemas personalizados.

---

# 5. ONBOARDING

## 5.1 Onboarding geral

Será exibido quando o usuário entrar pelo início geral da plataforma, preferencialmente apenas na primeira visita.

### Tela 1

```txt
Encontre empresas e peça seu orçamento

Escolha o serviço e informe o que precisa em poucos passos.
```

### Tela 2

```txt
Envie fotos e detalhes

Ajude a empresa a analisar o serviço com mais precisão.
```

### Tela 3

```txt
Receba a proposta e confirme o horário

Acompanhe tudo pelo celular, mesmo sem criar conta.
```

Ações:

- Pular;
- Continuar;
- Começar.

## 5.2 Regra para links diretos

Quando o cliente entrar por:

```txt
/empresa/:slug
```

o onboarding não deverá bloquear o acesso. O perfil da empresa será aberto imediatamente.

---

# 6. HOME PÚBLICA E HOME DO CLIENTE

## 6.1 Home pública

Deverá conter:

- apresentação curta da Velaris Orçamentos;
- busca por cidade, CEP ou localização;
- categorias;
- empresas próximas;
- empresas em destaque;
- explicação “Como funciona”;
- acesso ao histórico por código;
- login do cliente;
- acesso empresarial.

Categorias iniciais:

- Limpeza de estofados;
- Vidraçarias;
- Marmorarias.

## 6.2 Empresas próximas

A ordenação deverá considerar:

- localização do usuário;
- cidade ou CEP informado;
- latitude e longitude da empresa;
- raio de atendimento;
- cidades ou bairros atendidos;
- status ativo;
- perfil publicado;
- nicho compatível.

Uma empresa não deverá aparecer somente por estar fisicamente próxima. Ela também deverá atender a região do usuário.

## 6.3 Home do cliente autenticado

Seções:

- solicitações em andamento;
- propostas aguardando confirmação;
- próximos agendamentos;
- histórico;
- empresas próximas;
- categorias;
- empresas utilizadas recentemente;
- favoritos;
- avaliações pendentes;
- notificações.

---

# 7. FLUXO COMPLETO DO CLIENTE

```txt
1. Cliente acessa o perfil da empresa.

2. Escolhe um serviço.

3. Inicia a solicitação.

4. O backend cria um rascunho seguro no servidor.

5. Cliente preenche as informações técnicas.

6. Adiciona fotos e, quando permitido, PDF.

7. Informa nome, WhatsApp e e-mail.

8. Clica em “Ver solicitação de orçamento”.

9. Visualiza todas as respostas.

10. Visualiza a faixa estimada.

11. Edita ou confirma.

12. A solicitação muda de draft para submitted.

13. O sistema gera imediatamente:
    - código público da solicitação;
    - token seguro;
    - link de acompanhamento.

14. O cliente recebe o código e o link por e-mail.

15. A empresa analisa os dados.

16. A empresa corrige campos quando necessário.

17. O sistema recalcula.

18. A empresa define o valor final.

19. A empresa pode propor data e horário,
    conforme o modo de agendamento do serviço.

20. O cliente recebe a proposta definitiva.

21. O cliente confirma, recusa ou solicita outro horário.

22. O sistema registra o aceite da versão correta.

23. O mesmo código e link continuam válidos
    durante toda a jornada.

24. O cliente pode abrir o WhatsApp da empresa
    com mensagem preenchida.

25. A empresa realiza o serviço.

26. A empresa marca “Serviço realizado”.

27. O cliente pode avaliar.
```

## 7.1 Identificadores da jornada

A solicitação e a proposta terão identificadores diferentes.

Exemplo:

```txt
Solicitação:
SOL-2026-00148

Proposta:
ORC-2026-00148-V2
```

O código da solicitação acompanha toda a jornada.

O código da proposta identifica exatamente a versão comercial enviada ou aceita.

## 7.2 Regra do link de acompanhamento

O link é criado no envio da solicitação e não muda quando:

- a empresa inicia a análise;
- uma proposta é enviada;
- o horário é alterado;
- uma nova versão é criada;
- o cliente aceita;
- o serviço é realizado.

O conteúdo exibido pelo link muda conforme o estado atual da jornada.

---

# 8. RASCUNHO, REVISÃO E ESTIMATIVA

## 8.1 Rascunho no servidor

Ao iniciar um orçamento, o backend criará uma solicitação com:

```txt
request_status = draft
draft_token = token seguro
```

Respostas e arquivos serão vinculados a esse rascunho.

O navegador armazenará somente:

- `draft_token`;
- empresa;
- serviço;
- etapa atual;
- data da última atividade.

Não deverá manter o orçamento inteiro apenas no `localStorage`.

Rascunhos abandonados poderão ser excluídos automaticamente após um prazo configurável, inicialmente entre 7 e 15 dias.

## 8.2 Tela de revisão

Antes do envio, o cliente visualizará:

- empresa;
- serviço;
- respostas;
- medidas;
- opções;
- fotos;
- dados pessoais;
- endereço;
- faixa estimada;
- aviso de revisão;
- termos;
- botão editar;
- botão confirmar solicitação.

Exemplo:

```txt
Estimativa: R$ 95,00 a R$ 105,00

O valor final será definido após a empresa analisar
as informações e fotos enviadas.
```

## 8.3 Regras da estimativa

O sistema calculará um valor interno exato.

Exemplo:

```txt
Valor interno calculado: R$ 100,00
Margem inferior: 5%
Margem superior: 5%

Exibido ao cliente:
R$ 95,00 a R$ 105,00
```

As margens deverão ser configuráveis por:

- empresa;
- serviço;
- template de nicho.

Não deverão ser fixas em 5%.

## 8.4 Confirmação da solicitação

Ao confirmar:

```txt
draft
↓
submitted
```

Na mesma transação, o sistema deverá:

- congelar o snapshot inicial;
- gerar o código público;
- gerar o token de acompanhamento;
- registrar os textos legais aceitos;
- criar a notificação da empresa;
- impedir submissão duplicada;
- enviar o e-mail de confirmação.

Se o cliente clicar duas vezes, apenas uma solicitação deverá ser enviada.

---

# 9. FLUXO DA EMPRESA

```txt
Nova solicitação
↓
Abrir detalhes
↓
Analisar respostas e fotos
↓
Corrigir campos técnicos, se necessário
↓
Recalcular
↓
Aceitar ou recusar solicitação
↓
Definir valor final
↓
Propor data e horário, quando aplicável
↓
Enviar proposta definitiva
↓
Aguardar confirmação
↓
Realizar serviço
↓
Marcar serviço realizado
```

## 9.1 Revisão de campos

A empresa poderá corrigir campos técnicos, mas o sistema deverá preservar:

- valor original do cliente;
- valor revisado;
- usuário responsável;
- data;
- motivo opcional;
- impacto financeiro;
- versão da configuração usada no recálculo.

Exemplo:

```txt
Nível informado:
Moderado

Nível revisado:
Intenso

Motivo:
Condição identificada após análise das fotos.
```

## 9.2 Valor final

O campo de valor final será iniciado com o total interno recalculado.

Exemplo:

```txt
Total interno recalculado: R$ 100,00
Faixa recalculada: R$ 95,00 a R$ 105,00
Valor final sugerido: R$ 100,00
```

Regras:

- dentro da faixa: ajuste permitido sem justificativa obrigatória;
- fora da faixa: justificativa obrigatória;
- valor negativo: bloqueado;
- valor igual a zero: permitido somente para serviço explicitamente configurado como gratuito;
- toda alteração fica registrada;
- a empresa não pode alterar uma proposta já aceita;
- uma nova alteração comercial cria uma nova versão.

## 9.3 Recusa da solicitação

A empresa poderá recusar escolhendo um motivo definido na seção de cancelamentos.

A recusa deverá:

- registrar usuário e data;
- gerar histórico;
- notificar o cliente;
- impedir criação de proposta sem reabertura administrativa.

---

# 10. AGENDAMENTO ASSISTIDO E CONFIGURÁVEL

A V1 não terá agenda automática completa.

O agendamento não será obrigatório em todos os serviços.

Cada serviço terá:

```txt
scheduling_mode
```

Valores:

```txt
required_with_proposal
optional_with_proposal
after_proposal_acceptance
external_only
```

Exemplos sugeridos:

```txt
Limpeza de estofados:
required_with_proposal

Vidraçaria:
after_proposal_acceptance

Marmoraria:
optional_with_proposal
```

## 10.1 Fluxos possíveis

### Obrigatório junto com a proposta

```txt
Empresa define valor final
↓
Empresa propõe data e horário
↓
Envia proposta
↓
Cliente confirma valor e horário
```

### Opcional junto com a proposta

```txt
Empresa define valor final
↓
Pode adicionar data e horário
↓
Envia proposta
```

### Após aceite da proposta

```txt
Empresa envia proposta sem horário
↓
Cliente aceita o valor
↓
Empresa propõe data e horário
↓
Cliente confirma
```

### Resolvido fora do sistema

```txt
Empresa envia proposta
↓
Cliente aceita
↓
Horário é combinado pelo WhatsApp
```

## 10.2 Estados do agendamento

```txt
none
proposed
confirmed
reschedule_requested
rescheduled
completed
cancelled
```

## 10.3 Dados do agendamento

- data;
- horário inicial;
- horário final opcional;
- duração estimada;
- endereço;
- observações;
- proposto por;
- confirmado pelo cliente;
- data da confirmação;
- fuso horário da empresa.

## 10.4 Conflitos de horário

A V1 não conhece quantidade de equipes ou capacidade operacional.

Portanto, um conflito deverá gerar aviso, não bloqueio.

```txt
Já existe outro atendimento registrado neste horário.

Deseja manter o agendamento?
```

A empresa poderá confirmar mesmo assim.

## 10.5 O que não entra agora

- disponibilidade automática de equipes;
- bloqueio rígido de conflito;
- cálculo de deslocamento entre atendimentos;
- múltiplos profissionais;
- sincronização com Google Calendar;
- feriados;
- intervalos automáticos;
- pagamento de sinal.

---

# 11. CONFIRMAÇÃO DO CLIENTE

Ao receber a proposta, o cliente visualizará:

- valor final;
- itens e condições;
- alterações feitas pela empresa;
- justificativas;
- data e horário, quando aplicável;
- validade;
- termos;
- botão confirmar;
- botão solicitar outro horário, quando aplicável;
- botão recusar;
- botão falar no WhatsApp.

Ao confirmar, o sistema registrará:

- código da solicitação;
- código e versão da proposta;
- nome;
- WhatsApp;
- e-mail;
- data e hora;
- IP;
- user agent;
- aceite dos termos;
- versão dos termos;
- versão da política de privacidade;
- versão do aviso de estimativa;
- valor final;
- agendamento confirmado, quando existir.

Depois:

```txt
Proposta confirmada com sucesso.

Solicitação: SOL-2026-00148
Proposta aceita: ORC-2026-00148-V2
```

O link de acompanhamento já terá sido criado no envio da solicitação e continuará sendo o mesmo.

Mensagem para WhatsApp:

```txt
Olá! Confirmei a proposta ORC-2026-00148-V2.

Valor final: R$ 102,00
Data: 18/08/2026
Horário: 14h

Estou entrando em contato para confirmar os detalhes.
```

Quando o serviço não possuir agendamento dentro da plataforma, a mensagem não deverá inventar data ou horário.

---

# 12. ACOMPANHAMENTO E RECUPERAÇÃO

## 12.1 Link seguro

```txt
/acompanhar/:token
```

O token será criado quando a solicitação for enviada.

Deverá ser:

- longo;
- imprevisível;
- revogável;
- separado do ID interno;
- limitado à jornada correta;
- substituível em caso de comprometimento.

## 12.2 Código público

Exemplo:

```txt
SOL-2026-00148
```

O código não deverá liberar acesso sozinho.

## 12.3 Recuperação na V1

O usuário poderá informar:

- código da solicitação;
- e-mail ou WhatsApp cadastrado.

O e-mail será o único canal automático de envio do OTP na V1.

Fluxos permitidos:

```txt
Código + e-mail
↓
OTP enviado ao e-mail cadastrado
```

ou:

```txt
Código + WhatsApp
↓
Sistema localiza e valida o contato
↓
OTP enviado ao e-mail cadastrado na solicitação
```

O sistema não enviará OTP automaticamente por WhatsApp na V1, pois não haverá WhatsApp Cloud API ou provedor de mensagens.

## 12.4 Requisitos do OTP

- validade curta;
- uso único;
- tentativas limitadas;
- armazenamento com hash;
- rate limit;
- revogação após uso;
- registro de auditoria.

## 12.5 Visitante que cria conta depois

Após verificar o mesmo e-mail ou telefone, o sistema poderá vincular solicitações anteriores ao novo usuário.

---

# 13. STATUS E MÁQUINAS DE ESTADO

A V1 deverá separar solicitação, proposta, agendamento e execução do serviço.

Não será permitido atualizar status livremente sem validar a transição.

## 13.1 Solicitação

```txt
draft
submitted
under_review
awaiting_information
accepted_for_proposal
declined_by_company
cancelled
archived
```

## 13.2 Proposta

```txt
draft
sent
viewed
change_requested
accepted
rejected
expired
cancelled
```

## 13.3 Agendamento

```txt
none
proposed
confirmed
reschedule_requested
rescheduled
completed
cancelled
```

## 13.4 Serviço

```txt
not_started
scheduled
in_progress
service_realized
closed
cancelled
```

## 13.5 Jornada exibida ao usuário

```txt
Solicitação enviada
↓
Em análise
↓
Proposta final enviada
↓
Aguardando confirmação
↓
Agendado, quando aplicável
↓
Serviço realizado
↓
Concluído
```

## 13.6 Matriz inicial de transições

| Entidade | Estado atual | Ação | Novo estado | Responsável |
|---|---|---|---|---|
| Solicitação | `draft` | Confirmar envio | `submitted` | Cliente |
| Solicitação | `submitted` | Abrir análise | `under_review` | Empresa |
| Solicitação | `under_review` | Pedir dados | `awaiting_information` | Empresa |
| Solicitação | `awaiting_information` | Enviar complemento | `under_review` | Cliente |
| Solicitação | `under_review` | Aceitar atendimento | `accepted_for_proposal` | Empresa |
| Solicitação | `under_review` | Recusar | `declined_by_company` | Empresa |
| Proposta | `draft` | Enviar | `sent` | Empresa |
| Proposta | `sent` | Abrir link | `viewed` | Sistema |
| Proposta | `sent` ou `viewed` | Solicitar mudança | `change_requested` | Cliente |
| Proposta | `sent` ou `viewed` | Aceitar | `accepted` | Cliente |
| Proposta | `sent` ou `viewed` | Recusar | `rejected` | Cliente |
| Proposta | `sent` ou `viewed` | Ultrapassar validade | `expired` | Sistema |
| Agendamento | `none` | Propor horário | `proposed` | Empresa |
| Agendamento | `proposed` | Confirmar | `confirmed` | Cliente |
| Agendamento | `proposed` | Solicitar alteração | `reschedule_requested` | Cliente |
| Agendamento | `reschedule_requested` | Propor novo horário | `rescheduled` | Empresa |
| Agendamento | `rescheduled` | Confirmar | `confirmed` | Cliente |
| Serviço | `not_started` | Confirmar agenda | `scheduled` | Sistema |
| Serviço | `scheduled` | Iniciar | `in_progress` | Empresa |
| Serviço | `scheduled` ou `in_progress` | Marcar realizado | `service_realized` | Empresa |
| Serviço | `service_realized` | Encerrar jornada | `closed` | Sistema ou empresa |

## 13.7 Transições proibidas

Exemplos:

```txt
proposta expirada → aceita
solicitação recusada → proposta enviada
serviço cancelado → realizado
versão aceita → editada
agendamento cancelado → concluído
```

Uma exceção deverá exigir ação administrativa explícita, motivo e auditoria.

## 13.8 Efeitos automáticos

Cada transição deverá definir:

- timestamp;
- responsável;
- evento de auditoria;
- notificação;
- possível e-mail;
- atualização da jornada pública;
- idempotency key quando aplicável.

---

# 14. CANCELAMENTOS E RECUSAS

O sistema deverá registrar, mas não cobrar taxas.

## 14.1 Recusa da empresa

Motivos:

- fora da região;
- serviço não realizado;
- agenda indisponível;
- informações insuficientes;
- risco técnico;
- outro.

## 14.2 Recusa do cliente

Motivos:

- valor;
- prazo;
- horário;
- contratou outra empresa;
- desistiu;
- outro.

## 14.3 Cancelamento após confirmação

Cliente e empresa poderão cancelar.

O sistema registrará:

- responsável;
- motivo;
- data;
- observação.

Qualquer taxa ou acordo será tratado fora da plataforma.

---

# 15. SERVIÇO REALIZADO E AVALIAÇÃO

Depois do atendimento, a empresa poderá marcar:

```txt
service_realized
```

O cliente poderá avaliar somente quando:

- a proposta foi aceita;
- o atendimento foi confirmado;
- a empresa marcou o serviço como realizado;
- ainda não existe avaliação para esse atendimento.

## 15.1 Avaliação

- nota de 1 a 5;
- comentário opcional;
- data;
- empresa;
- serviço;
- orçamento;
- cliente autenticado ou token seguro.

## 15.2 Exibição

As avaliações poderão aparecer em:

- perfil da empresa;
- Home;
- busca;
- recomendações por nicho;
- histórico do cliente.

## 15.3 Moderação

O Admin Velaris poderá:

- ocultar avaliação;
- restaurar;
- registrar motivo;
- identificar avaliações suspeitas.

---

# 16. CONFIGURAÇÃO EXCLUSIVA PELO ADMIN VELARIS

A própria empresa não editará preços na V1.

O Admin Velaris configurará uma cópia personalizada de um template fixo de nicho.

Poderá:

- ativar ou desativar serviços existentes;
- ativar ou desativar campos existentes;
- alterar obrigatoriedade;
- escolher opções permitidas;
- ordenar campos;
- cadastrar preços;
- cadastrar adicionais;
- cadastrar multiplicadores;
- configurar margens;
- configurar área mínima;
- configurar taxa de deslocamento;
- configurar duração estimada;
- configurar obrigatoriedade de fotos;
- configurar modo de agendamento;
- configurar regiões atendidas;
- criar e publicar nova versão.

Não poderá na V1:

- criar um nicho totalmente livre pela interface;
- criar novos tipos técnicos de campo;
- escrever código;
- escrever fórmulas arbitrárias;
- criar regras profundamente aninhadas;
- alterar diretamente uma versão já publicada.

A empresa poderá apenas solicitar alteração.

## 16.1 Solicitação de alteração

```txt
Empresa solicita alteração
↓
Admin recebe
↓
Conversa com a empresa
↓
Admin cria nova versão
↓
Testa em simulação
↓
Publica a configuração
↓
Novas solicitações usam a nova versão
```

## 16.2 Regra essencial de versionamento

Solicitações antigas não podem mudar quando um preço ou campo for alterado.

Cada solicitação deverá salvar um snapshot de:

- versão do template;
- versão da tabela;
- campos ativos;
- opções;
- regras utilizadas;
- preços;
- respostas;
- cálculo;
- margens;
- total interno;
- faixa exibida;
- modo de agendamento.

---

# 17. MOTOR DE CAMPOS CONFIGURÁVEIS

Cada um dos três nichos possuirá um template estrutural fixo criado durante o desenvolvimento.

```txt
Template de limpeza de estofados
Template de vidraçaria
Template de marmoraria
```

Cada empresa terá uma configuração baseada no template correspondente.

## 17.1 Capacidades do Admin

O Admin poderá definir se cada campo está:

- ativo;
- inativo;
- obrigatório;
- opcional;
- visível ao cliente;
- editável pela empresa;
- relevante para preço;
- relevante apenas para análise.

Também poderá:

- alterar ordem;
- limitar opções;
- definir texto de ajuda;
- definir fotos obrigatórias;
- configurar condições simples previstas pelo template.

## 17.2 Tipos de campo disponíveis

```txt
text
textarea
number
currency
boolean
single_select
multi_select
measurement
address
date
image
file
```

Os tipos são definidos pelo código da plataforma. O Admin não cria novos tipos pela interface.

## 17.3 Condições simples

Exemplos:

```txt
Se instalação = sim
→ mostrar andar e elevador

Se possui manchas = sim
→ mostrar tipo de mancha

Se produto = bancada
→ mostrar recortes e acabamento
```

## 17.4 Regra de publicação

Alterações deverão seguir:

```txt
Rascunho de configuração
↓
Simulação
↓
Validação
↓
Publicação de nova versão
```

Uma versão publicada não será editada diretamente.

## 17.5 Regras que não entram na V1

- construtor de formulário totalmente livre;
- código livre;
- JavaScript digitado pelo Admin;
- fórmulas arbitrárias;
- regras profundamente aninhadas;
- integrações externas de preço.

---

# 18. MOTOR DE CÁLCULO

## 18.1 Tipos de regra

- preço fixo;
- quantidade × preço;
- área × preço por m²;
- comprimento × preço por metro;
- multiplicador;
- adicional fixo;
- adicional percentual;
- valor mínimo;
- área mínima;
- faixa de preço;
- preço por opção;
- condição simples;
- taxa de deslocamento;
- desconto administrativo;
- arredondamento configurável.

## 18.2 Resultado do cálculo

```json
{
  "base_amount": 100.00,
  "items": [],
  "adjustments": [],
  "internal_total": 100.00,
  "estimate_min": 95.00,
  "estimate_max": 105.00,
  "configuration_version": 3
}
```

## 18.3 Requisitos

- cálculo determinístico;
- mesma entrada gera o mesmo resultado;
- explicação de cada item;
- testes unitários;
- nenhuma regra executa código;
- snapshot salvo;
- recálculo após revisão;
- auditoria das diferenças;
- arredondamento consistente;
- validação de valores e unidades.

## 18.4 Valores monetários

Não utilizar `float` ou `double` para dinheiro.

No PostgreSQL:

```sql
NUMERIC(12, 2)
```

Alternativamente, operações internas poderão usar centavos inteiros.

```txt
R$ 102,50
↓
10250 centavos
```

Conversões para exibição utilizarão o padrão `pt-BR`.

## 18.5 Medidas

Toda resposta de medida deverá guardar:

- valor original;
- unidade original;
- valor normalizado;
- unidade normalizada.

Exemplo:

```json
{
  "original_value": 120,
  "original_unit": "cm",
  "normalized_value": 1.2,
  "normalized_unit": "m"
}
```

Padrões:

```txt
Vidraçaria:
entrada em cm ou mm;
cálculo em m, m² ou metro linear.

Marmoraria:
entrada em cm ou mm;
cálculo em m, m² ou metro linear.

Limpeza:
quantidade, lugares e dimensões específicas do item.
```

## 18.6 Regra do valor final

```txt
Valor final sugerido = total interno recalculado
```

- ajuste dentro da faixa: permitido;
- ajuste fora da faixa: justificativa obrigatória;
- valor negativo: bloqueado;
- valor zero: somente quando permitido pelo serviço;
- mudança após envio: nova versão;
- mudança após aceite: proibida na versão aceita.

## 18.7 Idempotência do cálculo

Uma solicitação de cálculo com o mesmo snapshot e a mesma versão deverá produzir o mesmo resultado.

O recálculo não deverá duplicar itens, adicionais ou registros.

---

# 19. PARTICULARIDADES DOS NICHOS

## 19.1 Limpeza de estofados

### Itens possíveis

- sofá;
- poltrona;
- cadeira;
- colchão;
- cabeceira;
- puff;
- banco automotivo;
- tapete;
- carpete;
- outro.

### Campos possíveis

- tipo de item;
- quantidade;
- tamanho;
- número de lugares;
- tipo de tecido;
- nível de sujeira;
- manchas;
- tipo de mancha;
- odor;
- pelos de animais;
- presença de animais;
- impermeabilização;
- urgência;
- andar;
- elevador;
- estacionamento;
- localização;
- fotos.

### Regras possíveis

- preço-base por item;
- adicional por lugar;
- multiplicador por tamanho;
- adicional por tecido;
- multiplicador por sujeira;
- adicional por manchas;
- adicional por odor;
- adicional por pelos;
- adicional por impermeabilização;
- taxa de deslocamento;
- desconto por quantidade;
- valor mínimo de visita.

## 19.2 Vidraçaria

### Produtos possíveis

- box;
- espelho;
- janela;
- porta;
- guarda-corpo;
- cobertura;
- fechamento;
- divisória;
- prateleira;
- tampo;
- outro.

### Campos possíveis

- largura;
- altura;
- quantidade;
- tipo de vidro;
- espessura;
- cor;
- acabamento;
- tipo de abertura;
- ferragens;
- perfil;
- instalação;
- retirada do item antigo;
- dificuldade de acesso;
- andar;
- elevador;
- necessidade de medição técnica;
- fotos.

### Regras possíveis

- área × preço do vidro;
- área mínima;
- preço por espessura;
- preço por cor;
- adicional de acabamento;
- kit de ferragens;
- perfil por metro;
- instalação;
- retirada;
- acesso difícil;
- deslocamento;
- visita técnica.

## 19.3 Marmoraria

### Produtos possíveis

- bancada;
- pia;
- lavatório;
- ilha;
- soleira;
- peitoril;
- escada;
- nicho;
- mesa;
- revestimento;
- outro.

### Campos possíveis

- ambiente;
- material;
- largura;
- comprimento;
- espessura;
- quantidade;
- acabamento da borda;
- recorte para cuba;
- recorte para cooktop;
- recorte para torneira;
- frontão;
- saia;
- instalação;
- transporte;
- andar;
- elevador;
- medição técnica;
- projeto;
- fotos.

### Regras possíveis

- área × preço do material;
- material por faixa;
- espessura;
- acabamento de borda por metro;
- recortes fixos;
- frontão por metro;
- saia por metro;
- instalação;
- transporte;
- perda técnica;
- área mínima;
- medição técnica.


---

# 20. ARQUIVOS

## Limites iniciais

```txt
Até 8 imagens por solicitação
Máximo de 8 MB por imagem
JPG, PNG e WEBP
PDF opcional
Vídeo fora da V1
```

## Requisitos

- compressão;
- validação de MIME;
- nomes aleatórios;
- acesso privado;
- URL temporária;
- exclusão controlada;
- limite por empresa;
- miniaturas;
- registro de upload.

---

# 21. CADASTRO E ATIVAÇÃO DA EMPRESA

```txt
Empresa cria conta
↓
Confirma e-mail
↓
Conta fica pendente
↓
Tela orienta contato com a Velaris
↓
Pagamento ocorre fora do sistema
↓
Admin ativa empresa
↓
Empresa recebe liberação
↓
Perfil é configurado
↓
Admin ou empresa publica o perfil
```

A empresa deverá criar sua própria senha.

O Admin nunca deverá receber ou definir uma senha permanente em texto.

Caso a conta seja criada manualmente, será enviado um link para definição de senha.

---

# 22. PLANO ÚNICO

## Plano Velaris Orçamentos

Inclui:

- perfil público;
- solicitações;
- estimativas;
- revisão;
- propostas;
- agendamento assistido;
- link público;
- PDF;
- WhatsApp assistido;
- histórico;
- avaliações;
- métricas;
- suporte Velaris.

Mesmo com um plano único, o banco deverá armazenar:

```txt
plan_id
subscription_status
activated_at
next_billing_at
suspended_at
```

---

# 23. COMUNICAÇÃO

## 23.1 E-mail

Usos:

- confirmação de cadastro;
- ativação da empresa;
- código e link da solicitação;
- OTP de recuperação;
- proposta enviada;
- agendamento confirmado;
- serviço realizado;
- convite para avaliação.

Na V1, o e-mail será o único canal automático para códigos de recuperação.

## 23.2 WhatsApp assistido

A V1 usará:

```txt
wa.me/<telefone>?text=<mensagem>
```

O sistema não enviará mensagens automaticamente.

O WhatsApp servirá para:

- contato;
- redirecionamento com mensagem preenchida;
- dado complementar de validação;
- conversa externa entre cliente e empresa.

Não servirá na V1 para:

- OTP automático;
- confirmação automática de entrega;
- leitura de mensagens;
- atualização automática de status.

## 23.3 Notificações internas

- nova solicitação;
- proposta aguardando resposta;
- alteração de horário;
- proposta aceita;
- cancelamento;
- avaliação recebida;
- solicitação de mudança de preço.

## 23.4 Documentos legais versionados

O sistema deverá versionar:

- termos de uso;
- política de privacidade;
- aviso de estimativa;
- termos específicos da empresa.

Cada aceite deverá guardar a versão exata apresentada.

---

# 24. SOLICITAÇÕES, PDF E PROPOSTAS VERSIONADAS

## 24.1 Solicitação e proposta são entidades diferentes

Uma solicitação pode gerar:

- nenhuma proposta;
- uma proposta;
- várias versões.

## 24.2 Identificação

```txt
Solicitação:
SOL-2026-00148

Proposta:
ORC-2026-00148-V1
ORC-2026-00148-V2
```

O código da solicitação é gerado quando o cliente envia o pedido.

O código da proposta é gerado para cada versão comercial.

## 24.3 Versionamento

```txt
Solicitação SOL-2026-00148
├── Proposta ORC-2026-00148-V1
├── Proposta ORC-2026-00148-V2
└── Proposta ORC-2026-00148-V3 aceita
```

Após a aceitação, a versão fica imutável.

## 24.4 PDF

Deverá conter:

- Velaris Orçamentos;
- empresa;
- cliente;
- código da solicitação;
- código e versão da proposta;
- itens;
- valores;
- total;
- data;
- validade;
- condições;
- agendamento proposto, quando existir;
- termos e versões;
- identificação da proposta aceita.

## 24.5 Expiração

Após expirar:

- a proposta pode continuar visível;
- não pode ser aceita;
- a empresa pode renovar criando nova versão ou nova validade auditada;
- o sistema registra a expiração.

---

# 25. BANCO DE DADOS — TABELAS PRINCIPAIS

```txt
users
customer_profiles
companies
company_members
company_profiles
company_service_areas
plans
company_subscriptions

niche_templates
template_services
template_fields
template_field_options
template_pricing_rules

company_services
company_service_fields
company_field_options
company_pricing_versions
company_pricing_rules
company_price_change_requests

quote_requests
quote_request_answers
quote_request_answer_revisions
quote_request_files
quote_request_calculations

quotes
quote_versions
quote_items
quote_acceptances

appointments
appointment_history

reviews
favorites
notifications

email_verification_tokens
public_access_tokens
recovery_codes
refresh_tokens
idempotency_keys

legal_document_versions
legal_acceptances
audit_logs
```

## 25.1 Campos estruturais importantes

### `companies`

```txt
timezone
status
profile_status
plan_id
subscription_status
activated_at
next_billing_at
```

Timezone inicial sugerido:

```txt
America/Sao_Paulo
```

### `company_services`

```txt
scheduling_mode
estimate_margin_lower
estimate_margin_upper
is_active
configuration_version
```

### `quote_requests`

```txt
request_code
company_id
service_id
customer_id nullable
status
draft_token_hash
public_token_id
configuration_snapshot
legal_snapshot
submitted_at
expires_at
```

### `quote_request_answers`

```txt
original_value
original_unit
normalized_value
normalized_unit
```

### `quotes` e `quote_versions`

```txt
request_id
version_number
proposal_code
status
internal_total
estimate_min
estimate_max
final_total
out_of_range_reason
valid_until
```

## 25.2 Tipos técnicos

- dinheiro: `NUMERIC(12, 2)`;
- timestamps: `TIMESTAMPTZ`;
- metadados e snapshots: `JSONB`;
- tokens: armazenar hash sempre que possível;
- códigos públicos: índices únicos;
- versões: restrições únicas por entidade.

## 25.3 Preparação para solicitação aberta futura

Não implementar agora, mas reservar arquitetura para:

```txt
request_target_type
request_company_recipients
company_proposals
```

Na V1:

```txt
request_target_type = direct
company_id obrigatório
```

---

# 26. ROTAS SUGERIDAS

## 26.1 Públicas — descoberta

```txt
GET    /api/public/categories
GET    /api/public/companies
GET    /api/public/companies/:slug
GET    /api/public/companies/:slug/services
```

## 26.2 Públicas — rascunho e solicitação

```txt
POST   /api/public/quote-requests/drafts
GET    /api/public/quote-requests/drafts/:draftToken
PATCH  /api/public/quote-requests/drafts/:draftToken
POST   /api/public/quote-requests/drafts/:draftToken/files
DELETE /api/public/quote-requests/drafts/:draftToken/files/:fileId
POST   /api/public/quote-requests/drafts/:draftToken/estimate
POST   /api/public/quote-requests/drafts/:draftToken/submit
```

A submissão deverá gerar:

- código da solicitação;
- token seguro;
- snapshot;
- evento;
- notificação;
- e-mail.

## 26.3 Públicas — acompanhamento

```txt
GET    /api/public/tracking/:token
POST   /api/public/recovery/request
POST   /api/public/recovery/verify
POST   /api/public/proposals/:token/accept
POST   /api/public/proposals/:token/reject
POST   /api/public/proposals/:token/reschedule
POST   /api/public/reviews
```

## 26.4 Autenticação

```txt
POST   /api/auth/register/customer
POST   /api/auth/register/company
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

## 26.5 Empresa

```txt
GET    /api/company/dashboard
GET    /api/company/quote-requests
GET    /api/company/quote-requests/:id
PATCH  /api/company/quote-requests/:id/review
POST   /api/company/quote-requests/:id/decline
POST   /api/company/quote-requests/:id/proposals
POST   /api/company/proposals/:id/send
POST   /api/company/proposals/:id/appointment
PATCH  /api/company/appointments/:id
POST   /api/company/appointments/:id/complete
GET    /api/company/customers
GET    /api/company/metrics
POST   /api/company/price-change-requests
```

## 26.6 Admin Velaris

```txt
GET    /api/admin/companies
GET    /api/admin/companies/:id
POST   /api/admin/companies/:id/activate
POST   /api/admin/companies/:id/suspend
PATCH  /api/admin/companies/:id/profile
POST   /api/admin/companies/:id/publish
GET    /api/admin/niche-templates
POST   /api/admin/company-configurations
PATCH  /api/admin/company-configurations/:id
POST   /api/admin/company-configurations/:id/simulate
POST   /api/admin/company-configurations/:id/publish
GET    /api/admin/price-change-requests
POST   /api/admin/price-change-requests/:id/resolve
GET    /api/admin/audit
GET    /api/admin/metrics
```

## 26.7 Cabeçalhos de idempotência

Ações críticas deverão aceitar:

```txt
Idempotency-Key: <uuid>
```

Aplicar em:

- submissão da solicitação;
- envio da proposta;
- aceite;
- confirmação do agendamento;
- serviço realizado;
- avaliação.

---

# 27. REQUISITOS TÉCNICOS E DE SEGURANÇA

- senhas com hash forte;
- JWT curto + refresh token;
- controle por função;
- toda consulta empresarial filtrada por `company_id`;
- tokens públicos imprevisíveis;
- rate limit;
- proteção contra spam;
- validação de uploads;
- arquivos privados;
- logs de auditoria;
- expiração e revogação de tokens;
- proteção contra acesso entre empresas;
- consentimento e política de privacidade;
- possibilidade de exclusão de dados;
- backups;
- variáveis sensíveis fora do código;
- dinheiro sem ponto flutuante;
- medidas normalizadas;
- timestamps com fuso;
- documentos legais versionados;
- ações críticas idempotentes;
- transações nas mudanças de estado.

Exemplo obrigatório:

```sql
SELECT *
FROM quotes
WHERE id = $1
  AND company_id = $2;
```

## 27.1 Isolamento multiempresa

Nunca confiar somente no ID recebido pela rota.

Toda operação empresarial deverá validar:

- usuário autenticado;
- associação em `company_members`;
- papel permitido;
- `company_id` do recurso.

## 27.2 Idempotência

Ações críticas deverão usar:

- `idempotency_key`;
- índice único;
- transação;
- bloqueio quando necessário;
- resposta reutilizável em repetição válida.

Cenário:

```txt
Cliente toca duas vezes em “Confirmar solicitação”
↓
Backend recebe duas requisições
↓
Apenas uma solicitação é enviada
```

## 27.3 Fuso horário

As empresas terão:

```txt
company_timezone = America/Sao_Paulo
```

O banco utilizará `TIMESTAMPTZ`.

A interface exibirá horários no fuso da empresa.

## 27.4 Termos e consentimentos

Cada aceite deverá registrar:

```txt
terms_version
privacy_policy_version
estimate_disclaimer_version
company_terms_version
accepted_at
ip
user_agent
```

## 27.5 Rascunhos abandonados

Um processo agendado deverá:

- localizar rascunhos expirados;
- remover arquivos órfãos;
- revogar tokens;
- registrar quantidade removida;
- respeitar o prazo definido.

---

# 28. MÉTRICAS DA V1

## Empresa

- solicitações recebidas;
- solicitações em análise;
- recusadas;
- propostas enviadas;
- propostas visualizadas;
- propostas aceitas;
- taxa de conversão;
- valor estimado;
- valor proposto;
- valor aceito;
- tempo médio de resposta;
- serviços realizados;
- avaliações;
- nota média.

## Admin Velaris

- empresas pendentes;
- empresas ativas;
- empresas suspensas;
- solicitações por empresa;
- solicitações por nicho;
- conversão por nicho;
- volume de propostas;
- avaliações;
- uso de armazenamento;
- solicitações de mudança de preço.

---

# 29. O QUE NÃO ENTRA NA V1

- pagamento integrado;
- cobrança de taxa;
- estorno;
- emissão de nota fiscal;
- assinatura digital certificada;
- agenda automática completa;
- controle de equipe;
- controle de estoque;
- financeiro;
- WhatsApp Cloud API;
- OTP automático por WhatsApp;
- recuperação automática por SMS;
- vídeo;
- solicitação aberta para várias empresas;
- domínio próprio;
- white label completo;
- construtor livre de formulários;
- editor livre de fórmulas;
- novos tipos de campo criados pelo Admin;
- inteligência artificial;
- integração com fornecedores;
- aplicativo nativo separado.

---

# 30. PLANO DE AÇÃO — ORDEM EXATA DE IMPLEMENTAÇÃO

# SPRINT 0 — FECHAMENTO FUNCIONAL E PROTÓTIPO

## Objetivo

Congelar a V1 antes do banco.

## Subetapas

1. Revisar este documento.
2. Confirmar nomes dos status.
3. Fechar a matriz de transições.
4. Confirmar fluxo visitante.
5. Confirmar fluxo autenticado.
6. Confirmar fluxo da empresa.
7. Confirmar fluxo do Admin.
8. Definir os quatro modos de agendamento.
9. Definir os textos legais iniciais.
10. Definir a versão do aviso de estimativa.
11. Desenhar mapa de rotas.
12. Criar wireframes.
13. Criar protótipo navegável.
14. Validar telas de celular e desktop.
15. Fechar textos de estimativa e aceite.
16. Separar visualmente MVP piloto e V1 completa.

## Critério de conclusão

- fluxos aprovados;
- matriz de estados aprovada;
- modos de agendamento aprovados;
- nenhuma decisão central pendente;
- protótipo navegável;
- lista de telas fechada.

## Estimativa

**8 a 12 horas**

---

# SPRINT 1 — FUNDAÇÃO DO PROJETO

## Objetivo

Criar a base técnica.

## Subetapas

1. Criar repositórios.
2. Configurar React + Vite + Tailwind.
3. Configurar Node + Express.
4. Configurar PostgreSQL.
5. Configurar variáveis de ambiente.
6. Criar estrutura de pastas.
7. Configurar ESLint e Prettier.
8. Criar tratamento global de erros.
9. Configurar logs.
10. Criar health check.
11. Configurar `TIMESTAMPTZ`.
12. Definir política de dinheiro e medidas.
13. Criar estrutura para idempotência.
14. Configurar ambiente local, homologação e produção.

## Critério de conclusão

- frontend e backend sobem;
- banco conecta;
- deploy inicial funciona;
- erros são padronizados;
- timezone e tipos numéricos estão definidos;
- ações críticas possuem base de idempotência.

## Estimativa

**10 a 14 horas**

---

# SPRINT 2 — BANCO MULTIEMPRESA E AUTENTICAÇÃO

## Objetivo

Criar usuários, empresas, papéis e isolamento.

## Subetapas

1. Criar `users`.
2. Criar `companies`.
3. Adicionar `company_timezone`.
4. Criar `company_members`.
5. Criar `customer_profiles`.
6. Criar planos e assinatura.
7. Criar status de empresa.
8. Criar refresh tokens.
9. Criar documentos legais versionados.
10. Criar registro de aceites.
11. Criar cadastro de cliente.
12. Criar cadastro de empresa.
13. Criar login.
14. Criar logout.
15. Criar verificação de e-mail.
16. Criar recuperação de senha.
17. Criar middlewares de autorização.
18. Criar testes de isolamento.

## Critério de conclusão

- cliente entra;
- empresa entra;
- Admin entra;
- empresa pendente fica bloqueada;
- uma empresa não acessa dados de outra;
- termos aceitos ficam versionados.

## Estimativa

**18 a 26 horas**

---

# SPRINT 3 — CADASTRO, ATIVAÇÃO E PAINEL INICIAL DO ADMIN

## Objetivo

Permitir ativação manual.

## Subetapas

1. Criar cadastro empresarial.
2. Criar confirmação de e-mail.
3. Criar tela de conta pendente.
4. Criar botão de contato com a Velaris.
5. Criar lista de empresas no Admin.
6. Criar detalhes da empresa.
7. Criar ativação.
8. Criar suspensão.
9. Criar publicação.
10. Criar observações internas.
11. Criar auditoria da ativação.
12. Enviar e-mail de liberação.

## Critério de conclusão

- empresa se cadastra;
- permanece pendente;
- Admin ativa;
- acesso completo é liberado;
- perfil ainda depende de publicação.

## Estimativa

**12 a 18 horas**

---

# SPRINT 4 — HOME, BUSCA E PERFIL PÚBLICO

## Objetivo

Criar a descoberta de empresas.

## Subetapas

1. Criar onboarding.
2. Criar Home pública.
3. Criar categorias.
4. Criar busca por cidade e CEP.
5. Criar permissão de localização.
6. Criar cálculo de distância.
7. Criar raio de atendimento.
8. Criar listagem de empresas.
9. Criar perfil público.
10. Criar galeria.
11. Criar avaliações resumidas.
12. Criar CTA “Solicitar orçamento”.
13. Criar favoritos para usuários autenticados.

## Critério de conclusão

- usuário encontra empresas;
- empresas fora da região não aparecem;
- perfil abre por slug;
- link direto ignora onboarding.

## Estimativa

**16 a 22 horas**

---

# SPRINT 5 — TEMPLATES FIXOS E CAMPOS CONFIGURÁVEIS

## Objetivo

Criar o núcleo configurável sem construtor livre.

## Subetapas

1. Criar tabelas de templates.
2. Criar tipos de campo predefinidos.
3. Criar opções.
4. Criar obrigatoriedade.
5. Criar ativação por empresa.
6. Criar condições simples previstas.
7. Criar ordenação.
8. Criar preview do formulário.
9. Criar configuração no Admin.
10. Criar modo de agendamento por serviço.
11. Criar versionamento.
12. Criar simulação.
13. Criar snapshot.
14. Testar campos ativos e inativos.
15. Bloquear edição de versão publicada.

## Critério de conclusão

- Admin configura um template de nicho existente;
- cada empresa possui campos diferentes;
- campos condicionais funcionam;
- modo de agendamento é configurável;
- alterações não afetam solicitações antigas;
- o Admin não escreve código ou fórmula livre.

## Estimativa

**18 a 26 horas**

---

# SPRINT 6 — MOTOR DE CÁLCULO

## Objetivo

Criar cálculo seguro, normalizado e explicável.

## Subetapas

1. Definir contrato do motor.
2. Definir representação monetária.
3. Definir unidades normalizadas.
4. Implementar preço fixo.
5. Implementar quantidade.
6. Implementar área.
7. Implementar metro linear.
8. Implementar multiplicadores.
9. Implementar adicionais.
10. Implementar percentuais.
11. Implementar mínimos.
12. Implementar faixas.
13. Implementar condições.
14. Implementar deslocamento.
15. Implementar margem.
16. Implementar valor final sugerido.
17. Validar ajuste fora da faixa.
18. Gerar memória de cálculo.
19. Criar snapshot.
20. Criar testes unitários.
21. Criar simulação no Admin.
22. Testar idempotência do recálculo.

## Critério de conclusão

- cálculos são determinísticos;
- dinheiro não usa ponto flutuante;
- medidas são normalizadas;
- memória de cálculo é legível;
- estimativa é gerada;
- valor fora da faixa exige justificativa;
- testes dos tipos de regra passam.

## Estimativa

**24 a 34 horas**

---

# SPRINT 7 — TEMPLATE DE LIMPEZA DE ESTOFADOS

## Objetivo

Configurar o primeiro nicho completo.

## Subetapas

1. Cadastrar itens.
2. Cadastrar tamanhos.
3. Cadastrar tecidos.
4. Cadastrar sujeira.
5. Cadastrar manchas.
6. Cadastrar odor.
7. Cadastrar pelos.
8. Cadastrar impermeabilização.
9. Cadastrar urgência.
10. Cadastrar acesso.
11. Criar regras.
12. Criar casos de teste.
13. Validar com empresa real.

## Critério de conclusão

- formulário completo;
- estimativa coerente;
- revisão de sujeira recalcula;
- Admin consegue desativar tecido.

## Estimativa

**14 a 20 horas**

---

# SPRINT 8 — TEMPLATE DE VIDRAÇARIA

## Objetivo

Configurar vidraçarias.

## Subetapas

1. Cadastrar produtos.
2. Cadastrar medidas.
3. Cadastrar vidros.
4. Cadastrar espessuras.
5. Cadastrar cores.
6. Cadastrar acabamentos.
7. Cadastrar ferragens.
8. Cadastrar perfis.
9. Cadastrar instalação.
10. Cadastrar retirada.
11. Cadastrar acesso.
12. Criar regras de área.
13. Criar área mínima.
14. Criar casos de teste.
15. Validar com empresa real.

## Critério de conclusão

- orçamento de box funciona;
- variações recalculam;
- instalação e acessórios aparecem separados;
- área mínima funciona.

## Estimativa

**14 a 20 horas**

---

# SPRINT 9 — TEMPLATE DE MARMORARIA

## Objetivo

Configurar marmorarias.

## Subetapas

1. Cadastrar produtos.
2. Cadastrar materiais.
3. Cadastrar medidas.
4. Cadastrar espessuras.
5. Cadastrar bordas.
6. Cadastrar recortes.
7. Cadastrar frontão.
8. Cadastrar saia.
9. Cadastrar instalação.
10. Cadastrar transporte.
11. Cadastrar perda técnica.
12. Criar regras.
13. Criar casos de teste.
14. Validar com empresa real.

## Critério de conclusão

- bancada simples funciona;
- recortes somam corretamente;
- acabamento por metro funciona;
- perda técnica é registrada.

## Estimativa

**16 a 22 horas**

---

# SPRINT 10 — FLUXO PÚBLICO, RASCUNHO E SOLICITAÇÃO

## Objetivo

Permitir o preenchimento completo com persistência segura.

## Subetapas

1. Escolher serviço.
2. Criar rascunho no servidor.
3. Gerar `draft_token`.
4. Salvar apenas token e etapa no dispositivo.
5. Renderizar campos configurados.
6. Validar respostas.
7. Permitir voltar etapas.
8. Enviar imagens vinculadas ao rascunho.
9. Enviar PDF.
10. Informar endereço.
11. Informar nome.
12. Informar WhatsApp.
13. Informar e-mail.
14. Calcular estimativa.
15. Criar tela de revisão.
16. Permitir editar.
17. Confirmar solicitação com idempotência.
18. Alterar `draft` para `submitted`.
19. Gerar código e token público.
20. Salvar snapshot.
21. Registrar textos legais aceitos.
22. Enviar e-mail.
23. Criar rotina de limpeza de rascunhos.

## Critério de conclusão

- visitante conclui;
- rascunho sobrevive à atualização da página;
- arquivos pertencem ao rascunho correto;
- estimativa aparece antes do envio;
- dados podem ser editados;
- código e link são gerados no envio;
- clique duplo não duplica solicitação;
- rascunhos expirados são removidos.

## Estimativa

**22 a 30 horas**

---

# SPRINT 11 — PAINEL DA EMPRESA E REVISÃO

## Objetivo

Permitir análise operacional.

## Subetapas

1. Criar dashboard.
2. Criar lista de solicitações.
3. Criar filtros.
4. Criar detalhes.
5. Exibir fotos.
6. Exibir memória de cálculo.
7. Editar campos técnicos.
8. Exigir motivo quando necessário.
9. Salvar revisão.
10. Recalcular.
11. Mostrar diferença.
12. Aceitar solicitação.
13. Recusar com motivo.
14. Criar histórico.

## Critério de conclusão

- empresa recebe;
- revisa;
- recalcula;
- aceita ou recusa;
- alterações ficam auditadas.

## Estimativa

**18 a 26 horas**

---

# SPRINT 12 — PROPOSTAS, VERSÕES E VALOR FINAL

## Objetivo

Criar proposta definitiva e imutabilidade comercial.

## Subetapas

1. Criar `quotes`.
2. Criar versões.
3. Gerar código por versão.
4. Criar itens.
5. Preencher valor final com total interno.
6. Validar faixa.
7. Exigir justificativa fora da faixa.
8. Definir validade.
9. Definir termos e versões.
10. Criar preview.
11. Enviar proposta com idempotência.
12. Registrar visualização.
13. Solicitar alteração.
14. Criar nova versão.
15. Bloquear versão aceita.
16. Testar expiração.
17. Testar proposta sem agendamento.

## Critério de conclusão

- proposta pode ter versões;
- versão anterior permanece;
- valor final é sugerido;
- valor final é validado;
- proposta pode existir sem horário quando permitido;
- aceite trava a versão;
- envio duplicado não cria nova proposta.

## Estimativa

**20 a 26 horas**

---

# SPRINT 13 — AGENDAMENTO ASSISTIDO

## Objetivo

Conectar proposta e horário de forma configurável.

## Subetapas

1. Criar `appointments`.
2. Implementar `scheduling_mode`.
3. Propor data.
4. Propor horário.
5. Informar duração.
6. Aplicar timezone da empresa.
7. Detectar conflito básico.
8. Exibir aviso sem bloquear.
9. Cliente confirma.
10. Cliente solicita outro horário.
11. Empresa propõe novamente.
12. Registrar histórico.
13. Cancelar.
14. Marcar concluído.
15. Testar proposta sem agenda.
16. Testar agendamento após aceite.

## Critério de conclusão

- serviços podem exigir, permitir, adiar ou dispensar agenda;
- empresa propõe;
- cliente confirma;
- reagendamento funciona;
- conflito gera aviso;
- histórico é preservado.

## Estimativa

**14 a 20 horas**

---

# SPRINT 14 — ACOMPANHAMENTO, RECUPERAÇÃO E COMUNICAÇÃO

## Objetivo

Permitir uso sem conta.

## Subetapas

1. Usar token gerado na submissão.
2. Usar código gerado na submissão.
3. Criar tela de acompanhamento.
4. Criar recuperação.
5. Enviar OTP exclusivamente por e-mail.
6. Validar código + e-mail.
7. Validar código + WhatsApp como identificação complementar.
8. Criar e-mails transacionais.
9. Criar links `wa.me`.
10. Criar notificações internas.
11. Vincular pedido antigo a conta nova.
12. Revogar e substituir token.
13. Aplicar limites de tentativa.
14. Testar expiração de OTP.

## Critério de conclusão

- visitante recupera acesso;
- e-mail chega;
- token é seguro;
- OTP por e-mail funciona;
- não existe promessa de OTP automático por WhatsApp;
- WhatsApp abre preenchido.

## Estimativa

**16 a 22 horas**

---

# SPRINT 15 — PDF, ACEITE E DOCUMENTOS LEGAIS

## Objetivo

Criar documento e evidência.

## Subetapas

1. Criar template do PDF.
2. Gerar PDF por versão.
3. Inserir código da solicitação.
4. Inserir código da proposta.
5. Inserir validade.
6. Inserir itens.
7. Inserir agendamento quando existir.
8. Inserir termos e versões.
9. Registrar aceite com idempotência.
10. Registrar IP.
11. Registrar user agent.
12. Registrar versão da proposta.
13. Registrar versões legais.
14. Testar expiração.
15. Testar clique duplicado no aceite.

## Critério de conclusão

- PDF corresponde à proposta;
- aceite é auditável;
- versões legais são identificadas;
- versão aceita é identificada;
- proposta expirada não pode ser aceita;
- aceite duplicado não gera dois registros.

## Estimativa

**14 a 20 horas**

---

# SPRINT 16 — SERVIÇO REALIZADO E AVALIAÇÕES

## Objetivo

Fechar a jornada.

## Subetapas

1. Criar status do serviço.
2. Marcar realizado.
3. Notificar cliente.
4. Criar avaliação.
5. Validar elegibilidade.
6. Bloquear duplicação.
7. Exibir perfil.
8. Calcular média.
9. Criar moderação.
10. Criar convite por e-mail.

## Critério de conclusão

- somente atendimento real é avaliado;
- avaliação aparece;
- média é atualizada;
- Admin pode moderar.

## Estimativa

**10 a 16 horas**

---

# SPRINT 17 — ÁREA DO CLIENTE

## Objetivo

Criar experiência autenticada.

## Subetapas

1. Criar Home personalizada.
2. Mostrar solicitações.
3. Mostrar propostas.
4. Mostrar agendamentos.
5. Mostrar histórico.
6. Criar favoritos.
7. Mostrar empresas recentes.
8. Mostrar avaliações pendentes.
9. Vincular solicitações de visitante.
10. Criar notificações.

## Critério de conclusão

- cliente encontra tudo;
- histórico está organizado;
- visitante pode migrar para conta.

## Estimativa

**14 a 20 horas**

---

# SPRINT 18 — MÉTRICAS E ADMINISTRAÇÃO OPERACIONAL

## Objetivo

Criar visão gerencial.

## Subetapas

1. Criar métricas da empresa.
2. Criar métricas do Admin.
3. Criar filtros por período.
4. Criar filtros por nicho.
5. Criar filtros por empresa.
6. Criar taxa de conversão.
7. Criar tempo de resposta.
8. Criar valor estimado.
9. Criar valor proposto.
10. Criar valor aceito.
11. Criar ranking.
12. Criar auditoria.
13. Criar solicitações de preço.

## Critério de conclusão

- empresa acompanha desempenho;
- Admin acompanha a plataforma;
- mudanças importantes são rastreáveis.

## Estimativa

**16 a 24 horas**

---

# SPRINT 19 — PWA, SEGURANÇA, DESEMPENHO E DEPLOY

## Objetivo

Preparar produção.

## Subetapas

1. Criar manifest.
2. Criar ícones.
3. Configurar instalação.
4. Criar cache seguro.
5. Configurar rate limit.
6. Validar permissões.
7. Testar isolamento.
8. Testar uploads.
9. Testar idempotência das ações críticas.
10. Testar matriz de estados.
11. Testar timezone.
12. Testar dinheiro e unidades.
13. Configurar limpeza de rascunhos.
14. Configurar backups.
15. Configurar monitoramento.
16. Configurar domínio.
17. Configurar SSL.
18. Configurar homologação.
19. Rodar testes completos.
20. Criar conta piloto.
21. Fazer deploy.
22. Corrigir problemas.
23. Documentar suporte.

## Critério de conclusão

- PWA instalável;
- segurança validada;
- ações duplicadas protegidas;
- rascunhos abandonados são tratados;
- ambiente estável;
- empresa piloto usa a jornada completa.

## Estimativa

**22 a 32 horas**

---

# 31. TESTES OBRIGATÓRIOS

## Cliente

- acesso direto;
- onboarding;
- busca;
- localização negada;
- visitante;
- cliente autenticado;
- criação de rascunho;
- retomada de rascunho;
- limpeza de rascunho expirado;
- upload;
- revisão;
- estimativa;
- confirmação;
- clique duplo na confirmação;
- código gerado no envio;
- recuperação por e-mail;
- código + WhatsApp com OTP enviado ao e-mail;
- aceite;
- clique duplo no aceite;
- reagendamento;
- cancelamento;
- avaliação.

## Empresa

- pendente;
- ativa;
- suspensa;
- isolamento;
- revisão;
- recálculo;
- recusa;
- proposta;
- versão;
- proposta sem agendamento;
- agendamento obrigatório;
- agendamento após aceite;
- conflito de horário com aviso;
- serviço realizado.

## Admin

- ativação;
- suspensão;
- publicação;
- configuração de template fixo;
- tentativa de editar versão publicada;
- campos ativos;
- preços;
- versões;
- simulação;
- auditoria;
- solicitação de alteração.

## Cálculo

- valores em `NUMERIC`;
- arredondamento;
- centavos;
- cm para m;
- mm para m;
- m²;
- metro linear;
- valor mínimo;
- valor zero permitido;
- valor negativo bloqueado;
- valor dentro da faixa;
- valor fora da faixa;
- recálculo idempotente.

## Estados

- todas as transições permitidas;
- proposta expirada não aceita;
- solicitação recusada não gera proposta;
- serviço cancelado não vira realizado;
- versão aceita não é alterada;
- ação administrativa excepcional gera auditoria.

## Nichos

- limpeza simples;
- limpeza com sujeira intensa;
- tecido desativado;
- vidraçaria com área mínima;
- vidraçaria com instalação;
- marmoraria com recortes;
- marmoraria com acabamento;
- valor fora da faixa;
- mudança de configuração sem alterar solicitação antiga.

---

# 32. DEFINIÇÃO DA V1 CONCLUÍDA

A V1 estará pronta quando for possível:

```txt
entrar na plataforma
↓
encontrar uma empresa
↓
abrir o perfil
↓
iniciar rascunho seguro
↓
preencher uma solicitação
↓
enviar fotos
↓
visualizar a estimativa
↓
confirmar o envio sem duplicação
↓
receber código e link
↓
empresa revisar
↓
recalcular
↓
enviar proposta
↓
propor horário, quando aplicável
↓
cliente confirmar
↓
acompanhar pelo mesmo link
↓
abrir WhatsApp
↓
realizar serviço
↓
avaliar
↓
consultar histórico e métricas
```

Além disso:

- três nichos configurados;
- templates fixos personalizáveis;
- empresa ativada manualmente;
- preços administrados pela Velaris;
- dados isolados por empresa;
- dinheiro e medidas normalizados;
- estados validados;
- ações críticas idempotentes;
- recuperação automática por e-mail;
- PDFs e versões funcionando;
- termos versionados;
- PWA instalável;
- deploy de produção validado.

---

# 33. ESTIMATIVA TOTAL

## Estimativa técnica

| Bloco | Horas |
|---|---:|
| Produto, protótipo e fundação | 14–22 |
| Banco, autenticação e ativação | 28–42 |
| Home, perfil e descoberta | 16–22 |
| Campos e cálculo | 40–58 |
| Três nichos | 44–62 |
| Solicitação e painel da empresa | 38–54 |
| Propostas, agenda e acompanhamento | 46–66 |
| PDF, avaliações e cliente | 36–54 |
| Métricas, segurança e deploy | 36–54 |
| **Total estimado** | **298–434 horas** |

Essa estimativa inclui desenvolvimento, testes, correções e refinamento da V1 completa.

As adições da versão 1.1 aumentam um pouco o trabalho de segurança e persistência, mas a limitação do Admin a templates fixos e a remoção do OTP por WhatsApp reduzem complexidade. Por isso, a faixa total permanece aproximadamente válida.

## Comparação com o LeadHunt

As funcionalidades recentes do LeadHunt foram concluídas em aproximadamente três dias, mas elas foram adicionadas a um projeto já existente, com banco, autenticação, interface, deploy e estrutura prontos.

O Velaris Orçamentos começa praticamente do zero e inclui:

- três áreas diferentes;
- multiempresa;
- autenticação;
- uploads;
- motor configurável;
- três nichos complexos;
- versionamento;
- agendamento;
- recuperação;
- e-mails;
- PWA;
- segurança;
- deploy.

O escopo é aproximadamente **5 a 7 vezes maior** que o bloco recente do LeadHunt.

## Estimativa baseada no seu ritmo observado

### MVP funcional de um nicho

Limpeza de estofados, fluxo visitante, painel da empresa e Admin básico:

**10 a 16 dias de trabalho intenso**

### V1 com os três nichos

Incluindo proposta, agenda, acompanhamento, PDF e avaliações:

**22 a 32 dias de trabalho intenso**

### V1 refinada para produção

Incluindo segurança, métricas, responsividade completa, PWA, testes e correções:

**28 a 42 dias**

## Estimativa em ritmo de 4 horas por noite

**75 a 109 noites**

Esse segundo número é mais conservador porque considera o total técnico de horas. Pela velocidade demonstrada no LeadHunt, o prazo real provavelmente ficará mais próximo da faixa de **22 a 32 dias intensos**, desde que o trabalho seja contínuo e as decisões de produto já estejam fechadas.

---

# 34. MARCOS DE PRODUTO E ESTRATÉGIA DE LANÇAMENTO

## 34.1 MVP piloto

O MVP piloto será considerado pronto com:

- Admin Velaris básico;
- uma empresa de limpeza de estofados;
- acesso por link direto;
- cliente visitante;
- rascunho no servidor;
- campos configurados;
- cálculo;
- fotos;
- estimativa;
- código e link;
- painel da empresa;
- revisão;
- proposta final;
- agendamento assistido;
- recuperação por e-mail;
- WhatsApp assistido;
- serviço realizado;
- avaliação.

Não exige ainda:

- descoberta completa por localização;
- conta completa do cliente;
- favoritos;
- vidraçarias;
- marmorarias;
- métricas avançadas.

## 34.2 V1 completa

Acrescenta:

- Home com descoberta;
- geolocalização;
- área autenticada do cliente;
- favoritos;
- histórico completo;
- vidraçarias;
- marmorarias;
- PDF;
- métricas completas;
- PWA;
- moderação;
- segurança e refinamentos de produção.

## 34.3 Fase A — Piloto interno

- Admin Velaris;
- uma empresa de limpeza;
- fluxo visitante;
- cálculo;
- proposta;
- agendamento;
- acompanhamento.

## 34.4 Fase B — Primeiro cliente real

- validar preços;
- observar abandonos;
- corrigir formulário;
- medir tempo de resposta;
- testar avaliações;
- validar rascunhos;
- validar recuperação por e-mail.

## 34.5 Fase C — Segundo e terceiro nichos

- vidraçaria;
- marmoraria;
- comparar regras;
- refinar motor.

## 34.6 Fase D — Abertura controlada

- cadastrar poucas empresas;
- oferecer plano único;
- suporte próximo;
- coletar feedback;
- documentar mudanças.

## 34.7 Fase E — Evolução futura

- solicitações abertas para empresas próximas;
- vários planos;
- WhatsApp oficial;
- OTP por WhatsApp;
- agenda avançada;
- pagamentos;
- sistemas personalizados;
- IA de análise de fotos;
- aplicativo nativo.

---

# 35. PRIMEIRO PASSO PRÁTICO

Antes de criar SQL:

1. definir o nome final do produto;
2. criar identidade visual;
3. fechar a matriz de estados;
4. definir os modos de agendamento;
5. definir os textos legais e suas versões iniciais;
6. desenhar onboarding;
7. desenhar Home;
8. desenhar perfil público;
9. desenhar formulário;
10. desenhar revisão;
11. desenhar acompanhamento;
12. desenhar painel da empresa;
13. desenhar painel do Admin;
14. fechar o template de limpeza de estofados;
15. criar o protótipo navegável;
16. validar o escopo do MVP piloto.

Depois:

```txt
Banco e autenticação
↓
Admin e ativação
↓
Templates fixos
↓
Motor de cálculo
↓
Primeiro nicho
↓
Rascunho e fluxo público
↓
Código e acompanhamento
↓
Painel da empresa
↓
Proposta e agenda
↓
Recuperação por e-mail
↓
Demais nichos
↓
Métricas e produção
```

---

