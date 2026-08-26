# FlowDesk

FlowDesk is a workspace for organizing client work, projects, tasks, and reliable workflows.

## Local development

Use Node 24.19.0 and pnpm 11.19.0, then install the workspace dependencies:

```bash
pnpm install
pnpm dev
```

The web application runs from `apps/web`; the REST API runs from `apps/api` and exposes `GET /api/v1/health`.

## Local services

Start PostgreSQL and Redis for local development:

```bash
docker compose up -d
```

Copy `.env.example` to `.env` and adjust only non-secret local values as needed.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```
