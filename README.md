# FlowDesk

FlowDesk is a workspace for organizing client work, projects, tasks, and reliable workflows.

## Local development

Use the exact versions pinned in `.node-version` (Node 24.19.0) and `package.json` (pnpm 11.19.0), then install the workspace dependencies:

```bash
pnpm install
pnpm dev
```

The web application runs from `apps/web`; the REST API runs from `apps/api` and exposes `GET /api/v1/health`. Root `dev` loads `.env` through the shared configuration package and uses `WEB_PORT` and `API_PORT` for the respective application ports.

## Local services

Start PostgreSQL and Redis for local development:

```bash
docker compose up -d
```

Copy `.env.example` to `.env` and adjust only non-secret local values as needed.

## Quality commands

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```
