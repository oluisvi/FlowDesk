# Architecture

FlowDesk uses a pnpm TypeScript workspace. `apps/web` contains the Next.js interface and `apps/api` contains the NestJS REST API. Shared API contracts live in `packages/contracts`; shared runtime configuration constants live in `packages/config`.

The local runtime provisions PostgreSQL and Redis with `docker-compose.yml`. The current API prefix is `/api/v1`; the health route is `GET /api/v1/health`.
