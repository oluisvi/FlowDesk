# FlowDesk

**Operational management + visual workflow automation for small teams.**

FlowDesk centralizes clients, projects, tasks, responsibilities, activity and notifications, then lets a team connect those records through reliable visual workflows. The MVP is a multi-tenant modular monolith: the product remains easy to run locally while the automation path is durable, asynchronous and observable.

> Organize o trabalho. Conecte os processos. Automatize o que é repetitivo.

## What is included

- Authentication with Argon2id, short-lived access JWTs, opaque rotating refresh tokens, session listing/revocation and password recovery/reset. Production recovery can deliver one-time reset links through a configured Resend account; local development exposes the token only to make the flow testable.
- Multi-workspace tenancy with Owner/Admin/Member/Viewer roles, invitation lifecycle and server-enforced authorization.
- Client, project and task operations with archive-safe lifecycle, search/filtering, project membership, assignment, tags, priorities, due dates and comments.
- Activity feed that distinguishes `USER`, `AUTOMATION` and `SYSTEM` actors, plus in-app notifications and actionable dashboard aggregates.
- Responsive Kanban with pointer/touch drag-and-drop, keyboard movement, optimistic updates and rollback on API failure.
- Visual Workflow Builder with custom FlowDesk Trigger/Condition/Action nodes, inspector, graph validation, draft/activate/deactivate lifecycle and immutable published versions.
- Transactional outbox + BullMQ/Redis worker, deterministic job IDs, idempotent action execution, retry policy, loop/depth protection and execution/step history.
- Light/dark themes, command palette, responsive mobile shell, reduced-motion support, polished loading/empty/error states and restrained high-density product styling.

## Architecture

```text
Next.js web app
      │ REST /api/v1
      ▼
NestJS API ───────► PostgreSQL / Prisma
      │                  │
      │ business tx      ├─ tenant data
      │                  ├─ activity + audit
      │                  ├─ workflow versions/executions
      │                  └─ transactional outbox
      │                           │
      └───────────────────────────┤ dispatcher
                                  ▼
                              Redis / BullMQ
                                  │
                                  ▼
                           FlowDesk worker
                                  │
                     validated workflow engine
                                  │
                    trusted tenant-scoped actions
```

The core invariant is always:

`authenticated user → workspace membership → permission policy → workspace-scoped resource → operation`

Knowing another tenant's UUID never grants access. Automated actions resolve their references inside the workflow workspace and use deterministic idempotency records for retry safety.

## Repository

```text
apps/
  api/       NestJS API + Prisma + BullMQ worker
  web/       Next.js product UI + Playwright journeys
packages/
  shared/    Zod contracts and shared types
  config/    environment/runtime configuration
  ui/        FlowDesk UI primitives
docs/
  ARCHITECTURE.md
  SECURITY.md
```

The original project brief and the execution systems used to define the product remain at the repository root:

- `FlowDesk — Discovery - Briefing Inicial.md`
- `FLOWDESK_HYPER_MASTER_CODEX_PROMPT.md`
- `HYPER_MASTER_v3.md`

## Local setup

Requirements: Node **24.19.0**, Corepack/pnpm **11.19.0**, Docker.

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1`
- Readiness: `http://localhost:3001/api/v1/health/ready`

The development seed creates the `ServAgency` workspace with Owner, Designer and Developer users, a `Studio Nova` client, a live project/task mix and the active `Client onboarding` workflow.

Default seed owner (development only):

```text
owner@flowdesk.local
ChangeMeNow123!
```

Change seed credentials through environment variables before using a shared environment.

## Quality gates

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm prisma:validate
pnpm build
pnpm test:e2e
```

`pnpm verify` runs the non-browser release gates in one command. Integration tests refuse non-local PostgreSQL hosts. Browser tests expect PostgreSQL + Redis and can start the app stack through Playwright's `webServer`.

## Demonstration scenario

1. Sign in with the seed owner and open `ServAgency`.
2. Inspect `Studio Nova`, `Brand launch` and the task board.
3. Move a task between states; the UI updates optimistically and the API persists activity + domain events.
4. Open **Workflows → Client onboarding** and inspect the Trigger → Action graph.
5. Configure/validate the workflow and activate it. A new immutable workflow version is created.
6. Create a client. `client.created` is stored in the same transaction as the business mutation.
7. The dispatcher publishes the outbox record to BullMQ with a deterministic job ID.
8. The worker matches active workflows and executes actions once, persisting each step and idempotency key.
9. Inspect the resulting notification, activity feed and workflow execution detail.

## API surface

Main groups under `/api/v1`:

- `/auth/*`
- `/workspaces/*`
- `/workspaces/:workspaceId/clients/*`
- `/workspaces/:workspaceId/projects/*`
- `/workspaces/:workspaceId/tasks/*`
- `/workspaces/:workspaceId/activity`
- `/workspaces/:workspaceId/notifications/*`
- `/workspaces/:workspaceId/dashboard`
- `/workspaces/:workspaceId/workflows/*`
- `/workspaces/:workspaceId/workflow-executions/*`

Validation errors use a normalized error envelope with correlation IDs. Production CORS is restricted by `CORS_ORIGIN`.

## Deployment

### Web — Vercel

`apps/web/vercel.json` builds the workspace-aware Next.js app. Keep browser API traffic same-origin so the strict, HTTP-only refresh cookie remains valid through the Next.js rewrite. Set:

- `NEXT_PUBLIC_API_URL=/api/v1`
- `FLOWDESK_API_ORIGIN=https://<api-host>`

Do **not** point `NEXT_PUBLIC_API_URL` directly at the Render API in production. The browser should call the Vercel origin at `/api/v1/*`; Next.js proxies that traffic server-side to `FLOWDESK_API_ORIGIN`.

### API + Worker — Render

`render.yaml` defines independent API and worker services. Provide managed PostgreSQL/Redis and configure:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET` (32+ chars, high entropy)
- `CORS_ORIGIN=https://<web-host>`
- `PASSWORD_RESET_BASE_URL=https://<web-host>/reset-password`
- `PASSWORD_RESET_FROM_EMAIL=FlowDesk <no-reply@your-domain>`
- `RESEND_API_KEY` for production password-recovery delivery

The API runs `prisma migrate deploy` before a production start. Never use `prisma db push` for release migrations. Configure the managed Redis instance with a `noeviction` max-memory policy for BullMQ reliability.

## Product constraints

Deliberately outside this MVP: billing, external Slack/Gmail/WhatsApp channels, marketplace, arbitrary user JavaScript, broad realtime collaboration, AI execution, mobile-native apps and microservice/Kafka infrastructure. The product proves the operations + workflow engine first.

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md) for the threat model, tenant boundary, token behavior, workflow safety and launch checklist.
