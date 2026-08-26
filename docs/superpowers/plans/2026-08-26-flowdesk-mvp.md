# FlowDesk MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-oriented multi-tenant operations SaaS with reliable visual workflow automation, verified locally and prepared for deployment from `main`.

**Architecture:** A pnpm TypeScript monorepo contains a Next.js web app, NestJS API and BullMQ worker process. Prisma/PostgreSQL provides durable tenant-scoped state and a transactional outbox; Redis provides queues; shared packages own contracts, validation, UI primitives and tool configuration.

**Tech Stack:** pnpm, TypeScript, Next.js, React, Tailwind CSS, TanStack Query, React Hook Form, Zod, React Flow, dnd-kit, NestJS, Prisma, PostgreSQL, Redis, BullMQ, Vitest, Playwright, Docker Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-26-flowdesk-mvp-design.md`

## Global Constraints

- All workspace-owned data is scoped and authorized on the server; never trust a client-supplied `workspaceId` alone.
- Passwords use Argon2id; refresh and reset tokens are hashed at rest; refresh rotation and revocation are mandatory.
- Workflow definitions are typed, validated, version-pinned for execution, idempotent, retryable and protected against loops.
- Production code follows test-driven development: establish the expected failing test before implementation.
- TypeScript strict mode is enabled and unchecked `any` is prohibited.
- The web experience supports light/dark modes, keyboard use, reduced motion, mobile layouts and optimistic rollback.
- Production deploys originate only from `main`; secrets are never committed.

---

### Task 1: Monorepo Foundation and Local Runtime

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.editorconfig`, `.env.example`, `compose.yaml`
- Create: `packages/config/*`, `packages/shared/src/index.ts`, `packages/shared/src/contracts/health.ts`
- Create: `apps/api/*`, `apps/web/*`
- Create: `.github/workflows/ci.yml`
- Test: `packages/shared/src/contracts/health.test.ts`, `apps/api/src/health/health.controller.spec.ts`, `apps/web/src/app/page.test.tsx`

**Interfaces:**
- Produces `HealthResponseSchema` and `HealthResponse` from `@flowdesk/shared`.
- Produces root scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, and `test:e2e`.

- [ ] **Step 1: Add failing shared contract test**

```ts
it('accepts the API health contract', () => {
  expect(HealthResponseSchema.parse({ status: 'ok', service: 'api' })).toEqual({ status: 'ok', service: 'api' });
});
```

- [ ] **Step 2: Run the test and verify module resolution fails**

Run: `pnpm --filter @flowdesk/shared test -- --run`
Expected: FAIL because `HealthResponseSchema` does not exist.

- [ ] **Step 3: Scaffold the workspace and minimal applications**

Implement the contract as `z.object({ status: z.literal('ok'), service: z.literal('api') })`, expose `/api/v1/health`, render a semantic FlowDesk landing shell, and configure PostgreSQL/Redis health-checked services in Compose. Pin Node and pnpm versions and commit the generated lockfile.

- [ ] **Step 4: Verify foundation gates**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "build: establish FlowDesk monorepo foundation"
```

### Task 2: Identity, Workspaces, RBAC, and Tenant Isolation

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`, `apps/api/prisma/seed.ts`
- Create: `apps/api/src/auth/*`, `apps/api/src/workspaces/*`, `apps/api/src/authorization/*`, `apps/api/src/common/*`
- Create: `packages/shared/src/contracts/auth.ts`, `packages/shared/src/contracts/workspaces.ts`
- Test: `apps/api/test/auth.integration-spec.ts`, `apps/api/test/tenant-isolation.integration-spec.ts`, `apps/api/src/authorization/policy.service.spec.ts`

**Interfaces:**
- Produces `RequestIdentity { userId: string; sessionId: string }`.
- Produces `WorkspaceAccess { workspaceId: string; membershipId: string; role: WorkspaceRole }`.
- Produces `PolicyService.assert(access, permission): void` and scoped Prisma helpers used by later domain services.

- [ ] **Step 1: Write failing integration tests**

```ts
it('revokes a token family when a rotated refresh token is reused', async () => {
  const first = await registerAndLogin();
  const rotated = await refresh(first.refreshCookie);
  await expectRefresh(first.refreshCookie).toHaveStatus(401);
  await expectRefresh(rotated.refreshCookie).toHaveStatus(401);
});

it('returns 404 when a member requests a known resource from another workspace', async () => {
  const foreignClient = await seedClientInWorkspaceB();
  await request(app).get(`/api/v1/workspaces/${workspaceA.id}/clients/${foreignClient.id}`)
    .set(authForWorkspaceA).expect(404);
});
```

- [ ] **Step 2: Run focused tests and verify the missing modules fail**

Run: `pnpm --filter @flowdesk/api test:integration -- auth.integration-spec.ts tenant-isolation.integration-spec.ts`
Expected: FAIL because authentication, schema and scoped resources are absent.

- [ ] **Step 3: Implement the identity and workspace vertical slice**

Add users, hashed passwords, sessions/token families, password resets, workspaces, memberships and invitations. Implement registration, login, logout, refresh rotation, session revocation, recovery/reset, workspace creation/switching, invitations, role changes, removal and leave rules. Use secure refresh cookies, rate limits, uniform auth errors and centralized permission policies.

- [ ] **Step 4: Prove security behavior**

Run: `pnpm --filter @flowdesk/api test:integration`
Expected: authentication, invitation, RBAC and tenant-isolation suites pass against disposable PostgreSQL.

- [ ] **Step 5: Commit**

```bash
git add apps/api packages/shared
git commit -m "feat(api): add secure multi-tenant identity foundation"
```

### Task 3: Operational Domain, Activity, Notifications, and Dashboard

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_operations/*`
- Create: `apps/api/src/clients/*`, `apps/api/src/projects/*`, `apps/api/src/tasks/*`, `apps/api/src/activity/*`, `apps/api/src/notifications/*`, `apps/api/src/dashboard/*`
- Create: `packages/shared/src/contracts/clients.ts`, `projects.ts`, `tasks.ts`, `notifications.ts`, `dashboard.ts`
- Test: `apps/api/test/operations.integration-spec.ts`, `apps/api/test/operations-tenant-security.integration-spec.ts`

**Interfaces:**
- Produces workspace-scoped `ClientsService`, `ProjectsService`, and `TasksService` methods for both HTTP handlers and automation actions.
- Produces domain event drafts inside the caller transaction and actor metadata for activity entries.

- [ ] **Step 1: Write failing lifecycle and authorization tests**

```ts
it('records a human activity when a task changes status', async () => {
  const task = await createTask();
  await changeStatus(task.id, 'IN_PROGRESS');
  expect(await latestActivity(task.id)).toMatchObject({ actorType: 'USER', action: 'task.status_changed' });
});

it('rejects an assignee from another workspace', async () => {
  await request(app).post(taskUrl).send({ assigneeId: foreignMembership.id }).set(ownerAuth).expect(422);
});
```

- [ ] **Step 2: Verify focused tests fail for missing domain behavior**

Run: `pnpm --filter @flowdesk/api test:integration -- operations.integration-spec.ts operations-tenant-security.integration-spec.ts`
Expected: FAIL on unavailable routes/services.

- [ ] **Step 3: Implement operations**

Add archive-safe CRUD, search/filter/pagination, project membership, task assignment/status/priority/due date/comments, activity logging, notification read state and real dashboard aggregates. Validate every referenced entity belongs to the active workspace and return consistent API errors.

- [ ] **Step 4: Verify operational and tenant suites**

Run: `pnpm --filter @flowdesk/api test:integration`
Expected: all API integration suites pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api packages/shared
git commit -m "feat(api): implement workspace operations domain"
```

### Task 4: Premium Web Application and Kanban

**Files:**
- Create: `packages/ui/src/*`
- Create: `apps/web/src/app/(auth)/*`, `apps/web/src/app/(workspace)/*`
- Create: `apps/web/src/features/auth/*`, `workspace/*`, `clients/*`, `projects/*`, `tasks/*`, `dashboard/*`, `notifications/*`, `kanban/*`
- Create: `apps/web/src/lib/api/*`, `apps/web/src/styles/*`
- Test: `apps/web/src/features/**/*.test.tsx`, `apps/web/e2e/operations.spec.ts`

**Interfaces:**
- Consumes shared API contracts and REST endpoints from Tasks 2–3.
- Produces `apiClient`, stable TanStack query keys, accessible form primitives and optimistic Kanban mutation with rollback.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('rolls a task back when a Kanban status mutation fails', async () => {
  render(<KanbanBoard initialTasks={[backlogTask]} updateStatus={rejectedUpdate} />);
  await moveTask('Briefing', 'In Progress');
  expect(await screen.findByText('Não foi possível mover a tarefa')).toBeVisible();
  expect(screen.getByTestId('column-backlog')).toHaveTextContent('Briefing');
});
```

- [ ] **Step 2: Verify the missing UI fails**

Run: `pnpm --filter @flowdesk/web test -- --run`
Expected: FAIL because application features and design primitives do not exist.

- [ ] **Step 3: Implement the product experience**

Build auth screens, app shell, sidebar, workspace switcher, command palette, dashboard, clients/projects/tasks views, task details/comments, notifications and responsive Kanban. Use a coherent FlowDesk token system, Portuguese product copy, dark/light themes, reduced motion, keyboard-visible focus, accessible labels, touch-safe controls and polished empty/loading/error states. Dynamically load heavy interaction surfaces and avoid sequential data waterfalls.

- [ ] **Step 4: Verify web behavior and production build**

Run: `pnpm --filter @flowdesk/web lint && pnpm --filter @flowdesk/web typecheck && pnpm --filter @flowdesk/web test -- --run && pnpm --filter @flowdesk/web build`
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web packages/ui packages/shared
git commit -m "feat(web): deliver FlowDesk operations experience"
```

### Task 5: Reliable Events, Workflow Builder, and Automation Engine

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/outbox/*`, `apps/api/src/workflows/*`, `apps/api/src/worker/*`
- Create: `packages/shared/src/contracts/workflows.ts`
- Create: `apps/web/src/features/workflows/*`, `apps/web/src/app/(workspace)/workflows/*`
- Test: `apps/api/src/workflows/**/*.spec.ts`, `apps/api/test/workflow-engine.e2e-spec.ts`, `apps/web/src/features/workflows/**/*.test.tsx`

**Interfaces:**
- Produces `WorkflowDefinitionSchema`, `WorkflowNodeHandler`, `WorkflowHandlerRegistry`, `WorkflowExecutionContext`, deterministic idempotency keys and BullMQ job contracts.
- Consumes trusted domain services from Task 3.

- [ ] **Step 1: Write failing validation and execution tests**

```ts
it('rejects a cyclic graph before activation', () => {
  expect(validateWorkflow(cyclicDefinition)).toEqual(expect.objectContaining({ valid: false, code: 'WORKFLOW_CYCLE' }));
});

it('does not duplicate a task when the same action job is retried', async () => {
  await executeAction(retriedJob);
  await executeAction(retriedJob);
  expect(await tasksCreatedByIdempotencyKey(retriedJob.key)).toHaveLength(1);
});
```

- [ ] **Step 2: Verify workflow tests fail for missing engine**

Run: `pnpm --filter @flowdesk/api test -- workflows`
Expected: FAIL because validation, handlers and execution do not exist.

- [ ] **Step 3: Implement reliable event flow and engine**

Persist business mutations and outbox events transactionally; dispatch with deterministic BullMQ job IDs. Add workflow/version/execution/step models, trigger matching, restricted conditions, action handlers, retry policy, idempotency records, causal metadata, maximum depth/actions and repeated-event protection. Persist safe structured logs and distinguish automation actors.

- [ ] **Step 4: Implement the visual builder and observability UI**

Build custom React Flow nodes, palette, canvas controls, inspector, graph validation, draft/activate/deactivate lifecycle, unsaved state, workflow list and execution detail. Load React Flow dynamically, isolate transient editor state and preserve keyboard/accessibility behavior.

- [ ] **Step 5: Verify the complete demonstration scenario**

Run: `pnpm --filter @flowdesk/api test:integration -- workflow-engine.e2e-spec.ts && pnpm --filter @flowdesk/web test -- --run`
Expected: creating Studio Nova triggers an active onboarding workflow exactly once, persists project/task/notification/activity/execution steps, and exposes the result to the web UI.

- [ ] **Step 6: Commit**

```bash
git add apps/api apps/web packages/shared
git commit -m "feat: add reliable visual workflow automation"
```

### Task 6: Hardening, Documentation, Browser QA, and Production Delivery

**Files:**
- Create: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `render.yaml`, `apps/web/vercel.json`
- Modify: `README.md`, `.github/workflows/ci.yml`, `.env.example`, `compose.yaml`
- Create: `apps/web/e2e/auth.spec.ts`, `tenant-security.spec.ts`, `workflow.spec.ts`, `responsive.spec.ts`

**Interfaces:**
- Consumes all prior product surfaces and verification commands.
- Produces reproducible local setup, deployment manifests and launch evidence.

- [ ] **Step 1: Add failing critical E2E and security cases**

Cover registration/session revocation, workspace invitation/RBAC, cross-tenant resource attempts, operational CRUD/Kanban rollback, full workflow demonstration, keyboard navigation, dark/light modes and mobile navigation.

- [ ] **Step 2: Run the critical suite and capture failures**

Run: `pnpm test:e2e`
Expected: any remaining product or environment gaps fail with actionable evidence.

- [ ] **Step 3: Fix P0/P1 findings and complete operational documentation**

Add only fixes demonstrated by failing checks. Write the premium README with product story, architecture, security model, screenshots, exact setup/seed/run/test commands, environment table, workflow walkthrough, deployment guide and troubleshooting. Keep architecture/security docs factual.

- [ ] **Step 4: Perform browser and visual verification**

Run the complete stack and inspect desktop, tablet and mobile widths in light/dark modes. Exercise authentication, workspace, operations, Kanban, notifications and workflow canvas. Record at least five concrete visual comparison points and fix overflow, typography, density, focus, reduced-motion or interaction failures.

- [ ] **Step 5: Run final gates**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e && pnpm build && git diff --check`
Expected: every command exits 0 with no test failures.

- [ ] **Step 6: Commit, push, merge, and deploy**

```bash
git add .
git commit -m "chore: harden and prepare FlowDesk production release"
git push -u origin codex/flowdesk-mvp
git switch main
git merge --no-ff codex/flowdesk-mvp
git push origin main
```

Confirm GitHub checks. Trigger/inspect Vercel and Render production deploys from `main`; if authentication is unavailable, report the precise external credential blocker without claiming deployment.
