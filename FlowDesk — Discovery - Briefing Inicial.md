# FlowDesk — Discovery / Briefing Inicial

## 1. Visão do projeto

**FlowDesk** é uma plataforma SaaS B2B de gestão operacional e automação de processos para pequenas e médias equipes.

A proposta é permitir que uma empresa organize em um único ambiente:

- clientes;
- projetos;
- tarefas;
- responsáveis;
- pipelines;
- processos internos;
- automações;
- notificações;
- histórico de atividades;
- indicadores operacionais.

O principal diferencial do FlowDesk será permitir que esses elementos sejam conectados através de **workflows visuais**, fazendo com que processos que normalmente dependem de planilhas, mensagens, tarefas manuais e várias ferramentas diferentes possam ser organizados e parcialmente automatizados.

A visão pode ser resumida como:

> **Organize o trabalho. Conecte os processos. Automatize o que é repetitivo.**

---

# 2. Problema

Pequenas empresas frequentemente administram suas operações utilizando uma combinação de:

- WhatsApp;
- e-mail;
- Trello;
- planilhas;
- Notion;
- calendários;
- CRMs;
- ferramentas internas;
- comunicação verbal.

O problema não é necessariamente a ausência de ferramentas.

O problema é que **essas ferramentas não trabalham juntas**.

Um novo cliente pode chegar pelo WhatsApp, ser colocado manualmente em uma planilha, gerar uma tarefa no Trello, precisar de uma proposta enviada por e-mail e posteriormente virar um projeto em outra ferramenta.

Isso cria:

- retrabalho;
- tarefas esquecidas;
- informações espalhadas;
- dificuldade de acompanhar responsáveis;
- falta de histórico;
- processos inconsistentes;
- pouca visibilidade da operação.

---

# 3. Solução

O FlowDesk transforma processos empresariais em fluxos estruturados.

Exemplo:

```text
Novo Lead
    ↓
Criar oportunidade
    ↓
Atribuir vendedor
    ↓
Criar tarefa
    ↓
Enviar proposta
    ↓
Proposta aprovada?
   ↙             ↘
 NÃO             SIM
  ↓               ↓
Follow-up      Criar projeto
                  ↓
            Criar tarefas
                  ↓
            Notificar equipe
```

Cada etapa pode executar ações automaticamente.

O usuário deixa de apenas **registrar trabalho** e passa a **modelar como o trabalho acontece**.

---

# 4. Público-alvo

Inicialmente:

- pequenas empresas;
- agências;
- startups;
- software houses;
- consultorias;
- equipes comerciais;
- freelancers com equipe;
- prestadores de serviços.

O foco inicial deve ser organizações com aproximadamente **2–50 pessoas**, onde processos já existem, mas ainda são gerenciados de maneira parcialmente manual.

---

# 5. Estrutura SaaS

FlowDesk deve nascer como uma aplicação **multi-tenant**.

A estrutura principal será:

```text
FlowDesk
   ↓
Workspace / Organização
   ↓
Membros
   ↓
Clientes
   ↓
Projetos
   ↓
Tarefas
   ↓
Pipelines
   ↓
Workflows
```

Um usuário poderá futuramente participar de mais de um workspace.

Exemplo:

```text
Luis
├── ServAgency
├── Startup XYZ
└── Projeto Freelancer
```

Os dados de cada workspace deverão permanecer completamente isolados.

---

# 6. Workspaces

Cada empresa possui seu próprio workspace.

Um workspace poderá possuir:

- nome;
- logo;
- membros;
- clientes;
- projetos;
- pipelines;
- workflows;
- configurações;
- histórico;
- integrações.

---

# 7. Membros e permissões

O sistema deverá possuir RBAC — Role-Based Access Control.

Papéis iniciais:

### Owner

Controle completo do workspace.

### Admin

Gerencia membros, projetos e configurações operacionais.

### Member

Executa e gerencia trabalho permitido.

### Viewer

Somente visualização.

A arquitetura deve permitir permissões mais granulares futuramente.

---

# 8. Clientes

Cada workspace poderá manter sua própria base de clientes.

Um cliente poderá possuir:

- nome;
- empresa;
- e-mail;
- telefone;
- responsável interno;
- status;
- tags;
- observações;
- projetos;
- tarefas relacionadas;
- histórico de atividades.

Não é objetivo inicial construir um CRM gigantesco.

O módulo existe para fornecer **contexto operacional** aos processos.

---

# 9. Projetos

Clientes poderão possuir projetos.

Exemplo:

```text
Cliente
Studio Nova

Projeto
Novo Website

Responsável
Luis

Status
Em andamento
```

Projetos possuirão:

- nome;
- descrição;
- cliente;
- responsáveis;
- status;
- prioridade;
- prazo;
- tarefas;
- atividades.

---

# 10. Tarefas

Tarefas serão uma das unidades fundamentais do sistema.

Cada tarefa poderá possuir:

- título;
- descrição;
- responsável;
- projeto;
- cliente;
- prioridade;
- status;
- prazo;
- tags;
- comentários;
- histórico.

Status iniciais:

```text
Backlog
To Do
In Progress
Review
Done
```

Workspaces poderão futuramente personalizar esses estados.

---

# 11. Pipelines

O sistema permitirá visualizar processos através de pipelines.

Exemplo comercial:

```text
Lead
↓
Qualificação
↓
Proposta
↓
Negociação
↓
Fechado
```

Exemplo de projetos:

```text
Planejamento
↓
Design
↓
Desenvolvimento
↓
Revisão
↓
Entrega
```

Os itens poderão ser movimentados visualmente por drag-and-drop.

---

# 12. Workflow Builder

Este será um dos principais diferenciais do FlowDesk.

O usuário poderá construir automações utilizando um editor visual baseado em nós.

Exemplo:

```text
[New Client]
      ↓
[Create Project]
      ↓
[Create Tasks]
      ↓
[Assign Member]
      ↓
[Send Notification]
```

A interface poderá utilizar React Flow ou tecnologia equivalente.

---

# 13. Estrutura de uma automação

Um workflow será composto por:

### Trigger

Algo aconteceu.

Exemplos:

- cliente criado;
- projeto criado;
- tarefa concluída;
- pipeline alterado;
- prazo próximo.

### Condition

Verifica determinada regra.

Exemplo:

```text
IF project.value > 5000
```

### Action

Executa alguma operação.

Exemplos:

```text
Create Task
Assign Member
Change Status
Create Project
Send Notification
```

Conceitualmente:

```text
TRIGGER
   ↓
CONDITION
   ↓
ACTION
```

---

# 14. Motor de automações

O sistema deverá possuir um mecanismo de execução de workflows.

Exemplo:

```text
Client Created
      ↓
Event generated
      ↓
Workflow Engine
      ↓
Evaluate Conditions
      ↓
Execute Actions
      ↓
Execution Log
```

As execuções deverão ser:

- rastreáveis;
- idempotentes quando necessário;
- recuperáveis em caso de falha;
- executadas assincronamente quando apropriado.

---

# 15. Histórico de atividades

Praticamente todas as ações relevantes deverão gerar eventos.

Exemplo:

```text
10:32 — Luis criou Projeto Website
10:34 — FlowDesk criou 5 tarefas automaticamente
10:35 — Ana foi atribuída ao Design
11:20 — Ana moveu Design para In Progress
```

Isso cria uma timeline operacional da empresa.

---

# 16. Notificações

O FlowDesk deverá possuir um Notification Center.

Exemplos:

```text
Ana mencionou você em uma tarefa.

Projeto Website vence amanhã.

Workflow "Novo Cliente" foi executado.

Automação "Onboarding" falhou.
```

Inicialmente:

- notificações in-app.

Futuramente:

- e-mail;
- push;
- Slack;
- Microsoft Teams;
- WhatsApp.

---

# 17. Dashboard

O dashboard deverá mostrar o estado operacional do workspace.

Possíveis indicadores:

- projetos ativos;
- tarefas pendentes;
- tarefas atrasadas;
- tarefas concluídas;
- clientes ativos;
- workloads por membro;
- workflows executados;
- automações com falha;
- atividade recente.

A ideia não é encher a interface de gráficos, mas responder rapidamente:

> **O que está acontecendo na minha operação agora?**

---

# 18. IA — Flow AI

A IA não deverá existir apenas como chatbot.

Ela deverá participar diretamente da criação e otimização dos processos.

## AI Workflow Builder

O usuário poderá escrever:

> Quando um novo cliente for criado, crie um projeto de onboarding, gere as tarefas iniciais, atribua o gerente da conta e me avise.

A IA interpreta a intenção e propõe:

```text
Client Created
      ↓
Create Project
      ↓
Create Tasks
      ↓
Assign Member
      ↓
Notify Owner
```

O usuário revisa e aprova antes da ativação.

---

# 19. AI Workflow Analysis

A IA também poderá analisar processos existentes.

Exemplo:

> Analise meu processo comercial.

Flow AI poderá identificar:

```text
O estágio "Proposta enviada" apresenta permanência
significativamente maior que os demais.

Possível melhoria:
criar follow-up automático após 3 dias sem movimentação.
```

Isso transforma a IA em uma camada de **inteligência operacional**.

---

# 20. AI Workspace Assistant — Futuro

Posteriormente será possível perguntar:

> Quais projetos estão atrasados?

> Quem está com mais tarefas?

> Quais clientes não recebem atualização há mais de uma semana?

> Quais automações estão falhando?

A IA deverá consultar dados estruturados e respeitar rigorosamente as permissões do usuário.

---

# 21. Templates

O sistema poderá oferecer templates prontos.

### Agência

```text
Novo cliente
→ Briefing
→ Design
→ Desenvolvimento
→ Aprovação
→ Entrega
```

### Comercial

```text
Lead
→ Qualificação
→ Reunião
→ Proposta
→ Negociação
→ Fechado
```

### Desenvolvimento

```text
Backlog
→ Development
→ Code Review
→ QA
→ Production
```

Isso reduz bastante a barreira de entrada para novos usuários.

---

# 22. Integrações futuras

A arquitetura deverá permitir integrações com serviços externos.

Possibilidades:

- GitHub;
- Gmail;
- Google Calendar;
- Slack;
- Microsoft Teams;
- Discord;
- Stripe;
- WhatsApp;
- Webhooks personalizados.

Não precisam fazer parte do primeiro MVP.

---

# 23. Webhooks

Workspaces poderão futuramente criar webhooks.

Exemplo:

```text
Task Completed
      ↓
Webhook
      ↓
Sistema externo
```

E também receber eventos externos:

```text
Stripe Payment Received
      ↓
FlowDesk
      ↓
Move Client → Paid
```

Isso aumenta muito o potencial do FlowDesk como plataforma.

---

# 24. MVP

O primeiro MVP deverá provar três coisas:

**organização + colaboração + automação.**

### Autenticação

- cadastro;
- login;
- logout;
- recuperação de senha;
- gerenciamento de sessão.

### Workspace

- criar workspace;
- editar workspace;
- convidar membros;
- aceitar convite;
- remover membro;
- RBAC básico.

### Clientes

- criar;
- editar;
- arquivar;
- visualizar histórico.

### Projetos

- criar;
- editar;
- arquivar;
- atribuir membros;
- vincular cliente.

### Tarefas

- CRUD;
- responsáveis;
- prioridade;
- prazo;
- status;
- comentários.

### Pipeline / Board

- visualização Kanban;
- drag-and-drop;
- estados;
- atualização otimista.

### Workflow Builder V1

Nós iniciais:

**Triggers**
- Client Created
- Project Created
- Task Completed
- Status Changed

**Conditions**
- campo igual;
- campo diferente;
- prioridade;
- responsável.

**Actions**
- Create Task
- Assign Member
- Change Status
- Create Project
- Send Notification

### Automation Engine

- execução assíncrona;
- histórico de execuções;
- retries;
- idempotência;
- status de sucesso/falha.

### Activity Feed

- ações de usuários;
- ações de automações;
- timeline.

### Notifications

- in-app;
- lida/não lida.

### Dashboard

- projetos;
- tarefas;
- atrasos;
- atividade;
- automações.

---

# 25. O que NÃO entra no MVP

Para impedir que o projeto fique gigantesco, deixar para fases posteriores:

- pagamentos e billing SaaS;
- Slack;
- Gmail;
- WhatsApp;
- GitHub;
- calendário externo;
- aplicativo mobile;
- aplicativo desktop;
- marketplace de templates;
- automações extremamente complexas;
- execução arbitrária de código;
- dezenas de tipos de nós;
- AI Workspace Assistant completo.

A IA poderá entrar após o Workflow Engine básico estar funcional.

---

# 26. Segurança

Segurança deverá ser tratada como requisito arquitetural.

Implementar:

- Argon2;
- access token de curta duração;
- refresh token rotativo;
- revogação de sessão;
- rate limiting;
- validação rigorosa de entrada;
- audit logs;
- proteção contra IDOR;
- RBAC;
- isolamento multi-tenant;
- secrets fora do código;
- HTTPS;
- sanitização;
- proteção contra abuso de automações.

Regra fundamental:

> Um usuário jamais poderá acessar recursos pertencentes a um workspace do qual não faça parte.

Essa regra deverá existir no backend e não depender apenas do frontend.

---

# 27. Stack sugerida

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Hook Form
- Zod
- React Flow
- dnd-kit
- Motion

## Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL / Supabase
- Redis
- BullMQ

## IA

- Python
- FastAPI
- OpenAI API

Python deverá entrar quando houver benefício concreto para análise/processamento de IA; não criar microserviço apenas por arquitetura.

## Infraestrutura

- Docker
- Supabase PostgreSQL
- Redis gerenciado
- Vercel ou Render
- CI/CD com GitHub Actions

---

# 28. Direção visual

FlowDesk deve parecer um **produto SaaS premium de produtividade**, não um painel administrativo genérico.

Referências conceituais:

- Linear;
- Raycast;
- Vercel;
- Notion;
- Stripe;
- Framer.

Características:

- interface extremamente limpa;
- tipografia forte;
- alta densidade de informação sem poluição;
- sidebar compacta;
- command palette;
- microinterações;
- drag-and-drop fluido;
- feedback imediato;
- skeleton loading;
- optimistic updates;
- motion funcional;
- dark e light mode;
- excelente responsividade.

O Workflow Builder deve ser a área visualmente mais marcante do produto.

---

# 29. Diferencial técnico

O FlowDesk não deve ser apresentado como:

> "Um Trello feito com Next.js."

A proposta técnica é:

> **Uma plataforma SaaS multi-tenant orientada a eventos para gestão operacional e automação visual de workflows.**

Isso permite demonstrar:

- arquitetura SaaS;
- multi-tenancy;
- RBAC;
- modelagem complexa;
- sistemas orientados a eventos;
- filas;
- processamento assíncrono;
- idempotência;
- realtime;
- drag-and-drop;
- node-based UI;
- integrações;
- webhooks;
- IA aplicada a processos;
- segurança;
- observabilidade.

---

# 30. Visão de evolução

### V1 — Operations

```text
Workspace
Members
Clients
Projects
Tasks
Boards
Notifications
Activity
```

### V2 — Automation

```text
Workflow Builder
Triggers
Conditions
Actions
Execution Engine
Logs
Templates
```

### V3 — Intelligence

```text
AI Workflow Builder
Workflow Analysis
Operational Insights
Natural Language → Workflow
```

### V4 — Platform

```text
Webhooks
Integrations
Public API
Developer Platform
Marketplace
```

### V5 — Commercial SaaS

```text
Plans
Billing
Usage Limits
Teams
Enterprise Controls
Advanced Analytics
```

---

# 31. Critério de sucesso do projeto

O FlowDesk estará cumprindo sua proposta quando um pequeno time conseguir entrar na plataforma e transformar um processo que hoje depende de várias ações manuais em algo como:

```text
Evento acontece
       ↓
FlowDesk identifica
       ↓
Workflow decide
       ↓
Ações são executadas
       ↓
Equipe acompanha
       ↓
Histórico permanece registrado
```

O objetivo final não é simplesmente gerenciar tarefas.

É criar um **sistema operacional para o trabalho de pequenas equipes**.
