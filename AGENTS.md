# AGENTS.md

pnpm monorepo (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). No CI. No existing instruction files.

## Layout & runtimes

- `apps/client` — React 18 + Vite + TypeScript. Runs on Node. **No test script.**
- `apps/server` — Hono + Drizzle **backend that runs on Bun, not Node**. Dev, tests, drizzle all run under `bun`.
- `packages/types` & `packages/utils` — shared packages (`@modern-api-studio/types`, `@modern-api-studio/utils`). **Exported as raw TypeScript source** (`main`/`types` point at `index.ts`), no build step — edits apply immediately. Keep them compatible with both Vite and Bun.

## Commands

```bash
pnpm dev          # parallel client (5173) + server (8888/api)
pnpm dev:client   # vite only
pnpm dev:server   # bun --env-file=../../.env run --hot src/index.ts
pnpm migrate      # node scripts/migrate*.js -> Supabase
pnpm db:generate|db:migrate|db:studio   # drizzle-kit, from apps/server
```

Server-focused checks must run inside `apps/server` (or `pnpm --filter @modern-api-studio/server …`):

```bash
bun test                # bun tests
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint src/
pnpm format             # prettier --check src/  (run before/after lint)
```

Single server test: `bun test src/lib/__test__/i18n.test.ts`. Client "build" includes `tsc -b` (acts as its typecheck).

## Environment

- Single root `.env` (copy `.env.example`). Server loads it via `--env-file=../../.env`; Vite only reads `VITE_*` vars. Never commit `.env`.
- **`env.ts` / `drizzle.config.ts` ship stale boilerplate defaults** (`reel_cut`, `reel-cut`, `hono-boilerplate`) — set real values in `.env`, don't trust the fallbacks.
- `pnpm migrate` runs raw SQL from `supabase/migrations/` against `DATABASE_URL` (SSL with `rejectUnauthorized: false`). This is the schema source of truth: RLS policies + SECURITY DEFINER RPC functions that bypass the `project_members` self-query recursion.

## Server architecture (the part that's easy to get wrong)

- Controllers are **decorator-based and auto-registered**, not manually wired. Define routes in `apps/server/src/bff/controllers/*.controller.ts` using `@Controller`/`@Get`/`@Post`/`@AuthAccess`; `index.ts` calls `registerControllers(app, [...])`. Routing metadata lives in `src/lib/route-registry.ts` (method-level `@AuthAccess()` tracking relies on decorator evaluation order across the same `descriptor.value` reference).
- Layer split per feature: `bff/` (controllers + BFF services) → `app/<feature>/` (`types/`, `service/`, `repository/`, `entity/`). Drizzle schema is globbed from `src/app/**/entity/*.entity.ts` (decorator entities, not a single schema file) by `drizzle.config.ts`.
- Central `configs/` (`env`, `logger`/winston, cors, error-handler), `middlewares/` (auth, auth-access, request-logger), and `lib/` (response-helper, pagination, i18n, jwt-utils, template rendering).

## UI conventions

- `DESIGN.md` is the required design system: Catppuccin-style dark palette, Sora/Manrope/JetBrains Mono fonts, 4px spacing base, 8/12px radii, 150-220ms motion. Reference it for any client UI work.
- Client: Zustand for state (local spec persisted to storage), Supabase client-side auth/realtime collaboration, Tailwind v4 + framer-motion.