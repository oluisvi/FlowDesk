# FLOWDESK — HYPER MASTER CODEX EXECUTION PROMPT

## PRODUCT DESIGN, ARCHITECTURE, ENGINEERING & MVP EXECUTION SYSTEM

You are operating directly inside the **FlowDesk repository**.

Your job is **not** to create only a plan, prototype, wireframe, PRD, architecture document, mockup, component showcase, or partial proof of concept.

Your job is to:

> **Design, architect, implement, test, refine and prepare FlowDesk as a real production-grade SaaS MVP.**

You must apply the principles of the **HYPER MASTER Luxury Cinematic Website Design, Build & Optimization System**, adapted appropriately for a high-density B2B productivity SaaS application.

The result must feel like a serious software product built by an experienced product engineering team rather than:

- a coding tutorial;
- a CRUD demo;
- a Trello clone;
- an admin template;
- a generic shadcn dashboard;
- an AI-generated SaaS interface;
- a Dribbble concept without backend depth;
- a frontend portfolio project pretending to be a SaaS;
- a collection of unrelated components;
- an over-engineered distributed system built only to look technically impressive.

The final product must combine:

**Product Thinking + SaaS Architecture + Multi-Tenancy + Security + UX + UI + Workflow Automation + Event-Driven Architecture + Background Jobs + Observability + Performance + Accessibility + Testing + Developer Experience**

into one coherent system.

---

# 0. PRIMARY EXECUTION DIRECTIVE

This is a **LARGE** project.

Treat it accordingly.

However:

## DO NOT STOP AFTER PLANNING.

Planning is preparation for implementation, not the deliverable.

You must:

1. inspect the repository;
2. understand the current state;
3. determine what already exists;
4. preserve working systems;
5. identify the delta between current state and the required FlowDesk MVP;
6. create a concise internal implementation strategy;
7. implement the product incrementally;
8. validate each major vertical slice;
9. continue automatically to the next required slice;
10. harden the product;
11. run final validation;
12. report what was actually built.

Do not ask the user to manually approve each stage.

Do not stop after:

- Discovery;
- Creative Direction;
- database schema;
- architecture;
- design system;
- authentication;
- frontend;
- backend;
- Workflow Builder;
- a checklist;
- documentation.

Continue until the requested scope has been implemented as far as the available environment, credentials and tooling permit.

If an external credential is genuinely required, implement everything around it, document the missing environment variable, provide a safe fallback when appropriate, and continue with all work that does not depend on that credential.

Do not use missing deployment credentials as a reason to stop development.

---

# 1. PROJECT SOURCE OF TRUTH

The following product definition is authoritative.

# Product

**FlowDesk**

A B2B SaaS platform for operational management and process automation for small and medium teams.

Primary product idea:

> **Organize work. Connect processes. Automate what is repetitive.**

FlowDesk allows a business to manage in one environment:

- workspaces;
- members;
- clients;
- projects;
- tasks;
- responsibilities;
- pipelines;
- workflows;
- automations;
- notifications;
- activity history;
- operational indicators.

Its main differentiator is:

> **Visual workflows connecting operational entities and automatically executing business actions.**

FlowDesk is not simply a task manager.

FlowDesk is intended to evolve into:

> **An operating system for the work of small teams.**

---

# 2. CORE PRODUCT PROBLEM

Small companies often run operations using disconnected combinations of:

- WhatsApp;
- email;
- spreadsheets;
- Trello;
- Notion;
- calendars;
- CRM systems;
- internal tools;
- verbal communication.

The fundamental problem is not lack of tools.

The problem is:

> **The tools do not work together.**

This causes:

- repeated manual work;
- forgotten tasks;
- fragmented information;
- unclear ownership;
- weak operational history;
- inconsistent processes;
- poor visibility;
- manual handoffs;
- unnecessary communication overhead.

FlowDesk must reduce this fragmentation.

---

# 3. PRODUCT POSITIONING

Never position or design FlowDesk as:

> "Trello built with Next.js."

The technical and product proposition is:

> **A multi-tenant, event-driven SaaS platform for operational management and visual workflow automation.**

The product should demonstrate serious implementation of:

- SaaS architecture;
- multi-tenancy;
- RBAC;
- complex relational modeling;
- secure authorization;
- asynchronous processing;
- queues;
- events;
- workflow execution;
- retries;
- idempotency;
- visual node-based interfaces;
- drag-and-drop;
- activity tracking;
- notifications;
- operational analytics;
- extensibility;
- observability;
- security;
- eventual AI-assisted process automation.

---

# 4. TARGET USERS

Initial target organizations:

- small businesses;
- agencies;
- startups;
- software houses;
- consulting firms;
- sales teams;
- service businesses;
- freelancers with teams.

Initial organization size:

**approximately 2–50 people.**

These companies already have processes but manage many of them manually or across disconnected tools.

---

# 5. PRIMARY USER VALUE

FlowDesk must help the user move from:

> "I record the work."

to:

> "I define how the work happens."

The product should make this lifecycle possible:

```text
Something happens
        ↓
FlowDesk identifies the event
        ↓
A workflow evaluates the context
        ↓
The workflow decides what to do
        ↓
Actions are executed
        ↓
The team receives the result
        ↓
The entire execution remains traceable
```

---

# 6. MVP PRINCIPLE

The first MVP exists to prove three things:

> **Organization + Collaboration + Automation**

Do not allow scope expansion to compromise these three pillars.

---

# 7. MVP SCOPE — REQUIRED

The MVP must include the following functional domains.

---

## 7.1 Authentication

Implement:

- registration;
- login;
- logout;
- password recovery;
- password reset;
- session management;
- refresh token rotation;
- session revocation.

Security requirements are defined later.

---

## 7.2 Workspace

Implement:

- create workspace;
- update workspace;
- workspace settings;
- invite member;
- accept invitation;
- list members;
- change member role when authorized;
- remove member;
- leave workspace when allowed;
- workspace switching architecture.

A user may eventually belong to multiple workspaces.

The architecture must support this now even if some UI paths initially prioritize the current workspace.

Example:

```text
User
├── Workspace A
├── Workspace B
└── Workspace C
```

All workspace data must remain isolated.

---

## 7.3 RBAC

Initial roles:

### Owner

Full workspace control.

### Admin

Manages members and operational resources.

### Member

Creates and manages work according to permitted operations.

### Viewer

Read-only access.

Build the authorization layer so that more granular permissions can be introduced later without replacing the whole architecture.

Never implement authorization only in the frontend.

---

## 7.4 Clients

Each workspace has its own client base.

Client capabilities:

- create;
- edit;
- archive;
- view;
- search;
- filter;
- responsible internal member;
- status;
- tags where appropriate;
- notes;
- related projects;
- related tasks where useful;
- activity history.

Possible data:

- name;
- company;
- email;
- phone;
- status;
- assigned member;
- notes.

Do not turn this into a giant CRM.

This module exists to provide operational context.

---

## 7.5 Projects

Projects may belong to clients.

Implement:

- create;
- edit;
- archive;
- view;
- assign members;
- connect to client;
- status;
- priority;
- deadline;
- tasks;
- operational activity.

Core fields may include:

```text
name
description
workspace
client
members
status
priority
deadline
createdAt
updatedAt
archivedAt
```

Use normalized relationships where appropriate.

---

## 7.6 Tasks

Tasks are one of the fundamental operational units.

Implement:

- create;
- edit;
- archive/delete according to the chosen safe model;
- responsible member;
- project;
- client context when useful;
- priority;
- status;
- due date;
- tags if justified;
- comments;
- history.

Initial statuses:

```text
Backlog
To Do
In Progress
Review
Done
```

Design the architecture so custom states can be supported in a later version.

Do not prematurely implement a massive custom status engine unless the MVP already needs it.

---

## 7.7 Pipeline / Board

Implement a high-quality Kanban / pipeline experience.

Requirements:

- visual columns;
- drag-and-drop;
- immediate interaction feedback;
- optimistic updates;
- rollback on failed mutation;
- keyboard accessibility where practical;
- touch behavior;
- loading states;
- empty states;
- error states.

The same underlying visual interaction pattern should be reusable for operational pipelines when appropriate.

Use `dnd-kit` or another justified solution.

Do not build drag-and-drop manually if a reliable existing dependency solves it cleanly.

---

# 8. WORKFLOW BUILDER V1

The Workflow Builder is one of FlowDesk's defining product experiences.

It must not feel like an afterthought.

Use **React Flow** or a strong equivalent unless the current repository already provides an appropriate implementation.

The user creates visual workflows composed of nodes and edges.

Concept:

```text
TRIGGER
   ↓
CONDITION
   ↓
ACTION
```

Example:

```text
[Client Created]
       ↓
[Create Project]
       ↓
[Create Tasks]
       ↓
[Assign Member]
       ↓
[Send Notification]
```

---

## 8.1 Supported Trigger Nodes

Initial triggers:

- Client Created
- Project Created
- Task Completed
- Status Changed

Each trigger must correspond to actual domain events emitted by the backend.

Do not create purely decorative workflow triggers.

---

## 8.2 Supported Condition Nodes

Initial conditions:

- field equals;
- field does not equal;
- priority comparison;
- responsible member comparison.

Implement conditions using typed and validated expressions.

Do not use `eval`.

Do not allow arbitrary JavaScript.

Do not execute arbitrary user code.

---

## 8.3 Supported Action Nodes

Initial actions:

- Create Task
- Assign Member
- Change Status
- Create Project
- Send Notification

Action handlers should follow a predictable architecture so new actions can be added later.

---

# 9. WORKFLOW BUILDER UX

The Workflow Builder should become the most visually recognizable part of FlowDesk.

Required experience:

- node canvas;
- drag nodes;
- connect nodes;
- pan;
- zoom;
- fit view;
- minimap only if useful;
- node selection;
- node inspector / configuration panel;
- validation feedback;
- invalid graph feedback;
- workflow name;
- status;
- save draft;
- activate;
- deactivate;
- execution information;
- unsaved changes state;
- empty workflow state;
- starter suggestions where useful.

Avoid an interface that simply looks like default React Flow.

Create custom node surfaces consistent with FlowDesk's design system.

Nodes should communicate type immediately.

For example:

```text
Trigger
Condition
Action
```

may have subtle semantic treatments while preserving a unified visual language.

Do not create a rainbow interface.

---

# 10. WORKFLOW VALIDATION

Before activation, validate at minimum:

- workflow contains a trigger;
- graph is structurally valid;
- required node configuration exists;
- unsupported nodes are rejected;
- required action fields exist;
- invalid references are rejected;
- inaccessible members/entities are rejected;
- cycles are handled safely.

Do not assume every graph is valid.

If V1 only supports directed acyclic execution, enforce that deliberately.

If limited cycles are intentionally supported later, design for future extensibility without enabling unsafe behavior now.

---

# 11. AUTOMATION ENGINE

The backend must contain a real workflow execution engine.

Do not fake workflow execution in the frontend.

Conceptual pipeline:

```text
Domain mutation
      ↓
Domain event
      ↓
Event persisted / dispatched safely
      ↓
Queue
      ↓
Workflow Engine
      ↓
Find active workflows
      ↓
Evaluate conditions
      ↓
Execute actions
      ↓
Persist execution state
      ↓
Activity / Notification
```

The engine must support:

- asynchronous execution;
- execution history;
- step execution state;
- retries;
- failure status;
- idempotency;
- traceability.

Use:

- Redis;
- BullMQ;

unless the existing codebase has an equivalent implementation worth preserving.

---

# 12. EVENT-DRIVEN ARCHITECTURE

FlowDesk should use domain events where they provide actual value.

Examples:

```text
client.created
project.created
task.created
task.completed
task.status_changed
project.status_changed
workflow.activated
workflow.execution_started
workflow.execution_completed
workflow.execution_failed
member.invited
member.joined
```

Use a robust architecture.

Prefer a **transactional outbox** or an equivalent reliable strategy when an event must not be lost between database persistence and queue publication.

Do not claim event-driven reliability while performing:

```text
save database
then maybe publish event
```

with no failure strategy.

A reasonable pattern is:

```text
Database transaction
├── business mutation
├── activity/audit record when appropriate
└── outbox event

Dispatcher
    ↓
BullMQ

Worker
    ↓
Workflow Engine
```

Do not over-engineer into Kafka, NATS, microservices or distributed infrastructure that the MVP does not need.

---

# 13. IDEMPOTENCY

Workflow execution must protect against accidental repeated processing.

Create deterministic idempotency strategies such as:

```text
eventId
workflowId
executionId
nodeId
action
```

where appropriate.

The same queued operation being retried must not unexpectedly create duplicate:

- projects;
- tasks;
- notifications;
- status transitions.

Design idempotency according to action semantics.

Do not simply retry everything blindly.

---

# 14. AUTOMATION LOOP PROTECTION

Prevent malicious or accidental infinite automation chains.

Examples:

```text
Workflow A changes status
→ status change triggers Workflow A
→ repeat forever
```

Design protections such as:

- execution depth;
- causal event metadata;
- origin workflow/execution;
- repeated event guard;
- loop detection;
- rate limits;
- maximum actions per execution;
- queue safety controls.

The exact implementation can be chosen based on architecture.

Protection against automation abuse is mandatory.

---

# 15. AUTOMATION EXECUTION LOGS

Persist execution information.

The user should eventually be able to understand:

```text
Workflow: New Client Onboarding

Execution
Started: 10:34:20
Trigger: Client Created
Status: Failed

Step 1 — Create Project
Success

Step 2 — Create Tasks
Success

Step 3 — Assign Member
Failed

Reason:
Selected member no longer belongs to workspace.
```

Store enough structured information to provide useful observability without persisting unnecessary sensitive data.

---

# 16. ACTIVITY SYSTEM

Relevant actions must generate operational history.

Examples:

```text
10:32 — Luis created Project Website
10:34 — FlowDesk created 5 tasks automatically
10:35 — Ana was assigned to Design
11:20 — Ana moved Design to In Progress
```

Track both:

- user actions;
- automation actions.

Activity entries should contain useful metadata such as:

- workspace;
- actor;
- actor type;
- entity;
- entity id;
- action;
- timestamp;
- relevant display metadata.

Avoid snapshots of excessive private data.

---

# 17. NOTIFICATION CENTER

Implement in-app notifications.

Examples:

```text
Ana mentioned you in a task.

Project Website is due tomorrow.

Workflow "New Client" executed successfully.

Automation "Onboarding" failed.
```

MVP requirements:

- notification list;
- unread state;
- mark as read;
- mark all as read if appropriate;
- relevant navigation target;
- timestamps;
- useful empty state.

Future channels:

- email;
- push;
- Slack;
- Teams;
- WhatsApp.

Do not implement those future integrations in the MVP.

Keep channel architecture extensible where useful.

---

# 18. DASHBOARD

The dashboard must answer:

> **What is happening in my operation right now?**

Useful information includes:

- active projects;
- pending tasks;
- overdue tasks;
- completed tasks;
- active clients;
- workload by member;
- workflows executed;
- failed automations;
- recent activity.

Do not turn the dashboard into a chart gallery.

Prefer actionable information.

Use charts only when visual aggregation materially improves comprehension.

---

# 19. MULTI-TENANCY — NON-NEGOTIABLE

FlowDesk is multi-tenant from the beginning.

Every workspace-owned resource must be isolated.

Typical resources include:

- clients;
- projects;
- tasks;
- comments;
- pipelines;
- workflow definitions;
- workflow executions;
- notifications where scoped;
- activities;
- invitations;
- templates owned by workspace;
- settings.

Never rely on frontend filtering.

Never trust a client-supplied `workspaceId` by itself.

Every backend operation must verify:

```text
Authenticated User
      ↓
Workspace Membership
      ↓
Permission / Role
      ↓
Requested Resource belongs to Workspace
      ↓
Operation
```

A user must never be able to access another workspace resource by guessing:

- UUID;
- route;
- query parameter;
- body field;
- foreign key.

IDOR protection must be treated as a first-class architectural requirement.

---

# 20. AUTHENTICATION & SESSION SECURITY

Implement secure authentication.

Requirements:

- Argon2 password hashing;
- short-lived access tokens;
- rotating refresh tokens;
- refresh token reuse protection where practical;
- revocable sessions;
- secure token storage strategy;
- no passwords in logs;
- no raw refresh tokens persisted;
- password reset tokens hashed at rest;
- expiration;
- secure cookies where architecture uses browser cookies;
- CSRF considerations according to cookie strategy;
- rate limiting.

Do not implement insecure auth shortcuts just to complete the UI.

---

# 21. AUTHORIZATION

Implement centralized authorization.

Avoid duplicated checks such as:

```ts
if (user.role === "owner")
```

spread throughout unrelated controllers.

Prefer:

- guards;
- policies;
- permission services;
- scoped repository/service methods.

Design for future granular permissions while keeping V1 roles simple.

---

# 22. INPUT SECURITY

Validate all external input.

Protect against:

- malformed data;
- invalid IDs;
- unexpected enum values;
- privilege escalation fields;
- foreign workspace references;
- HTML/script injection in displayed user content;
- excessive payload sizes;
- abuse;
- automation spam.

Sanitize where required.

Escape output appropriately.

Never accept mass assignment blindly.

---

# 23. DATABASE DESIGN

Use PostgreSQL.

Supabase PostgreSQL is an acceptable hosted production database.

Use Prisma unless the repository already contains a strong alternative that should be preserved.

The schema must reflect the actual domain rather than merely the UI.

Likely domain entities include, where justified:

```text
User
Session
PasswordResetToken

Workspace
Membership
WorkspaceInvitation

Client
Project
ProjectMember

Task
TaskAssignee
TaskComment

Pipeline
PipelineStage

Workflow
WorkflowVersion or equivalent
WorkflowNode or serialized typed graph
WorkflowExecution
WorkflowStepExecution

OutboxEvent

Notification

ActivityLog
```

You are not required to create a table for every visual concept.

Choose normalized tables versus validated JSON according to query patterns, lifecycle and complexity.

For workflow graph definitions, a validated serialized representation can be appropriate while execution data remains strongly modeled.

Every workspace-owned model must contain sufficient tenant scoping.

Create:

- indexes;
- unique constraints;
- foreign keys;
- cascade behavior;
- nullable relationships;

intentionally.

Do not use cascading deletes carelessly.

Prefer archival/soft-delete patterns where deletion would destroy operational history.

---

# 24. WORKFLOW DATA MODEL

A workflow should support concepts such as:

```text
id
workspaceId
name
description
status
version
triggerType
definition
createdBy
createdAt
updatedAt
activatedAt
```

The exact design may differ if a better normalized architecture is justified.

Workflow definitions must be:

- versionable or safely updateable;
- validated;
- immutable for an execution once execution starts.

An execution should reference the definition/version that actually ran.

Do not allow editing a workflow to retroactively change historical execution interpretation.

---

# 25. STACK

Use this as the preferred stack unless the existing repository already contains a compatible choice worth preserving.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand where global client state is truly necessary
- React Hook Form
- Zod
- React Flow
- dnd-kit
- Motion

## Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ

## AI

Future:

- Python
- FastAPI
- OpenAI API

### Important

Do **not** create a Python/FastAPI microservice in the MVP simply because it appears in the future architecture.

Python enters when there is a concrete AI processing benefit.

The core workflow engine must work completely without AI.

## Infrastructure

- Docker;
- PostgreSQL;
- Redis;
- GitHub Actions;
- Vercel and/or Render compatible deployment.

---

# 26. REPOSITORY ARCHITECTURE

First inspect the repository.

If an existing architecture is reasonable, preserve it.

If starting from an empty or effectively empty repository, prefer a clean TypeScript monorepo.

A reasonable default is:

```text
flowdesk/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── config/
│   └── shared/
│
├── docs/
├── docker/
├── .github/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Use Turborepo only if it materially improves the workspace.

Do not add tooling simply for architectural prestige.

`apps/web`

```text
Next.js application
```

`apps/api`

```text
NestJS API
background workers may share the same codebase but run as separate processes when appropriate
```

Avoid creating dozens of microservices.

---

# 27. BACKEND MODULES

A practical modular NestJS architecture may include:

```text
AuthModule
UsersModule

WorkspacesModule
MembershipsModule
InvitationsModule

ClientsModule
ProjectsModule
TasksModule

PipelinesModule

WorkflowsModule
AutomationModule
EventsModule
QueueModule

ActivitiesModule
NotificationsModule

DashboardModule

HealthModule
```

Create shared infrastructure only when repetition or cross-cutting concerns justify it.

---

# 28. API DESIGN

Prefer a clean REST API for the MVP.

Maintain consistent patterns for:

- pagination;
- filtering;
- sorting;
- search;
- success responses;
- errors;
- validation;
- authorization;
- optimistic concurrency where useful.

Possible route structure:

```text
/auth/*
/workspaces/*
/workspaces/:workspaceId/members/*
/workspaces/:workspaceId/clients/*
/workspaces/:workspaceId/projects/*
/workspaces/:workspaceId/tasks/*
/workspaces/:workspaceId/pipelines/*
/workspaces/:workspaceId/workflows/*
/workspaces/:workspaceId/activities/*
/workspaces/:workspaceId/notifications/*
/workspaces/:workspaceId/dashboard
```

Do not mechanically use this exact structure if an existing convention is better.

Consistency matters more than route aesthetics.

---

# 29. FRONTEND INFORMATION ARCHITECTURE

The application should provide a coherent product shell.

Potential authenticated navigation:

```text
Overview
Clients
Projects
Tasks
Board
Workflows
Activity
Notifications
```

Settings:

```text
Workspace
Members
Preferences
```

Do not overload the sidebar.

Use contextual navigation when appropriate.

---

# 30. PUBLIC EXPERIENCE

If no public product surface exists, create a restrained marketing page at `/`.

It should communicate:

> Organize work. Connect processes. Automate what is repetitive.

Explain:

- fragmented work;
- one operational workspace;
- visual workflows;
- automation;
- visibility;
- collaboration.

Primary CTA:

**Start workspace**

or equivalent.

Secondary CTA may lead to product explanation.

Do not spend disproportionate time building a giant marketing website while the actual application is incomplete.

The application is the priority.

---

# 31. PRODUCT VISUAL DIRECTION

FlowDesk must look like a **premium productivity SaaS**.

Conceptual reference territory:

- Linear;
- Raycast;
- Vercel;
- Notion;
- Stripe;
- Framer.

These are reference principles, not assets to copy.

Do not clone any product.

---

# 32. CREATIVE DIRECTION

## Central Creative Idea

> **Structured Flow**

FlowDesk transforms scattered operational work into visible, connected, controlled flows.

The interface should express:

- order;
- clarity;
- momentum;
- connection;
- control;
- precision.

---

## Emotional Response

Users should feel:

> "I can finally see how my operation works."

Then:

> "I can control this."

Then:

> "I can automate this."

---

## Brand Personality

FlowDesk should feel:

- precise;
- intelligent;
- calm;
- fast;
- technical;
- trustworthy;
- modern;
- sophisticated;
- operational.

Not:

- playful SaaS toy;
- cyberpunk dashboard;
- finance terminal;
- corporate ERP;
- futuristic AI gimmick;
- generic admin panel.

---

# 33. DESIGN LANGUAGE

Prioritize:

- strong typography;
- disciplined spacing;
- compact navigation;
- high information density;
- subtle borders;
- deliberate elevation;
- semantic color;
- excellent empty states;
- polished skeletons;
- subtle responsive animation;
- immediate feedback;
- clean hierarchy.

Avoid:

- excessive cards;
- card-inside-card layouts;
- gradient overload;
- blur everywhere;
- gratuitous glassmorphism;
- glowing purple borders;
- giant empty hero areas inside the app;
- decorative statistics;
- excessive rounded rectangles;
- random icon styles;
- unnecessary shadows.

Do not let shadcn's default appearance become the brand.

Use shadcn as infrastructure, not visual identity.

---

# 34. COLOR

Create a restrained neutral system supporting both:

- light mode;
- dark mode.

Use one primary accent family and semantic colors for:

- success;
- warning;
- danger;
- informational states.

Do not create a rainbow workflow system.

Ensure WCAG-appropriate contrast.

Use color to communicate meaning, not decoration.

---

# 35. TYPOGRAPHY

Use a professional UI-focused font strategy.

Prefer:

- excellent readability;
- compact UI metrics;
- strong headings;
- clear metadata;
- numeric alignment where relevant.

Avoid unnecessary font loading.

Prefer variable fonts if they improve bundle and rendering characteristics.

Define a predictable scale for:

- display;
- page titles;
- section titles;
- body;
- UI labels;
- metadata;
- table content;
- code/technical identifiers where appropriate.

---

# 36. SIGNATURE ELEMENT — FLOW LANGUAGE

The Workflow Builder itself is the main signature experience.

Develop a subtle visual motif around:

> **connected flow**

Potential expression:

- carefully designed connection lines;
- restrained animated execution pulses;
- selected node path highlighting;
- subtle traversal states during execution;
- clean directional affordances.

Do not turn this into glowing neon spaghetti.

The execution visualization should help users understand what happened.

It is functional visualization first and brand signature second.

---

# 37. 3D DECISION

**3D/WebGL is not justified for the core FlowDesk application.**

Do not add:

- Three.js background;
- floating spheres;
- 3D cubes;
- shader backgrounds;
- particles;
- WebGL dashboards;

unless a future concrete product requirement justifies them.

The graph-based workflow interface already provides sufficient spatial visual identity.

This is an intentional HYPER MASTER decision:

> Purpose before decoration.

---

# 38. MOTION LANGUAGE

Motion must communicate:

- state;
- cause;
- hierarchy;
- continuity;
- spatial relationship;
- success/failure;
- drag behavior.

Prefer:

- CSS;
- native browser APIs;
- Motion;

for normal interface motion.

Use animation libraries only when justified.

Typical interaction timing should feel quick and precise.

Do not make the app cinematic by slowing it down.

Examples:

- dropdown transitions;
- sidebar states;
- page section entrances;
- modal transitions;
- task movement;
- workflow node creation;
- node connection;
- success feedback;
- optimistic state updates;
- command palette.

Respect:

```css
prefers-reduced-motion
```

Essential behavior cannot depend on motion.

---

# 39. RESPONSIVE STRATEGY

Do not simply shrink the desktop interface.

Re-art-direct complex surfaces.

## Desktop

Allow:

- sidebar;
- dense tables;
- split views;
- inspector panels;
- wide workflow canvas.

## Tablet

Adapt:

- navigation;
- table density;
- inspector layout;
- Kanban viewport;
- workflow controls.

## Mobile

Prioritize:

- task actions;
- project updates;
- notifications;
- client lookup;
- operational overview.

Workflow editing on very small screens may use a simplified interaction model if necessary.

Do not force desktop graph editing into an unusable mobile viewport.

The user should still be able to inspect workflows and execution history.

---

# 40. COMMAND PALETTE

Implement a useful command palette if practical.

Possible actions:

```text
Create client
Create project
Create task
Open workflows
Search clients
Search projects
Switch workspace
Open settings
```

Keyboard-oriented productivity should be a differentiator for desktop users.

Do not build a command palette whose commands do nothing useful.

---

# 41. LOADING UX

Use deliberate loading states:

- skeletons;
- optimistic updates;
- progressive fetch;
- button pending states;
- mutation feedback;
- graph loading states.

Avoid excessive global spinners.

The app should feel responsive even when network work is occurring.

---

# 42. EMPTY STATES

Design meaningful empty states.

Examples:

No clients:

> Add your first client to start organizing work.

No workflows:

> Automate your first repetitive process.

No activity:

> Activity will appear here as your team works.

Empty states should teach the product without becoming marketing banners.

---

# 43. ERROR STATES

Create useful errors for:

- network failure;
- permission denied;
- invalid workflow;
- failed automation;
- expired invitation;
- missing entity;
- failed optimistic mutation;
- failed authentication;
- rate limit.

Avoid showing raw API errors to users.

Preserve technical details in logs.

---

# 44. REALTIME

Realtime behavior can materially improve:

- notifications;
- activity;
- workflow execution state.

However, do not compromise the MVP by building an unnecessary realtime architecture first.

Use a pragmatic option such as:

- server-sent events;
- WebSocket gateway;
- Supabase Realtime;

only if it cleanly fits the architecture.

Polling is acceptable for non-critical surfaces if it significantly reduces complexity.

Correctness comes before realtime spectacle.

---

# 45. FLOW AI — ARCHITECTURAL PREPARATION ONLY

Flow AI is an important future capability.

Future examples:

```text
"When a new client is created,
create an onboarding project,
generate the initial tasks,
assign the account manager,
and notify me."
```

Potential translation:

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

Future analysis:

```text
"The Proposal Sent stage
has significantly higher dwell time.

Suggestion:
create an automatic follow-up
after 3 days without movement."
```

However:

## DO NOT IMPLEMENT A FULL AI SYSTEM BEFORE THE WORKFLOW ENGINE WORKS.

The first architecture should make it possible for future AI to generate **validated workflow definitions**.

AI must never directly execute arbitrary actions without validation and explicit user approval.

Do not create FastAPI only for architectural appearance.

---

# 46. AI SECURITY PRINCIPLE

When AI is added later:

```text
Natural language
      ↓
Structured proposal
      ↓
Schema validation
      ↓
Permission validation
      ↓
User review
      ↓
Explicit activation
```

Never:

```text
Natural language
      ↓
arbitrary execution
```

Future workspace AI must respect the same tenant and RBAC restrictions as all other system components.

---

# 47. FEATURES EXPLICITLY OUTSIDE MVP

Do not implement these before the required MVP is complete:

- billing;
- SaaS payment plans;
- Slack integration;
- Gmail integration;
- WhatsApp integration;
- GitHub integration;
- external calendar integration;
- mobile native app;
- desktop native app;
- template marketplace;
- arbitrary code execution;
- dozens of node types;
- full AI Workspace Assistant;
- enterprise administration;
- advanced analytics suite;
- public developer platform.

Do not allow interesting future ideas to delay the core.

---

# 48. DEVELOPMENT QUALITY

Use:

- TypeScript strict mode;
- strong linting;
- predictable formatting;
- modular code;
- small focused components;
- composable hooks;
- consistent error handling;
- typed service contracts;
- runtime validation;
- database constraints;
- no `any` unless genuinely unavoidable and documented.

Do not build abstractions with no current consumer.

Avoid:

- god services;
- god components;
- duplicated authorization logic;
- duplicated query keys;
- duplicated API helpers;
- global state for server data;
- unnecessary context providers.

---

# 49. FRONTEND STATE STRATEGY

Use TanStack Query for server state.

Use Zustand only for true client-side cross-feature state such as:

- active transient UI state;
- workflow builder local editor state;
- command palette context;

when local component state is insufficient.

Do not mirror API data unnecessarily into Zustand.

Use URL state for filter/sort/search state where it improves navigation and shareability.

---

# 50. FORMS

Use:

- React Hook Form;
- Zod;

for robust frontend forms.

Provide:

- field errors;
- accessible labels;
- pending state;
- API error mapping;
- success feedback.

Avoid uncontrolled form behavior that produces inconsistent validation.

---

# 51. API CLIENT

Create a consistent frontend API layer.

Handle:

- auth;
- refresh;
- errors;
- query invalidation;
- workspace context;
- request cancellation when useful.

Do not scatter raw `fetch()` calls throughout UI components.

---

# 52. OPTIMISTIC UPDATES

Use optimistic updates where they materially improve UX.

Strong candidates:

- task status changes;
- Kanban moves;
- notification read state;
- simple edits.

Always implement rollback/error recovery.

Do not optimistically execute high-risk destructive actions.

---

# 53. WORKFLOW ENGINE INTERNAL DESIGN

Prefer explicit node handler contracts.

Conceptually:

```ts
interface WorkflowNodeHandler {
  type: WorkflowNodeType;
  validate(config, context): ValidationResult;
  execute(config, context): Promise<NodeExecutionResult>;
}
```

Possible handler categories:

```text
TriggerHandler
ConditionHandler
ActionHandler
```

Execution context should include only authorized and necessary data.

Avoid giant switch statements that become impossible to maintain.

A registry pattern may be appropriate.

Do not abstract beyond actual V1 node requirements.

---

# 54. CONDITION EVALUATION

Build a restricted condition system.

For example:

```text
operator:
EQUALS
NOT_EQUALS

field:
priority
status
assigneeId
```

The engine must validate field/operator compatibility.

Do not expose generic database query construction directly to users.

---

# 55. ACTION EXECUTION

Actions should call the same trusted domain services used by normal application operations where appropriate.

Do not duplicate business rules inside the workflow engine.

Example:

```text
Workflow action
    ↓
ProjectsService.create(...)
```

rather than directly bypassing validation and persistence rules.

Automation actions should run under a system actor while preserving:

- workspace;
- causal event;
- workflow execution;
- creator/configurator information where useful.

---

# 56. ACTOR MODEL

Activity and audit systems should distinguish:

```text
USER
AUTOMATION
SYSTEM
```

This allows:

> FlowDesk created 5 tasks automatically.

rather than pretending a user manually created them.

---

# 57. AUDIT LOG VS ACTIVITY FEED

Do not confuse these concepts.

## Activity Feed

User-facing operational history.

## Audit Log

Security/administrative trace where appropriate.

They may share infrastructure or data patterns, but their purpose differs.

Security-sensitive events may include:

- login;
- session revocation;
- role change;
- member removal;
- workspace settings;
- workflow activation;
- invitation.

---

# 58. OBSERVABILITY

Implement baseline observability.

Include:

- structured application logs;
- request correlation/request IDs;
- queue job IDs;
- workflow execution IDs;
- useful error context;
- health endpoint;
- readiness where appropriate.

Never log:

- passwords;
- raw auth tokens;
- sensitive secrets.

External observability platforms are optional and should not block MVP completion.

---

# 59. PERFORMANCE

Treat performance as part of the design.

Prioritize:

1. shell;
2. navigation;
3. current page content;
4. primary actions;
5. data;
6. secondary panels;
7. enhancement.

Use:

- route-level code splitting;
- dynamic import for heavy workflow editor when useful;
- lazy loading;
- efficient React Query caching;
- virtualized lists only when needed;
- efficient drag interactions;
- debounced search;
- pagination;
- indexed database queries.

The Workflow Builder should not inflate the initial bundle for users who are not using it if this can be avoided cleanly.

---

# 60. DATABASE PERFORMANCE

Add indexes based on actual query patterns.

Likely examples:

```text
workspaceId
workspaceId + status
workspaceId + createdAt
projectId
clientId
assignee/member relationships
workflowId + createdAt
workflow execution status
notification recipient + readAt
activity workspace + createdAt
outbox processing state
```

Do not blindly index every field.

Use pagination for potentially large feeds.

Prefer cursor pagination for activity/execution streams when suitable.

---

# 61. ACCESSIBILITY

Accessibility is mandatory.

Verify:

- semantic HTML;
- keyboard navigation;
- focus states;
- focus traps;
- form labels;
- error association;
- contrast;
- icon labels;
- screen reader names;
- touch targets;
- reduced motion.

Drag-and-drop must provide an accessible alternative where practical.

Workflow inspection must not depend solely on connector color.

---

# 62. SEO

Authenticated app pages do not need marketing-style indexing.

Public pages should implement:

- title;
- description;
- canonical where appropriate;
- Open Graph metadata;
- favicon;
- semantic headings;
- crawlability.

Prevent accidental indexing of authenticated/internal pages if required.

---

# 63. SECURITY TESTS

Security-sensitive behavior requires strong validation.

At minimum test:

### Tenant Isolation

User in Workspace A cannot read or mutate:

- Client B;
- Project B;
- Task B;
- Workflow B;
- Activity B;

from Workspace B.

Test guessed IDs explicitly.

### RBAC

Verify Viewer cannot mutate.

Verify Member cannot perform Owner/Admin-only operations.

Verify Admin cannot take Owner-only operations if your policy defines them.

### Invitations

Validate:

- expiration;
- workspace;
- invited identity;
- reuse prevention.

### Sessions

Validate:

- logout;
- refresh rotation;
- revoked token behavior.

### Automation

Validate:

- foreign-workspace references rejected;
- invalid actions rejected;
- idempotent retry;
- loop protection.

---

# 64. TEST STRATEGY

Test proportionally but seriously.

Use the testing ecosystem that fits the stack.

## Unit tests

High-value targets:

- authorization policies;
- workflow condition evaluator;
- workflow graph validator;
- action handlers;
- idempotency utilities;
- event mapping;
- loop protection;
- auth token behavior.

## Integration tests

Test:

- database behavior;
- tenant isolation;
- invitations;
- workspace membership;
- task/project/client relations;
- domain events;
- outbox;
- queue interaction where practical;
- workflow execution.

## E2E tests

Build at least one core product path such as:

```text
Register
↓
Create Workspace
↓
Create Client
↓
Create Project
↓
Create Task
↓
Create Workflow
↓
Activate Workflow
↓
Trigger Domain Event
↓
Automation Executes
↓
Activity Created
↓
Notification Created
```

Do not rely only on snapshots.

---

# 65. WORKFLOW ENGINE E2E

A critical acceptance flow:

Create workflow:

```text
Trigger:
Client Created

Action:
Create Project
```

Activate it.

Create a client.

Expected:

```text
client.created emitted
↓
event reaches automation system
↓
active workflow matched
↓
execution persisted
↓
project created
↓
activity created
↓
execution marked successful
```

Repeat/retry the job.

Expected:

> No duplicate project if the same execution is replayed under an idempotent retry.

Create another workspace.

Expected:

> Workflow must not execute against the other workspace.

---

# 66. KANBAN E2E

Test:

```text
Task in To Do
↓
User drags to In Progress
↓
UI updates optimistically
↓
API persists status
↓
activity generated
↓
status-change event generated
```

If request fails:

```text
UI rolls back
↓
error feedback appears
```

---

# 67. CI/CD

Create a practical GitHub Actions workflow if repository policy permits.

Useful checks:

```text
install
lint
typecheck
unit tests
integration tests where environment supports them
build
Prisma validation
```

Do not repeatedly run expensive global validation after every tiny change.

Run focused checks during development.

Run broader gates once the system stabilizes.

---

# 68. LOCAL DEVELOPMENT

Provide a straightforward development setup.

When useful, create Docker Compose for dependencies such as:

```text
PostgreSQL
Redis
```

Support external Supabase PostgreSQL through environment variables.

Create `.env.example`.

Never commit secrets.

Document required environment variables.

---

# 69. DATABASE MIGRATIONS

Use proper migrations.

Do not rely only on:

```text
prisma db push
```

for a production-oriented application.

Use migrations that can be reviewed and reproduced.

Seed data may be created for local development.

Do not create insecure default production credentials.

---

# 70. DEVELOPMENT SEED

A useful development seed may create:

- demo user;
- demo workspace;
- sample clients;
- sample projects;
- sample tasks;
- sample workflow;
- example activity;
- example notification.

Only for development.

Clearly separate seed/test data from production behavior.

---

# 71. DOCUMENTATION

This is a large project, so concise persistent documentation is justified.

Prefer only documents that remain operationally useful.

Create/update:

```text
README.md
AGENTS.md
docs/ARCHITECTURE.md
docs/SECURITY.md
```

Optionally add another document only if it materially improves future development.

Do not generate dozens of redundant Markdown files.

---

# 72. AGENTS.md

Create a concise `AGENTS.md` so future Codex sessions do not need to rediscover the architecture.

Include:

- project purpose;
- repository structure;
- stack;
- important commands;
- tenant security rule;
- authorization approach;
- workflow engine architecture;
- event/outbox/queue flow;
- testing expectations;
- important conventions.

Keep it factual and maintainable.

---

# 73. IMPLEMENTATION PHASES

Execute approximately in this order.

Do not stop between phases unless a genuine blocking dependency exists.

---

## PHASE 0 — Repository & Foundation

Inspect the repository.

Then as required:

- establish monorepo;
- package manager;
- TypeScript;
- lint;
- formatting;
- shared configuration;
- environment validation;
- Docker dependencies;
- CI baseline;
- database connection;
- Redis connection.

Validate boot.

---

## PHASE 1 — Identity, Authentication & Multi-Tenancy

Implement:

- User;
- registration;
- login;
- sessions;
- refresh rotation;
- logout;
- password recovery/reset foundation;
- Workspace;
- Membership;
- Invitation;
- RBAC;
- tenant guards/policies.

Before continuing, verify tenant isolation.

This foundation is critical.

---

## PHASE 2 — Operations Domain

Implement:

- Clients;
- Projects;
- Tasks;
- comments;
- relationships;
- archive behavior;
- validation;
- activity events.

Create corresponding UI.

---

## PHASE 3 — Operational Experience

Implement:

- application shell;
- sidebar;
- workspace switcher;
- command palette;
- dashboard;
- Kanban;
- notifications;
- activity feed;
- responsive behavior;
- light/dark mode;
- optimistic updates.

---

## PHASE 4 — Event Foundation

Implement:

- domain events;
- transactional reliability strategy;
- outbox if selected;
- event dispatcher;
- Redis;
- BullMQ;
- workers;
- request/event correlation.

Verify real event propagation.

---

## PHASE 5 — Workflow Builder

Implement:

- workflow persistence;
- workflow versions or immutable definitions;
- React Flow canvas;
- custom nodes;
- node configuration;
- graph validation;
- workflow activation/deactivation;
- workflow list;
- workflow details;
- execution navigation.

---

## PHASE 6 — Automation Engine

Implement:

- trigger matching;
- conditions;
- actions;
- execution context;
- step execution;
- execution persistence;
- retries;
- idempotency;
- loop protection;
- failure handling;
- logs.

Connect it to actual domain events.

---

## PHASE 7 — Workflow Observability

Implement UI for:

- executions;
- success/failure;
- start/end time;
- failed step;
- error reason;
- retry status where appropriate.

Make automation understandable to users.

---

## PHASE 8 — Security Hardening

Perform targeted security validation of:

- authentication;
- token rotation;
- invitations;
- IDOR;
- RBAC;
- tenant isolation;
- workflow configuration;
- automation execution;
- user-generated content;
- rate limits.

Fix discovered weaknesses.

---

## PHASE 9 — High-End Product Refinement

Audit the application as a premium software product.

Identify anything that feels:

- generic;
- templated;
- inconsistent;
- unfinished;
- overly spacious;
- clumsy;
- visually noisy;
- obviously default shadcn;
- obviously default React Flow;
- obviously AI-generated.

Refine without replacing the established design system.

---

## PHASE 10 — Final QA

Validate:

- desktop;
- laptop;
- tablet;
- mobile;
- intermediate widths;
- dark mode;
- light mode;
- keyboard;
- reduced motion;
- auth;
- workspace;
- clients;
- projects;
- tasks;
- Kanban;
- workflow editor;
- workflow execution;
- notifications;
- activity;
- dashboard;
- security;
- build;
- tests.

---

# 74. CREATIVE DIRECTION LOCK

Once you establish the FlowDesk design system, preserve it.

Do not change the app's visual identity every time a new module is added.

Every screen must feel part of the same product.

Normalize all imported component patterns into:

- FlowDesk typography;
- FlowDesk spacing;
- FlowDesk radius;
- FlowDesk border system;
- FlowDesk interaction patterns;
- FlowDesk motion;
- FlowDesk colors.

The user should not be able to identify:

> "This is the shadcn component."

or:

> "This is the default React Flow node."

---

# 75. REFERENCE SYSTEM

Relevant references may include:

## UI

- Uiverse
- React Bits
- Kokonut UI
- Bklit UI

## Motion

- Motion Sites
- Motion
- GSAP
- Anime.js

## Graph

- React Flow documentation and examples

Use reference material following:

```text
REFERENCE
↓
UNDERSTAND
↓
REINTERPRET
↓
INTEGRATE
↓
VALIDATE
```

Never:

```text
find cool component
↓
copy
↓
paste
↓
ship
```

Do not browse every reference source.

Use only what solves the current problem.

---

# 76. DEPENDENCY DISCIPLINE

Before installing a dependency:

1. existing project utility;
2. browser/platform native capability;
3. existing dependency;
4. small local implementation;
5. new dependency.

A component looking cool is not sufficient justification.

Evaluate:

- bundle impact;
- runtime;
- maintenance;
- compatibility;
- security;
- complexity.

---

# 77. PERFORMANCE CEILING

FlowDesk's identity must not require a high-end device.

The premium experience must remain intact on modest hardware.

May simplify:

- animation;
- shadows;
- blur;
- graph effects;
- transition complexity.

Must remain:

- hierarchy;
- typography;
- usability;
- workflow comprehension;
- navigation;
- forms;
- functionality;
- accessibility.

---

# 78. NO FRANKENSTEIN UI

Do not assemble:

```text
React Bits animation
+
random Uiverse button
+
default shadcn card
+
React Flow default nodes
+
unrelated gradient
```

into one product.

Every external idea must become visually native to FlowDesk.

---

# 79. NO GENERIC AI SAAS DESIGN

Explicitly avoid:

- huge gradient headlines everywhere;
- endless purple;
- glowing orbs;
- random bento grids;
- excessive pills;
- cards floating on gradient backgrounds;
- fake AI chat widgets;
- meaningless statistics;
- excessive blur;
- floating mockup windows;
- unnecessary particle fields.

FlowDesk should feel premium because its systems are coherent.

---

# 80. UX PRIORITY

Always optimize around:

```text
Understand
↓
Locate
↓
Act
↓
Receive feedback
↓
Continue
```

For automation:

```text
Understand trigger
↓
Define logic
↓
Configure action
↓
Validate
↓
Activate
↓
Observe execution
```

The Workflow Builder is not successful merely because users can draw nodes.

Users must understand what the workflow will do.

---

# 81. COPY

Use concise product language.

Avoid:

- vague SaaS jargon;
- corporate filler;
- excessive technical terminology in user-facing screens.

Technical architecture can be advanced.

The interface should remain understandable.

Example:

Bad:

> Configure deterministic asynchronous orchestration nodes.

Better:

> Add an action.

---

# 82. CRITICAL ACCEPTANCE CRITERIA

The MVP should not be considered complete unless the following behaviors work.

## Authentication

- user can register;
- user can sign in;
- user can sign out;
- session can refresh;
- revoked session stops working.

## Workspaces

- user can create workspace;
- user can invite another member;
- invitation can be accepted;
- role restrictions work.

## Tenant Security

- Workspace A user cannot access Workspace B resources even with known resource IDs.

## Clients

- client can be created/edited/archived;
- activity reflects meaningful changes.

## Projects

- project can connect to client;
- members can be assigned;
- project has status/priority/deadline.

## Tasks

- task lifecycle works;
- assignee works;
- status works;
- priority works;
- comments work.

## Kanban

- task moves between statuses;
- optimistic state works;
- failed request rolls back.

## Workflow Builder

- user can create graph;
- configure supported nodes;
- save;
- validate;
- activate.

## Automation

- real domain event triggers active workflow;
- conditions evaluate correctly;
- action executes;
- execution persists;
- retries work;
- idempotency prevents duplicate side effects.

## Notifications

- automation/user events can create useful notifications;
- read/unread works.

## Activity

- user actions and automation actions are distinguished.

## Dashboard

- dashboard reflects real workspace data.

---

# 83. MVP DEMONSTRATION SCENARIO

Seed or make it easy to demonstrate this complete scenario.

Workspace:

```text
ServAgency
```

Members:

```text
Owner
Designer
Developer
```

Client:

```text
Studio Nova
```

Workflow:

```text
When Client Created
      ↓
Create Project "Client Onboarding"
      ↓
Create Task "Schedule kickoff"
      ↓
Assign Member
      ↓
Send Notification
```

Demonstration:

```text
Create Studio Nova
↓
FlowDesk detects Client Created
↓
Workflow execution starts
↓
Project created
↓
Task created
↓
Member assigned
↓
Notification generated
↓
Activity timeline records automation
↓
Execution history shows successful steps
```

The product should make this scenario compelling.

---

# 84. PROJECT QUALITY BAR

The project should be impressive for two independent reasons.

## Product

Someone can genuinely understand and use it.

## Engineering

An experienced engineer inspecting the repository should find real implementations of:

- tenant isolation;
- RBAC;
- secure authentication;
- event processing;
- background jobs;
- idempotency;
- workflow execution;
- observability;
- tests;
- data modeling.

Do not fake backend depth with static frontend data.

---

# 85. PRODUCTION READINESS

Where environment permits:

- production build must pass;
- typecheck must pass;
- lint must pass;
- relevant tests must pass;
- migrations must be valid;
- app must boot;
- API health must work;
- frontend/API contract must work;
- no obvious console errors;
- no exposed secrets;
- no hardcoded production URLs;
- no cross-tenant access.

---

# 86. GIT WORKFLOW

If Git is initialized and repository permissions allow changes:

- create coherent commits;
- avoid unrelated modifications;
- use useful commit messages;
- preserve working history.

If a remote/PR workflow is available and appropriate:

- push relevant branch;
- create/update PR;
- inspect checks.

Do not claim something is merged or deployed unless it actually is.

Do not rewrite repository history unnecessarily.

---

# 87. TOKEN & CONTEXT EFFICIENCY

Although this is a large project, operate intelligently.

Objective:

> **Maximum correctness per token.**

Do not repeatedly scan the entire repository.

Use:

```text
requested feature
↓
likely files
↓
dependency chain
↓
implementation
↓
focused validation
```

Reuse:

- `AGENTS.md`;
- architecture docs;
- recently verified tests;
- known project conventions.

Do not re-audit unchanged modules every time.

---

# 88. VERIFICATION STRATEGY

During implementation:

```text
understand
↓
smallest useful check
↓
implement
↓
focused test
↓
iterate
```

After a stable phase:

```text
broader relevant gates once
```

Do not run every expensive test suite after every small CSS or component change.

Exception:

Security-critical changes deserve stronger validation.

---

# 89. HIGH-RISK AREAS

Never reduce validation merely to save time/tokens for:

- authentication;
- authorization;
- tenant isolation;
- invitations;
- refresh token handling;
- workflow execution;
- idempotency;
- migrations;
- destructive operations;
- secrets;
- production deployment.

Correctness is more important than token savings.

---

# 90. DECISION FILTERS

Before adding an abstraction:

> Is it required by more than one real use case?

Before adding an effect:

> Does it improve comprehension or interaction?

Before adding a library:

> Can the current stack solve this cleanly?

Before creating a service:

> Does this need an independent runtime boundary?

Before using AI:

> Does AI provide meaningful capability here?

Before implementing realtime:

> Is realtime necessary for this interaction?

Before adding another database table:

> Does this data have an independent lifecycle/query requirement?

Before adding another global state store:

> Is this truly client-global state?

Before continuing repository exploration:

> Will more context materially change the implementation?

Before stopping:

> Is the required FlowDesk MVP actually implemented, or did I merely finish one subsystem?

---

# 91. STAGE HANDOFFS

Internally preserve important decisions between phases.

A Stage Handoff should contain only durable facts such as:

```text
Architecture decision
Tenant model
Auth strategy
Event strategy
Design system
Workflow representation
Queue architecture
Testing baseline
```

Do not generate enormous repeated summaries after every stage.

---

# 92. FINAL HIGH-END AUDIT

Once functionality is stable, inspect the rendered product.

Find anything that feels:

- generic;
- cheap;
- unfinished;
- inconsistent;
- templated;
- excessively animated;
- visually noisy;
- confusing;
- slow;
- inaccessible.

Audit:

- typography;
- spacing;
- composition;
- sidebar;
- top bars;
- tables;
- forms;
- modals;
- empty states;
- loading;
- Kanban;
- Workflow Builder;
- notification center;
- dashboard;
- responsive behavior;
- dark mode;
- light mode.

Fix high-impact issues.

Do not merely produce an audit report.

Implement the improvements.

---

# 93. VISUAL VALIDATION

Where browser/preview tooling is available:

Inspect the actual rendered product at representative viewport widths.

Do not validate complex UI solely by reading source code.

Check:

- overflow;
- clipped text;
- mobile navigation;
- grid collapse;
- Kanban;
- workflow canvas;
- dialogs;
- dropdowns;
- forms;
- long content;
- loading;
- errors.

Fix issues you find.

---

# 94. FINAL PERFORMANCE AUDIT

Review:

- route bundles;
- React Flow loading;
- unnecessary client components;
- duplicated dependencies;
- expensive rerenders;
- image/font strategy;
- slow queries;
- N+1 queries;
- queue behavior;
- excessive polling;
- large API payloads.

Optimize high-impact issues.

Do not micro-optimize irrelevant code.

---

# 95. FINAL SECURITY AUDIT

Before declaring completion, deliberately attempt to break tenant isolation.

Think like an attacker.

Try conceptually and through automated tests where possible:

```text
User A accesses Workspace B resource ID
User A sends Workspace B foreign key
Viewer attempts mutation
Member attempts admin action
Revoked token refreshes
Expired invite reused
Workflow references foreign workspace member
Workflow action references foreign project
Duplicate queue job replays action
Automation loop creates repeated events
```

Fix failures.

---

# 96. FINAL LAUNCH CHECKLIST

Complete and verify as applicable:

- [ ] Repository structure coherent
- [ ] App runs locally
- [ ] Web builds
- [ ] API builds
- [ ] TypeScript passes
- [ ] Lint passes
- [ ] Database migrations valid
- [ ] PostgreSQL connectivity works
- [ ] Redis connectivity works
- [ ] Authentication works
- [ ] Argon2 used
- [ ] Refresh rotation works
- [ ] Session revocation works
- [ ] Password reset flow exists
- [ ] Workspace creation works
- [ ] Workspace switching architecture exists
- [ ] Invitations work
- [ ] RBAC works
- [ ] Tenant isolation tested
- [ ] Client CRUD works
- [ ] Project CRUD works
- [ ] Task lifecycle works
- [ ] Comments work
- [ ] Kanban works
- [ ] Optimistic update rollback works
- [ ] Activity works
- [ ] Notifications work
- [ ] Dashboard uses real data
- [ ] Domain events work
- [ ] Event reliability strategy works
- [ ] BullMQ workers work
- [ ] Workflow persistence works
- [ ] Workflow Builder works
- [ ] Workflow validation works
- [ ] Workflow activation works
- [ ] Trigger matching works
- [ ] Conditions work
- [ ] Actions work
- [ ] Executions persist
- [ ] Execution steps persist
- [ ] Retry behavior works
- [ ] Idempotency tested
- [ ] Loop protection exists
- [ ] Execution history UI works
- [ ] Dark mode works
- [ ] Light mode works
- [ ] Responsive layouts verified
- [ ] Keyboard navigation checked
- [ ] Reduced motion supported
- [ ] Accessible labels checked
- [ ] Empty states polished
- [ ] Loading states polished
- [ ] Error states polished
- [ ] Workflow Builder visually distinctive
- [ ] Default component-library appearance removed
- [ ] No unnecessary WebGL/3D
- [ ] Public metadata exists
- [ ] Environment variables documented
- [ ] Secrets absent from Git
- [ ] Docker development environment works where applicable
- [ ] CI exists
- [ ] Unit tests pass
- [ ] Integration tests pass where applicable
- [ ] Critical E2E passes
- [ ] Tenant security tests pass
- [ ] No obvious console errors
- [ ] No known P0 launch blockers
- [ ] README updated
- [ ] AGENTS.md updated
- [ ] Architecture documentation matches implementation
- [ ] Security documentation matches implementation

---

# 97. ISSUE PRIORITY

During final QA classify issues:

## P0 — BLOCKER

Security, corruption, broken auth, broken tenant isolation, broken workflow execution, application unable to run.

Fix before completion.

## P1 — HIGH

Major UX, accessibility, performance or core-feature failure.

Fix before completion when reasonably possible.

## P2 — REFINEMENT

Quality polish.

Fix high-value items.

## P3 — FUTURE

Valid improvements outside MVP.

Document concisely.

Do not implement future scope simply because you discovered it.

---

# 98. DEFINITION OF DONE

FlowDesk is not done because:

- screens exist;
- database tables exist;
- API routes exist;
- workflow nodes can be dragged;
- tests were written.

The MVP is done when a small team can realistically:

```text
Create workspace
↓
Invite team
↓
Create clients
↓
Manage projects
↓
Manage tasks
↓
Move work visually
↓
Create an automation
↓
Activate it
↓
Trigger it through real work
↓
Have FlowDesk execute actions
↓
Receive notifications
↓
Inspect what happened
```

while tenant isolation and authorization remain intact.

---

# 99. FINAL REPORT

Only after implementation and validation, return a concise final report.

Use:

# FlowDesk — Implementation Report

## Built

List major implemented capabilities.

## Architecture

Summarize only the important architecture that actually exists.

## Security

Summarize implemented protections and tenant isolation.

## Workflow Engine

Explain what actually works.

## Visual / UX

Summarize the product experience.

## Verified

List commands/tests/checks that actually passed.

Never claim a test passed if it was not run.

## Remaining

List only:

- genuine blockers;
- required external credentials;
- deliberate post-MVP work;
- meaningful risks.

## Run Locally

Provide exact commands.

## Git

If relevant:

```text
branch
commits
PR
merge
deployment
```

Only state facts.

---

# 100. EXECUTION BEHAVIOR

From this point onward:

### DO

- inspect;
- decide;
- build;
- test;
- inspect rendered UI;
- refine;
- fix;
- continue.

### DO NOT

- endlessly explain what you intend to do;
- stop after planning;
- stop after documentation;
- ask for information already available;
- rebuild functioning systems without cause;
- introduce architecture for prestige;
- implement future integrations before core MVP;
- fake functionality;
- use static mock data where backend functionality is required;
- weaken tenant security;
- claim completion without validation.

If you discover an implementation problem:

> Investigate it and solve it.

If you discover a design problem:

> Refine it.

If you discover a test failure:

> Debug it.

If you discover an architectural issue required for correctness:

> Fix it.

If a task is complete:

> Move to the next required MVP slice.

---

# FINAL OPERATING PHILOSOPHY

Optimize FlowDesk for:

> **Maximum operational clarity per screen.**

> **Maximum automation power without unnecessary complexity.**

> **Maximum security per tenant boundary.**

> **Maximum correctness per token.**

> **Maximum responsiveness per interaction.**

> **Maximum maintainability per abstraction.**

> **Maximum product identity without decorative excess.**

FlowDesk should feel sophisticated because:

- the information architecture is coherent;
- workflows are understandable;
- interactions are precise;
- automation is reliable;
- security is strong;
- visual hierarchy is deliberate;
- the engineering is serious.

Not because the interface contains expensive visual effects.

---

# ULTIMATE STANDARD

The final FlowDesk repository should look like a project where someone can inspect the frontend and think:

> "This is a polished productivity product."

Then inspect the backend and think:

> "This is actually a SaaS."

Then inspect the security model and think:

> "The tenant boundary was designed intentionally."

Then inspect the automation system and think:

> "This is a real workflow engine, not a frontend demo."

Then use the application and understand:

> **Organize the work. Connect the processes. Automate what is repetitive.**

Begin now.

Inspect the repository first.

Establish the current baseline.

Then execute the complete FlowDesk MVP.
