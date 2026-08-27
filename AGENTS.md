# FlowDesk agent guide

## Product intent
FlowDesk is a multi-tenant B2B operations SaaS with visual workflow automation. Preserve the three pillars: organization, collaboration and automation. Do not turn it into a generic admin, CRM clone, project-management clone or AI demo.

## Source of truth
1. `FLOWDESK_HYPER_MASTER_CODEX_PROMPT.md`
2. `FlowDesk — Discovery - Briefing Inicial.md`
3. `docs/ARCHITECTURE.md` and `docs/SECURITY.md`
4. verified implementation/tests

Work by delta. Do not restart completed architecture without evidence.

## Invariants
- Every workspace-owned read/write is scoped and authorized on the server.
- Never trust `workspaceId`, resource IDs or membership IDs from the client without tenant-scoped resolution.
- Owner/Admin/Member/Viewer permissions live in `PolicyService`; avoid scattered role checks.
- Passwords use Argon2id. Refresh/reset tokens are opaque and stored only as hashes. Rotation/revocation must remain intact.
- Business mutations that can trigger workflows persist their outbox event in the same PostgreSQL transaction.
- Workflow definitions are typed, validated, cycle-free and version-pinned on activation.
- Automation may not use `eval`, arbitrary code or foreign-workspace references.
- Retries must be idempotent. Preserve deterministic job/action identifiers, causal metadata and loop/depth guards.
- Activity and audit logs are separate concepts. Never log secrets/tokens/passwords.

## Repository
- `apps/web`: Next.js app. Heavy workflow canvas stays dynamically loaded.
- `apps/api`: NestJS API and worker entrypoint.
- `packages/shared`: contracts and Zod schemas.
- `packages/ui`: reusable FlowDesk primitives.
- `packages/config`: environment loading/constants.

## UX direction
“Structured Flow”: calm, precise, dense, technical and premium. Neutral surfaces, restrained teal/blue accents, strong typography, compact navigation, subtle elevation and purposeful motion. Avoid card-inside-card layouts, purple AI glows, glassmorphism, decorative metrics and heavy 3D. Respect reduced motion and mobile re-articulation.

## State and performance
Use TanStack Query for server state, React/local state for interaction, and URL state where it materially improves navigation. Avoid sequential data waterfalls; parallelize independent work. Dynamically load heavy editor surfaces. Keep interactions responsive on modest hardware.

## Commands
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

Run focused tests while iterating, then proportional release gates. Security, auth, tenancy, migrations and automation require full validation.
