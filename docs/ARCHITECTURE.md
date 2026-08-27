# FlowDesk Architecture

## System shape

FlowDesk is a **modular monolith** with three runtime processes and two infrastructure dependencies:

- `apps/web`: Next.js / React product interface.
- `apps/api`: NestJS REST API under `/api/v1`.
- `apps/api/src/worker/main.ts`: BullMQ workflow worker.
- PostgreSQL: durable multi-tenant operational state, workflow history and transactional outbox.
- Redis: BullMQ transport and retry coordination.

This shape deliberately avoids Kafka, NATS and microservices for the MVP. Domain boundaries are explicit in code while deployment remains understandable for a small team.

## Request boundary

Every authenticated workspace request follows:

```text
AccessGuard
  → RequestIdentity { userId, sessionId }
  → WorkspaceAccessService.resolve(user, workspace)
  → PolicyService.assert(permission)
  → workspace-scoped query/reference validation
  → operation
```

Foreign UUIDs are treated as unavailable. Referenced memberships, clients and projects are re-resolved against the active workspace before writes.

## Identity

Access tokens are short-lived JWTs. Refresh tokens are opaque random values stored only as SHA-256 hashes. A refresh rotates the token inside its family; reuse or a rotation race revokes the remaining family. Password reset tokens are hashed, expiring and single-use, and successful reset revokes sessions. Production recovery can deliver the one-time reset link through the configured Resend adapter without returning the raw token to the browser; local/test mode may expose the token only to keep recovery behavior testable.

## Operations domain

Clients, projects and tasks retain operational history through archival rather than destructive deletion. Tasks support status, priority, assignment, project context, due dates, tags and comments. User mutations write activity entries and, where relevant, an `OutboxEvent` in the same Prisma transaction.

## Event pipeline

```text
trusted domain mutation
  → PostgreSQL transaction
      ├─ business row(s)
      ├─ Activity
      └─ OutboxEvent
  → OutboxDispatcherService
  → BullMQ `flowdesk-events` (jobId = eventId)
  → worker
  → WorkflowEngineService
  → active workflow + immutable WorkflowVersion
  → WorkflowExecution / WorkflowStepExecution
  → trusted action handler
      ├─ tenant-scoped side effect
      ├─ Activity(actor=AUTOMATION)
      ├─ optional new OutboxEvent with causation/depth
      └─ IdempotencyRecord
```

`processedAt` on the outbox means “durably published to the queue”, not “workflow succeeded”. Workflow success/failure lives on execution records.

## Workflow definition

The shared Zod contract supports:

**Triggers**: Client Created, Project Created, Task Completed, Status Changed.

**Condition**: restricted field comparison with `EQ`, `NEQ`, `GTE`, `LTE`, `IN`.

**Actions**: Create Project, Create Task, Assign Member, Change Status, Send Notification.

Activation validates schema, topology, reachability, cycles and tenant-bound references. It then stores an immutable version and checksum. Executions always reference that immutable version.

## Idempotency and loop protection

- BullMQ uses the domain `eventId` as deterministic job ID.
- A workflow has a unique `(workflowId, triggerEventId)` execution.
- Action idempotency keys include workflow/execution/node context and persist the result.
- Automation-created events preserve causation and increment depth.
- The engine enforces `WORKFLOW_MAX_DEPTH`, `WORKFLOW_MAX_ACTIONS` and workflow-chain repetition guards.

## Web architecture

The UI uses Next.js App Router, TanStack Query, React Hook Form + Zod, `dnd-kit`, `@xyflow/react`, `motion`, `next-themes` and FlowDesk primitives from `packages/ui`.

The workflow editor is dynamically imported so React Flow does not burden ordinary operational routes. Kanban updates are optimistic and store a previous query snapshot for rollback.

The visual system follows “Structured Flow”: restrained neutral surfaces, one flow accent family, strong typographic hierarchy, compact rails, clear semantic status and functional motion. No WebGL/Three.js is required for product identity.

## Runtime health

- `GET /api/v1/health`: process liveness.
- `GET /api/v1/health/ready`: PostgreSQL + Redis readiness.

## Deployment

- Next.js → Vercel.
- NestJS API + BullMQ worker → Render (or equivalent Node runtime).
- PostgreSQL + Redis → managed services.
- Production migrations use `prisma migrate deploy`.
