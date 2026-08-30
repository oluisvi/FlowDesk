# FlowDesk

**A multi-tenant operations workspace with visual workflow automation.**

FlowDesk is a B2B SaaS MVP for small teams that need one calm, structured place to manage clients, projects, tasks, collaboration, activity, notifications and repeatable operational flows.

It is not a generic admin panel, a CRM clone, or a pretty task board with fake automation. The core product bet is simple:

> Organize the work. Connect the process. Automate the repetitive parts without losing control.

## Why FlowDesk exists

Small teams usually run operations across chat threads, spreadsheets, task boards, calendar notes and someone's memory. That works until the handoffs become invisible.

FlowDesk makes the operation explicit:

- who owns what;
- which clients, projects and tasks are active;
- what changed recently;
- where work is blocked;
- which automations are active;
- what each workflow executed and why.

The MVP proves three pillars:

- **Organization**: clients, projects, tasks, comments, priorities, assignments and operational dashboard.
- **Collaboration**: multi-workspace membership, roles, invitations, notifications and activity.
- **Automation**: visual workflows that react to domain events and execute trusted server-side actions.

## Current Status

The MVP is implemented as a production-oriented local/cloud-ready application:

- Next.js product UI with responsive authenticated workspace experience.
- NestJS REST API under `/api/v1`.
- PostgreSQL persistence through Prisma migrations.
- Redis/BullMQ queue for asynchronous workflow execution.
- Worker process for durable automations.
- Tenant-scoped authorization and workflow action safety.
- Local runtime verified with managed PostgreSQL and Redis.

The project is currently easiest to run locally with managed free services for state, such as Aiven/Neon/Supabase for PostgreSQL and Upstash Redis for BullMQ.

## Product Highlights

- Secure authentication with Argon2id passwords.
- Short-lived access JWTs kept in browser memory only.
- Opaque refresh tokens stored as hashes, with rotation and reuse protection.
- Password recovery/reset with single-use hashed reset tokens.
- Multiple workspaces per user.
- Owner/Admin/Member/Viewer authorization model.
- Invitation lifecycle and member management.
- Clients, projects and tasks with search, filters, lifecycle states and archive-safe operations.
- Project members, task assignment, tags, priorities, due dates and comments.
- Activity feed that distinguishes user, system and automation actors.
- In-app notifications and dashboard aggregates.
- Responsive Kanban board with optimistic updates and rollback.
- Visual workflow builder with custom trigger, condition and action nodes.
- Workflow validation for schema, graph topology, cycles, reachability and tenant-bound references.
- Draft, activate, deactivate and immutable published workflow versions.
- Transactional outbox written in the same database transaction as business mutations.
- BullMQ worker using deterministic job IDs.
- Idempotent workflow actions with persisted execution history.
- Loop/depth/action guards for automation safety.
- Light/dark theme, command palette, polished loading/empty/error states and mobile re-articulation.

## Architecture

FlowDesk is a TypeScript monorepo and a modular monolith. The domain boundaries are explicit, but the MVP avoids premature microservices, Kafka, NATS or AI infrastructure.

```text
apps/web
  Next.js App Router UI
        |
        | REST /api/v1
        v
apps/api
  NestJS API
        |
        | Prisma
        v
PostgreSQL
  tenant data
  activity
  audit logs
  workflow definitions
  workflow versions
  workflow executions
  transactional outbox
        |
        | outbox dispatcher
        v
Redis / BullMQ
        |
        v
FlowDesk worker
  workflow matching
  validation-safe execution
  idempotent actions
```

The core request invariant is:

```text
authenticated user
  -> workspace membership
  -> PolicyService permission check
  -> workspace-scoped resource lookup
  -> operation
```

Knowing another tenant's UUID must never grant access. The server always re-resolves workspace-owned references inside the active workspace, including references used by automation actions.

## Repository Map

```text
apps/
  api/
    NestJS API, Prisma schema, migrations, seed and worker entrypoint
  web/
    Next.js app, authenticated UI, workflow canvas and Playwright journeys

packages/
  config/
    shared environment loading and runtime constants
  shared/
    Zod contracts and cross-app types
  ui/
    FlowDesk UI primitives

docs/
  ARCHITECTURE.md
  LOCAL_RUNTIME.md
  SECURITY.md
```

Important project documents:

- `FLOWDESK_HYPER_MASTER_CODEX_PROMPT.md`
- `FlowDesk — Discovery - Briefing Inicial.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/LOCAL_RUNTIME.md`

## Stack

- **Language**: TypeScript
- **Package manager**: pnpm
- **Web**: Next.js App Router, React, TanStack Query
- **Forms/validation**: React Hook Form, Zod
- **Workflow canvas**: React Flow
- **Drag and drop**: dnd-kit
- **API**: NestJS, Express adapter
- **Database**: PostgreSQL
- **ORM/migrations**: Prisma
- **Queue**: Redis + BullMQ
- **Auth**: Argon2id, JWT access tokens, opaque refresh/reset tokens
- **Testing**: Vitest, Supertest, Playwright
- **Styling**: custom CSS system aligned to the "Structured Flow" product direction

## Local Runtime

Requirements:

- Node.js `>=20.18 <25`
- pnpm `>=10 <12`
- PostgreSQL connection string
- Redis connection string

The fastest current setup is:

- Aiven, Neon or Supabase for PostgreSQL
- Upstash Redis using its Redis/TLS URL, not the REST API URL

Create `.env`:

```powershell
corepack enable
pnpm install --no-frozen-lockfile
Copy-Item .env.example .env
```

Edit `.env`:

```text
NODE_ENV=development
WEB_PORT=3000
API_PORT=3001
NEXT_PUBLIC_API_URL=/api/v1
FLOWDESK_API_ORIGIN=http://127.0.0.1:3001
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require
REDIS_URL=rediss://default:PASSWORD@HOST:6379
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
CORS_ORIGIN=http://localhost:3000
PASSWORD_RESET_BASE_URL=http://localhost:3000/reset-password
```

Prepare the database:

```bash
pnpm prisma:generate
pnpm db:deploy
pnpm db:seed
```

Run the full local app:

```bash
pnpm dev
```

Open:

- Web: `http://localhost:3000`
- API health: `http://localhost:3001/api/v1/health/ready`

Default seed owner for development:

```text
owner@flowdesk.local
ChangeMeNow123!
```

Change seed credentials before any shared or public environment.

For more detail, see [`docs/LOCAL_RUNTIME.md`](docs/LOCAL_RUNTIME.md).

## Useful Scripts

```bash
pnpm dev              # web + api + worker
pnpm dev:web          # Next.js only
pnpm dev:api          # NestJS API only
pnpm dev:worker       # BullMQ worker only
pnpm build            # build shared packages, API and web
pnpm start:api        # run built API
pnpm start:worker     # run built worker
pnpm db:deploy        # apply Prisma migrations
pnpm db:seed          # seed development/demo data
pnpm verify           # non-browser release gate
pnpm test:e2e         # Playwright journeys
```

## Quality Gates

Run focused checks while iterating, then run the broader release gates before merging or deploying:

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

Integration tests are intentionally defensive around database hosts. Do not point destructive or test-reset flows at a production database.

## Demo Flow

1. Sign in with the development seed owner.
2. Open the `ServAgency` workspace.
3. Review the dashboard, active clients, projects and tasks.
4. Move tasks through the Kanban board and watch activity update.
5. Open Workflows and inspect `Client onboarding`.
6. Validate and activate a workflow.
7. Create a client.
8. The API writes the business record and outbox event in the same transaction.
9. The dispatcher publishes the event to BullMQ.
10. The worker executes the active workflow version.
11. Inspect activity, notifications and workflow execution history.

That path is the heart of the MVP: a real domain mutation triggers a real asynchronous automation with durable execution records.

## API Surface

Main route groups under `/api/v1`:

```text
/auth/*
/workspaces/*
/workspaces/:workspaceId/clients/*
/workspaces/:workspaceId/projects/*
/workspaces/:workspaceId/tasks/*
/workspaces/:workspaceId/activity
/workspaces/:workspaceId/notifications/*
/workspaces/:workspaceId/dashboard
/workspaces/:workspaceId/workflows/*
/workspaces/:workspaceId/workflow-executions/*
```

Errors use a normalized response envelope with correlation IDs. Browser refresh is handled through strict HTTP-only cookies.

## Workflow Model

Supported trigger nodes:

- Client Created
- Project Created
- Task Completed
- Task Status Changed

Supported condition node:

- Restricted field comparison with safe operators

Supported action nodes:

- Create Project
- Create Task
- Assign Member
- Change Status
- Send Notification

Workflow definitions are declarative. There is no arbitrary JavaScript, no shell execution and no user-defined network request action in the MVP.

## Security Model

FlowDesk treats the workspace as the primary security boundary.

Key protections:

- Server-side tenant scoping on workspace-owned reads and writes.
- Centralized role checks in `PolicyService`.
- Foreign resource references re-resolved against the same workspace.
- Argon2id password hashing.
- Hashed refresh and reset tokens.
- Refresh token rotation and family revocation on reuse/race.
- Password reset revokes active sessions.
- Production CORS restricted by configured origins.
- HTTP-only refresh cookie scoped to auth routes.
- Automation actions use the same tenant boundary as user actions.
- Activity and audit logs are separate concepts.
- Secrets, tokens and passwords must never be logged or committed.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full model and production checklist.

## Deployment Notes

The project is cloud-ready but currently best operated locally until a stable free/paid runtime is selected.

Recommended future deployment shape:

- Web: Vercel
- API: Render, Northflank, Fly.io, Railway or equivalent Node runtime
- Worker: separate always-on background process when the platform supports it
- PostgreSQL: managed Postgres
- Redis: managed Redis with a BullMQ-compatible connection string

The API respects the standard `PORT` environment variable, so most Node hosting platforms can route traffic correctly.

For Vercel frontends:

```text
NEXT_PUBLIC_API_URL=/api/v1
FLOWDESK_API_ORIGIN=https://your-api-host.example.com
```

Keep browser requests same-origin through the Next.js rewrite when using strict cookies. Do not expose database URLs, Redis URLs, JWT secrets or provider tokens to the browser.

## Environment Reference

```text
NODE_ENV=development
WEB_PORT=3000
API_PORT=3001
PORT=
NEXT_PUBLIC_API_URL=/api/v1
FLOWDESK_API_ORIGIN=http://127.0.0.1:3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
WORKFLOW_MAX_DEPTH=5
WORKFLOW_MAX_ACTIONS=25
OUTBOX_POLL_INTERVAL_MS=1500
CORS_ORIGIN=http://localhost:3000
PASSWORD_RESET_BASE_URL=http://localhost:3000/reset-password
PASSWORD_RESET_FROM_EMAIL="FlowDesk <no-reply@example.com>"
RESEND_API_KEY=
SEED_OWNER_EMAIL=owner@flowdesk.local
SEED_OWNER_PASSWORD=ChangeMeNow123!
SEED_OWNER_NAME=FlowDesk Owner
```

For Upstash, `REDIS_URL` must be the Redis/TLS connection string:

```text
rediss://default:<password>@<host>:6379
```

Do not use `UPSTASH_REDIS_REST_URL` as `REDIS_URL`; BullMQ uses Redis protocol, not Upstash REST.

## MVP Boundaries

Deliberately outside this MVP:

- billing;
- marketplace;
- arbitrary workflow code execution;
- external Slack/Gmail/WhatsApp actions;
- AI-generated workflow execution;
- realtime multi-cursor collaboration;
- mobile native apps;
- microservice/Kafka/NATS infrastructure.

The MVP focuses on proving that operational records and visual workflows can live in the same tenant-safe product loop.

## Design Direction

FlowDesk follows the "Structured Flow" direction:

- calm, dense, premium SaaS surfaces;
- neutral UI with restrained teal/blue accents;
- compact navigation and strong typography;
- clear status semantics;
- purposeful motion;
- no purple AI glow, glassmorphism, decorative 3D or card-inside-card clutter.

The workflow builder is the product's most recognizable visual surface, but it stays functional first: users should understand what a workflow will do before they activate it.

## License

Private project. All rights reserved unless a license is added later.
