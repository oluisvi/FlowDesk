# FlowDesk Security Model

## Tenant isolation

The primary security boundary is the workspace. A valid authenticated user is not enough to access a resource: the API resolves membership, permission and resource ownership server-side. Client filtering is never an authorization control.

Critical rules:

- scope every workspace resource query by `workspaceId`;
- resolve foreign-key references against the same workspace before writes;
- return unavailable/not-found semantics for foreign resources where practical;
- apply the same boundary to automation actions;
- never accept a workflow node reference solely because it is a valid UUID.

## Authentication

- Password hashing: Argon2id.
- Access JWT: short lifetime (`ACCESS_TOKEN_TTL_SECONDS`, default 900s) and kept in browser memory only; reloads renew through the HTTP-only refresh cookie.
- Refresh token: opaque random secret in an HTTP-only cookie; only its hash is stored.
- Rotation: old session is revoked and the next session remains in the same family.
- Reuse/race detection: remaining active sessions in that family are revoked.
- Session inventory/revocation is user-scoped.
- Password reset token: hashed, expiring, single-use; success revokes active sessions.
- Production password recovery never returns the raw reset token. When `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PASSWORD_RESET_BASE_URL` are configured, the API delivers a one-time reset link through Resend; provider failures remain neutral to avoid account enumeration.
- Sensitive auth routes are rate limited.

Production requires HTTPS and a high-entropy `JWT_ACCESS_SECRET` of at least 32 characters.

## Cookies and browser boundary

The refresh cookie is HTTP-only, `SameSite=Strict`, scoped to `/api/v1/auth`, and Secure in production. CORS accepts only `CORS_ORIGIN`/`WEB_ORIGIN` values and credentials are explicitly enabled. API responses include restrictive MIME/referrer/frame/permissions headers and a correlation ID.

## Authorization

`PolicyService` centralizes role capabilities:

- **Owner**: full workspace/member/operations/workflow control.
- **Admin**: operational/member/workflow control without ownership semantics.
- **Member**: operational writes and workflow drafting; no activation/admin controls.
- **Viewer**: read only.

Ownership-specific rules (for example, a sole Owner cannot leave) remain in the relevant domain service.

## Workflow safety

Workflow definitions are declarative only. There is no `eval`, arbitrary JavaScript, shell execution or user-defined network request node.

Before activation FlowDesk verifies:

- a typed supported schema;
- exactly one trigger;
- valid edge endpoints;
- no cycles;
- reachable nodes and valid trigger shape;
- required configuration;
- membership/project/client references belong to the workflow tenant, including references embedded in conditions;
- ordered operators (`GTE`/`LTE`) are restricted to priority comparisons and `IN` requires an explicit value list.

Execution safety adds:

- immutable version pinning;
- deterministic queue and side-effect identifiers;
- idempotency records;
- bounded retry policy;
- causation metadata;
- maximum automation depth/action count;
- repeated-workflow chain protection;
- safe execution/step errors without credentials.

## Activity vs audit

Activity is user-facing operational history (`USER`, `AUTOMATION`, `SYSTEM`). Audit logs are security/administrative traces. Do not surface sensitive audit metadata as product activity by default.

Never log passwords, access/refresh/reset tokens, database credentials, session cookies or secret environment variables.

## Production checklist

- [ ] Unique production `JWT_ACCESS_SECRET` stored in platform secrets.
- [ ] HTTPS on web and API.
- [ ] `CORS_ORIGIN` restricted to the deployed web origin(s).
- [ ] Configure `PASSWORD_RESET_BASE_URL`, `PASSWORD_RESET_FROM_EMAIL` and `RESEND_API_KEY` for production recovery delivery.
- [ ] Managed PostgreSQL and Redis require authentication/TLS per provider.
- [ ] Run `prisma migrate deploy`, not `db push`.
- [ ] Disable/replace development seed credentials.
- [ ] Run tenant/RBAC/auth/workflow integration tests.
- [ ] Run duplicate-event/idempotency and workflow loop tests.
- [ ] Review rate limits and retention for the expected workload.
- [ ] Managed Redis uses a `noeviction` max-memory policy.
- [ ] Keep `.env` and provider secrets out of Git.
