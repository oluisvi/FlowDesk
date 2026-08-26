# Architecture

FlowDesk uses a pnpm TypeScript workspace. `apps/web` contains the Next.js interface and `apps/api` contains the NestJS REST API. Shared API contracts live in `packages/shared`; shared runtime configuration constants and environment loading live in `packages/config`.

The local runtime provisions PostgreSQL and Redis with `compose.yaml`, including readiness health checks. The current API prefix is `/api/v1`; the health route is `GET /api/v1/health` and returns `{ status: 'ok', service: 'api' }`.
