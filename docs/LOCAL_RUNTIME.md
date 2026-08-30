# FlowDesk local runtime

This project can run locally while using managed free services for state:

- PostgreSQL: Aiven, Neon, Supabase, or any hosted Postgres compatible with Prisma
- Redis: Upstash Redis using the Redis/TLS connection string

Do not use the Upstash REST URL/token for `REDIS_URL`. BullMQ and ioredis need a Redis protocol URL, usually:

```text
rediss://default:<password>@<host>:6379
```

## First setup

```bash
corepack enable
pnpm install --no-frozen-lockfile
Copy-Item .env.example .env
```

Edit `.env` with real values:

```text
DATABASE_URL=postgres://...?...sslmode=require
REDIS_URL=rediss://default:...@...upstash.io:6379
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:3000
PASSWORD_RESET_BASE_URL=http://localhost:3000/reset-password
```

Then prepare the database:

```bash
pnpm db:deploy
pnpm db:seed
```

The seed account is controlled by `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` in `.env`.

## Development mode

Run everything in one terminal:

```bash
pnpm dev
```

Or run each process separately:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

Default URLs:

- Web: http://localhost:3000
- API health: http://localhost:3001/api/v1/health/ready

## Production-like local mode

Build once:

```bash
pnpm build
```

Then run API and worker in separate terminals:

```bash
pnpm start:api
pnpm start:worker
```

For cloud platforms, the API also respects the standard `PORT` environment variable.
