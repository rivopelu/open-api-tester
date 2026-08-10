# AGENTS.md — apps/client

Frontend of the Modern API Studio (Max API Studio) monorepo: a React 18 + TypeScript + Vite SPA that lets users design, convert, and preview OpenAPI specs. Part of a pnpm workspace; see the repo-root `../AGENTS.md` for the monorepo-wide picture and server contract.

## Dev environment

- Node >= 20, pnpm 10 (`packageManager: pnpm@10.15.0`). React 18 (not 19) with react-refresh.
- Env comes from the **repo-root `.env`** only (`vite.config.ts` sets `envDir` to `../..`). Vite reads only `VITE_*` vars (e.g. `VITE_API_URL`, `VITE_SUPABASE_*`). `.env` is gitignored; never commit it.
- No `.env` in this directory exists or should.

## Build & test

Run from the repo root (`D:\open-api-tester`) or via `pnpm --filter @modern-api-studio/client`:

```bash
pnpm dev               # parallel client (Vite :5173) + server
pnpm dev:client        # Vite only
pnpm build             # typecheck + build: tsc -b && vite build
pnpm lint              # eslint .  (flat config; no --fix)
```

- The client has **no test script** and no Vitest setup — `tsc -b` (part of `build`) is the only typecheck. Don't offer `pnpm test` for this package.
- Dev server proxies `/api` → `http://localhost:8888`, so feature work that hits the API needs `apps/server` running (root `pnpm dev` or `pnpm dev:server`).

## Conventions

- Store shape: Zustand stores in `src/store/use*Store.ts` (`useUiStore`, `useAuthStore`). Auth/token handling lives in `src/lib/api.ts` (axios instance + `api-studio:token` localStorage key + `ApiEnvelope<T>` unwrap helpers).
- Routing is centralized in `src/routes/index.tsx` via `createBrowserRouter` — add routes there, not inline in components.
- Components: PascalCase files in `src/components/<feature>/` (designer, converter, preview, security, ui). Reusable UI primitives live in `src/components/ui/` and are re-exported from `src/components/ui/index.ts` as named imports (`import { Button } from '../../components/ui'`).
- Pages: kebab-case `*-page.tsx` under `src/pages/`, **default export** the component (e.g. `pages/auth/sign-in-page.tsx`).
- Shared workspace deps `@modern-api-studio/types` / `@modern-api-studio/utils` are raw TS source aliased in `vite.config.ts` (no build step — edits apply immediately).
- Design: dark Catppuccin-style palette via Tailwind v4 `@theme` tokens + `--color-*` in `src/index.css`, plus utility classes (.card, .btn, .method-badge, .animate-fadeIn, .glow-blue, etc.). Reference the repo-root `DESIGN.md` (Sora/Manrope/JetBrains Mono, 4px spacing base, 8/12px radii) before any UI work. Use `cn()` from `src/lib/utils.ts` for class merging; use design tokens, not hardcoded hex where tokens exist.
- State/UI: framer-motion, @tanstack/react-query (retry 1, staleTime 30s), react-hook-form + zod.

## Pitfalls

- Quote/semicolon style is **inconsistent across files**: the bulk of `src/components/*` and `src/store/*` use single quotes + semicolons, but newer refactored files (e.g. `src/pages/auth/sign-in-page.tsx`) use double quotes with no semicolons. No Prettier config enforces a style. Match the file you're editing; don't reformat unrelated files.
- `tsconfig.app.json` is strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax` — unused vars or enum/namespace syntax fail `build`. Use `import type` for type-only imports.
- `dist/` is a build artifact (gitignored); never hand-edit it. `src/assets/*.svg/png` are template leftovers unless reused.
- No CI pipeline exists; `pnpm lint` and `pnpm build` are the local quality gates.