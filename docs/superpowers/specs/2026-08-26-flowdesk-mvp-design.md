# FlowDesk MVP — Design

## Objective

Build a production-oriented B2B SaaS MVP that lets small teams organize clients, projects, and tasks, then connect those entities through reliable visual workflow automation. The product must prove organization, collaboration, and automation while preserving strict tenant isolation.

## Delivery Strategy

The repository is effectively empty, so FlowDesk will be built as a TypeScript monorepo in five independently verifiable increments:

1. platform foundation, authentication, workspaces, RBAC, and tenant isolation;
2. clients, projects, tasks, comments, activity, and notifications;
3. application shell, dashboard, Kanban, responsive interaction, and product design system;
4. outbox, BullMQ workers, visual workflow builder, execution engine, idempotency, and observability;
5. security hardening, end-to-end validation, documentation, CI, production configuration, merge, and deployment from `main`.

Each increment uses test-driven implementation and receives a coherent Git commit series. Development happens on `codex/flowdesk-mvp`; production deployment is triggered only from `main` after final validation and merge.

## Architecture

Use a pnpm workspace with `apps/web` for Next.js and `apps/api` for NestJS. Shared contracts, validation schemas, UI primitives, and TypeScript/tooling configuration live in focused packages. The API and BullMQ workers share domain services but run as separate processes. PostgreSQL stores all durable state through Prisma; Redis carries queues and transient coordination.

The system remains a modular monolith. Domain boundaries are explicit, but no microservices or AI service are introduced in the MVP.

## Domain and Tenant Boundary

Every workspace-owned record carries a `workspaceId` or is reachable only through a workspace-scoped parent. Every request follows this server-side chain:

`authenticated user -> active membership -> permission policy -> workspace-scoped resource lookup -> operation`

Controllers never authorize by trusting a client-provided workspace ID. Domain services expose scoped methods, foreign references are checked against the same workspace, and automated actions use those same services. Owner, Admin, Member, and Viewer permissions are centralized in policies rather than scattered role comparisons.

Soft deletion preserves operational history for clients, projects, and tasks. Database constraints and indexes enforce invariants alongside runtime validation.

## Authentication and Sessions

Passwords use Argon2id. Short-lived access tokens are returned through the API; opaque refresh tokens use secure, HTTP-only cookies and are stored only as hashes. Rotation forms token families, reuse revokes the family, and sessions can be listed and revoked. Password-reset tokens are hashed, single-use, and expiring. Rate limiting protects registration, login, refresh, invitation, and password recovery routes.

## Operational Model

Workspaces contain memberships and invitations. Clients provide operational context; projects optionally belong to clients and have members; tasks optionally belong to projects and carry status, priority, due date, assignee, comments, and history. The initial task states are Backlog, To Do, In Progress, Review, and Done.

Activity entries distinguish human and automation actors. Notifications are workspace-scoped, support unread/read state, and carry safe internal navigation targets. Dashboard metrics are computed from real workspace data.

## Events and Automation

Business mutations and outbox records are committed in the same database transaction. A dispatcher publishes outbox events to BullMQ with deterministic job IDs. Workers locate active workflows matching the event, create an execution pinned to an immutable workflow version, and process the validated directed acyclic graph.

Supported triggers are client created, project created, task completed, and status changed. Conditions use a restricted typed operator set; no arbitrary code or `eval` is accepted. Actions create tasks/projects, assign members, change status, or create notifications through trusted domain services.

Each execution and step persists status, timing, safe input/output metadata, attempt count, and error information. Deterministic idempotency keys prevent duplicate side effects. Causal metadata, maximum depth, maximum actions, and repeated-event guards prevent automation loops.

## Web Experience

The web app uses Next.js, React, TypeScript, Tailwind, shadcn primitives normalized into a FlowDesk design system, TanStack Query for server state, React Hook Form and Zod for forms, dnd-kit for Kanban, and React Flow for the workflow canvas. Zustand is limited to transient editor state when local state is insufficient.

The visual language is dense, calm, and operational: neutral surfaces, disciplined teal/blue flow accents, strong typography, restrained motion, clear status semantics, and no generic gradient-heavy AI aesthetic. The application supports light/dark themes, reduced motion, keyboard navigation, touch behavior, useful loading/empty/error states, and responsive layouts.

Kanban moves are optimistic and roll back on API failure. Workflow nodes are custom FlowDesk surfaces with clear Trigger, Condition, and Action semantics, a configuration inspector, validation feedback, draft/active states, and execution navigation.

## API and Error Handling

REST endpoints are versioned under `/api/v1`. Requests and responses use shared Zod-compatible contracts where practical. The API emits a consistent error envelope with code, message, field errors when applicable, correlation ID, and safe metadata. Logs are structured and redact secrets, passwords, tokens, and sensitive content.

The frontend uses one API client responsible for credentials, refresh coordination, cancellation, normalized errors, workspace context, and query invalidation. Raw fetch calls do not appear throughout feature components.

## Testing and Verification

Vitest covers shared logic and frontend units; Nest testing and a real disposable PostgreSQL/Redis environment cover API integration; Playwright covers critical user journeys. Security tests deliberately exercise cross-workspace IDs, foreign-key injection, role escalation, expired/reused invitations, revoked refresh tokens, duplicate jobs, and workflow loops.

Required gates are formatting, lint, strict type checking, unit tests, integration tests, critical E2E, Prisma migration validation, production builds, and rendered-browser inspection at representative desktop, tablet, and mobile widths.

## Operations and Deployment

Docker Compose provides PostgreSQL and Redis locally. `.env.example` documents all variables without secrets. GitHub Actions runs quality and security gates. The web application is configured for Vercel; API and worker services are configured for Render, with managed PostgreSQL and Redis supplied through environment variables.

Production deploys originate only from `main`. If platform credentials are unavailable, deployment manifests and documentation remain complete, and the only reported blocker will be the external authentication/authorization needed to execute the deploy.

## Documentation

The repository will contain an operational, polished README plus concise `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md`. Documentation must describe only architecture and commands that actually exist and have been verified.

## Deliberate Exclusions

The MVP does not include a Python/AI service, arbitrary user code, external notification channels, broad realtime collaboration, Kafka/NATS, billing, or enterprise SSO. Interfaces may leave room for these capabilities without implementing speculative infrastructure.

## Definition of Done

A user can create and switch workspaces, invite a teammate, manage clients/projects/tasks, move tasks on a Kanban board, build and activate a valid workflow, trigger it through a real domain mutation, receive its notification, and inspect its execution and activity history. Server-side tenant isolation and authorization remain intact, retrying work does not duplicate side effects, all required quality gates pass, the branch is merged to `main`, and the production deployment is executed or blocked solely by explicitly identified external credentials.
