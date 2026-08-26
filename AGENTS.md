# FlowDesk contributor guide

- Use pnpm and the pinned Node and pnpm versions in the root `package.json`.
- Keep REST routes beneath `/api/v1` and contracts in `packages/contracts`.
- Use strict TypeScript; do not introduce `any`.
- Add behavior tests before implementation and run the applicable quality commands before committing.
- Never add secrets to the repository; document required variables in `.env.example`.
