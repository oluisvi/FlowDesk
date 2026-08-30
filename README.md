# FlowDesk

**A multi-tenant operations workspace with visual workflow automation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis%20%2B%20BullMQ-Workflow%20Queue-dc382d?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)

FlowDesk is a B2B SaaS MVP for small teams that need one calm, structured place to manage clients, projects, tasks, collaboration, activity, notifications and repeatable operational flows.

It is not a generic admin panel, a CRM clone, or a pretty task board with fake automation. The core product bet is simple:

> Organize the work. Connect the process. Automate the repetitive parts without losing control.

## Quick Tour

| Start here | What you get |
| --- | --- |
| [Why FlowDesk exists](#why-flowdesk-exists) | Product intent in plain language. |
| [Experience Map](#experience-map) | Visual map of the core app surfaces. |
| [Architecture](#architecture) | How web, API, database, queue and worker fit together. |
| [Workflow Execution](#workflow-execution) | What happens when a domain event triggers automation. |
| [Local Runtime](#local-runtime) | How to run the full MVP locally. |
| [Demo Flow](#demo-flow) | The shortest path to understand the product end to end. |

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

```mermaid
mindmap
  root((FlowDesk))
    Organization
      Clients
      Projects
      Tasks
      Dashboard
    Collaboration
      Workspaces
      Roles
      Invitations
      Comments
      Notifications
    Automation
      Visual builder
      Domain events
      Queue
      Worker
      Execution history
```

## Experience Map

FlowDesk opens directly as a working product, not a landing page. The main surfaces are designed for repeated operational use: quick scanning, clear ownership and predictable navigation.

```mermaid
flowchart LR
  Login[Login / Register] --> Workspace[Workspace switch]
  Workspace --> Dashboard[Dashboard]
  Workspace --> Clients[Clients]
  Workspace --> Projects[Projects]
  Workspace --> Board[Kanban board]
  Workspace --> Workflows[Workflow builder]
  Workspace --> Activity[Activity feed]
  Workspace --> Settings[Settings]

  Clients --> Events[Domain events]
  Projects --> Events
  Board --> Events
  Workflows --> Published[Published versions]
  Events --> Automation[Automation engine]
  Automation --> Notifications[Notifications]
  Automation --> Activity
```

| Surface | Purpose | Why it matters |
| --- | --- | --- |
| Dashboard | Operational overview | Shows what needs attention before the user digs into lists. |
| Clients | Account context | Keeps client work connected to projects, tasks and workflows. |
| Projects | Delivery structure | Groups work without turning FlowDesk into a bloated PM clone. |
| Board | Daily execution | Gives teams a compact Kanban surface for real work. |
| Workflows | Automation design | Lets teams connect domain events to safe server-side actions. |
| Activity | Shared memory | Makes user and automation changes visible. |
| Settings | Workspace control | Handles members, invitations, sessions and account operations. |

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

| Area | Status | Notes |
| --- | --- | --- |
| Product UI | Ready | Authenticated workspace UI, dashboard, operations, board and workflows. |
| API | Ready | REST API with auth, RBAC, tenant scoping and normalized errors. |
| Database | Ready | Prisma migrations applied against PostgreSQL. |
| Worker | Ready | BullMQ worker executes durable workflow actions. |
| Local runtime | Ready | Verified with managed PostgreSQL and Redis. |
| Free cloud runtime | Deferred | Some free hosts require billing setup or suspend long-running services. |

## How To Read This Repo

```mermaid
flowchart TD
  README[README.md] --> Local[docs/LOCAL_RUNTIME.md]
  README --> Architecture[docs/ARCHITECTURE.md]
  README --> Security[docs/SECURITY.md]
  Architecture --> API[apps/api]
  Architecture --> Web[apps/web]
  Architecture --> Packages[packages]
  Local --> Env[.env.example]
  Security --> Policies[PolicyService + scoped services]
```

| If you want to... | Open first |
| --- | --- |
| Run the app | `docs/LOCAL_RUNTIME.md` |
| Understand the system shape | `docs/ARCHITECTURE.md` |
| Review tenant/auth protections | `docs/SECURITY.md` |
| Inspect API/domain behavior | `apps/api/src` |
| Inspect the product UI | `apps/web/src/features` |
| Inspect shared contracts | `packages/shared/src/contracts` |

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

```mermaid
flowchart TB
  subgraph Browser["Browser"]
    Web["Next.js app<br/>apps/web"]
  end

  subgraph Server["Node runtime"]
    API["NestJS REST API<br/>apps/api"]
    Dispatcher["Outbox dispatcher"]
    Worker["BullMQ worker<br/>apps/api/src/worker"]
  end

  subgraph Data["Managed state"]
    DB[("PostgreSQL<br/>Prisma schema + migrations")]
    Redis[("Redis<br/>BullMQ queue")]
  end

  Web -->|same-origin /api/v1| API
  API -->|tenant-scoped reads/writes| DB
  API -->|business transaction writes| DB
  DB -->|pending outbox events| Dispatcher
  Dispatcher -->|deterministic jobId = eventId| Redis
  Redis -->|domain-event jobs| Worker
  Worker -->|workflow execution + actions| DB
  Worker -->|automation side effects| API
```

The core request invariant is:

```mermaid
flowchart LR
  User[Authenticated user] --> Guard[AccessGuard]
  Guard --> Identity[RequestIdentity]
  Identity --> Membership[Workspace membership]
  Membership --> Policy[PolicyService]
  Policy --> Scoped[Workspace-scoped lookup]
  Scoped --> Operation[Allowed operation]

  Rogue[Foreign UUID] -.-> Scoped
  Scoped -. rejects .-> Rogue
```

Knowing another tenant's UUID must never grant access. The server always re-resolves workspace-owned references inside the active workspace, including references used by automation actions.

## Workflow Execution

The automation path is durable on purpose. A user action first commits the business change and an outbox record in PostgreSQL. Only then does FlowDesk publish a queue job and let the worker execute the matching workflow version.

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Web as Next.js Web
  participant API as NestJS API
  participant DB as PostgreSQL
  participant Queue as Redis / BullMQ
  participant Worker as FlowDesk Worker

  User->>Web: Create client / move task / update project
  Web->>API: REST request with auth
  API->>DB: Transaction: business row + activity + outbox event
  DB-->>API: Commit
  API-->>Web: Response
  API->>DB: Dispatcher reads pending outbox
  API->>Queue: Publish job with deterministic eventId
  Queue->>Worker: Deliver domain-event job
  Worker->>DB: Load active workflows + immutable version
  Worker->>DB: Persist execution and step history
  Worker->>DB: Run trusted tenant-scoped action
  Worker-->>Web: Activity / notification visible on refresh
```

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Active: validate + activate
  Active --> Active: publish new immutable version
  Active --> Inactive: deactivate
  Inactive --> Active: validate + activate
  Active --> Executing: domain event matched
  Executing --> Succeeded: all actions completed
  Executing --> Failed: guarded error / retry exhausted
  Succeeded --> [*]
  Failed --> [*]
```

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

| Layer | Technology | Role |
| --- | --- | --- |
| Language | TypeScript | Shared language across web, API, worker and packages. |
| Web | Next.js App Router, React | Authenticated product interface. |
| Server state | TanStack Query | Cache, refetching and optimistic UI flows. |
| Forms/contracts | React Hook Form, Zod | Typed validation at UI and shared-contract boundaries. |
| Workflow canvas | React Flow | Visual automation builder. |
| Drag and drop | dnd-kit | Kanban movement and responsive interactions. |
| API | NestJS | REST API, auth, policy checks and domain services. |
| Database | PostgreSQL | Durable tenant data and workflow history. |
| ORM | Prisma | Schema, generated client and migrations. |
| Queue | Redis + BullMQ | Asynchronous event delivery and retries. |
| Auth | Argon2id, JWT, opaque tokens | Password, access, refresh and reset-token safety. |
| Tests | Vitest, Supertest, Playwright | Unit, integration and browser journey coverage. |
| Styling | Custom CSS system | Dense, calm, premium "Structured Flow" UI. |

```mermaid
quadrantChart
  title FlowDesk MVP Balance
  x-axis "Prototype" --> "Production-oriented"
  y-axis "Generic admin" --> "Product-specific"
  quadrant-1 "Strong MVP zone"
  quadrant-2 "Polished but shallow"
  quadrant-3 "Throwaway demo"
  quadrant-4 "Heavy platform"
  "Tenant security": [0.82, 0.76]
  "Workflow engine": [0.78, 0.86]
  "Local runtime": [0.74, 0.58]
  "Visual builder": [0.68, 0.88]
  "External integrations": [0.24, 0.38]
```

## Local Runtime

Requirements:

- Node.js `>=20.18 <25`
- pnpm `>=10 <12`
- PostgreSQL connection string
- Redis connection string

The fastest current setup is:

- Aiven, Neon or Supabase for PostgreSQL
- Upstash Redis using its Redis/TLS URL, not the REST API URL

```mermaid
flowchart LR
  Clone[Clone repo] --> Install[pnpm install]
  Install --> Env[Create .env]
  Env --> DB[Configure PostgreSQL]
  Env --> Redis[Configure Redis]
  DB --> Migrate[pnpm db:deploy]
  Redis --> Migrate
  Migrate --> Seed[pnpm db:seed]
  Seed --> Dev[pnpm dev]
  Dev --> Web[Open localhost:3000]
```

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

### Open FlowDesk on a phone over Wi‑Fi

The web dev server listens on the local network by default. Start the stack on your PC, find its LAN IPv4 address (for example with `ipconfig` on Windows), then open this on a phone connected to the same Wi‑Fi:

```text
http://<IP-DO-PC>:3000
```

If Windows Firewall asks for permission, allow Node.js on **Private networks**. The API remains proxied through the web app, so the phone does not need a separate API URL. Set `WEB_HOST=127.0.0.1` if you want to restrict the web server to the current machine.

Default seed owner for development:

```text
owner@flowdesk.local
ChangeMeNow123!
```

Change seed credentials before any shared or public environment.

For more detail, see [`docs/LOCAL_RUNTIME.md`](docs/LOCAL_RUNTIME.md).

## Useful Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts web, API and worker together. |
| `pnpm dev:web` | Starts only the Next.js app. |
| `pnpm dev:api` | Starts only the NestJS API watcher. |
| `pnpm dev:worker` | Starts only the BullMQ worker watcher. |
| `pnpm build` | Builds shared packages, API and web. |
| `pnpm start:api` | Runs the built API. |
| `pnpm start:worker` | Runs the built worker. |
| `pnpm db:deploy` | Applies Prisma migrations. |
| `pnpm db:seed` | Creates development/demo data. |
| `pnpm verify` | Runs the non-browser release gate. |
| `pnpm test:e2e` | Runs Playwright browser journeys. |

## Quality Gates

Run focused checks while iterating, then run the broader release gates before merging or deploying:

```mermaid
flowchart LR
  Format[pnpm format] --> Lint[pnpm lint]
  Lint --> Types[pnpm typecheck]
  Types --> Unit[pnpm test]
  Unit --> Integration[pnpm test:integration]
  Integration --> Prisma[pnpm prisma:validate]
  Prisma --> Build[pnpm build]
  Build --> Browser[pnpm test:e2e]
```

| Gate | Purpose |
| --- | --- |
| `pnpm format` | Source formatting hygiene. |
| `pnpm lint` | Static code rules. |
| `pnpm typecheck` | TypeScript contract safety. |
| `pnpm test` | Unit-level behavior. |
| `pnpm test:integration` | API, database, auth, tenant and workflow behavior. |
| `pnpm prisma:validate` | Prisma schema validity. |
| `pnpm build` | Production build confidence. |
| `pnpm test:e2e` | Browser journeys through the real product UI. |

Integration tests are intentionally defensive around database hosts. Do not point destructive or test-reset flows at a production database.

## Demo Flow

```mermaid
journey
  title FlowDesk MVP Demo Path
  section Enter workspace
    Sign in as seed owner: 5: User
    Open ServAgency: 5: User
    Review dashboard: 4: User
  section Work manually
    Inspect clients and projects: 4: User
    Move task on Kanban: 5: User
    See activity update: 5: User
  section Automate
    Open Client onboarding workflow: 5: User
    Validate and activate: 4: User
    Create a client: 5: User
  section Verify automation
    Worker executes workflow: 5: Worker
    Notification appears: 5: User
    Execution history is inspectable: 5: User
```

| Step | User action | System response |
| --- | --- | --- |
| 1 | Sign in with the development seed owner. | FlowDesk creates an authenticated session. |
| 2 | Open the `ServAgency` workspace. | The API resolves membership and permissions. |
| 3 | Review dashboard, clients, projects and tasks. | Tenant-scoped data loads into the workspace shell. |
| 4 | Move a task through the Kanban board. | The UI updates optimistically and the API persists activity. |
| 5 | Open `Client onboarding`. | The visual workflow builder loads on demand. |
| 6 | Validate and activate the workflow. | FlowDesk stores an immutable published version. |
| 7 | Create a client. | The API writes the client and outbox event in one transaction. |
| 8 | Wait for automation. | The dispatcher publishes a BullMQ job and the worker executes actions. |
| 9 | Inspect notifications and execution history. | The automation is visible and auditable. |

That path is the heart of the MVP: a real domain mutation triggers a real asynchronous automation with durable execution records.

## API Surface

Main route groups under `/api/v1`:

| Route group | Area |
| --- | --- |
| `/auth/*` | Login, register, refresh, logout, sessions and password recovery. |
| `/workspaces/*` | Workspace creation, switching, invitations and members. |
| `/workspaces/:workspaceId/clients/*` | Client records. |
| `/workspaces/:workspaceId/projects/*` | Project records and project membership. |
| `/workspaces/:workspaceId/tasks/*` | Tasks, assignment, status changes and comments. |
| `/workspaces/:workspaceId/activity` | User-facing operational timeline. |
| `/workspaces/:workspaceId/notifications/*` | In-app notifications. |
| `/workspaces/:workspaceId/dashboard` | Aggregated workspace overview. |
| `/workspaces/:workspaceId/workflows/*` | Workflow list, draft editing, validation and activation. |
| `/workspaces/:workspaceId/workflow-executions/*` | Execution list and execution detail. |

Errors use a normalized response envelope with correlation IDs. Browser refresh is handled through strict HTTP-only cookies.

## Workflow Model

```mermaid
flowchart LR
  Trigger["Trigger<br/>domain event"] --> Condition{"Condition<br/>optional"}
  Condition -->|true| ActionA["Action<br/>create/update/notify"]
  Condition -->|false| Skip["Skip branch"]
  ActionA --> ActionB["Next action"]
  ActionB --> History["Execution history"]
```

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

```mermaid
flowchart TB
  subgraph WorkspaceA["Workspace A"]
    AUser[Member]
    AClient[Client A]
    ATask[Task A]
    AWorkflow[Workflow A]
  end

  subgraph WorkspaceB["Workspace B"]
    BClient[Client B]
    BTask[Task B]
  end

  AUser --> Policy[PolicyService]
  Policy --> AClient
  Policy --> ATask
  Policy --> AWorkflow
  Policy -. rejects foreign IDs .-> BClient
  Policy -. rejects foreign IDs .-> BTask
```

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

## Visual QA (local workspace)

The frontend was validated in the embedded local browser at `http://localhost:3000/` using an authenticated workspace session.

- Audited workspace tabs: Overview, Clients, Projects, Tasks, Board, Workflows, Activity, Notifications and Settings.
- Responsive breakpoints checked: 1440px, 1280px, 1024px, 768px, 390px and 320px.
- No horizontal overflow was detected in any audited workspace tab.
- Mobile navigation was checked with the drawer open, backdrop active and body scroll locked.
- Empty, loading, disabled-action and form states were checked where the current workspace data exposed them.
- Workflow editor and execution detail routes require an existing workflow/execution record; the QA workspace currently has no records to open for those detail states.
- Public auth screens (landing, login, registration and password recovery) were inspected separately; authenticated navigation was performed through visible in-app links to preserve the local session.

## License

Private project. All rights reserved unless a license is added later.
