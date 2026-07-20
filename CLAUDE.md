# CLAUDE.md — 2108Trade Project Conventions

## Build & Development

- **Package manager:** Bun (`bun install`, `bun run dev`, `bun run build`)
- **Monorepo:** Turborepo with `apps/*` and `packages/*` workspaces
- **Run all:** `bun run dev` (root) starts all apps
- **Single app:** `cd apps/<name> && bun run dev`
- **Lint:** `bun run lint` (per workspace or root)
- **Type-check:** `bun run typecheck` (per workspace or root)
- **Format:** `bun run format` (Prettier)

## Language & Tooling

- **TypeScript strict mode** — every app and package
- **Next.js 15+** with App Router for `apps/web`
- **Next.js 15+** with Pages Router (static export) for `apps/landing`
- **Tailwind CSS v4** for all styling
- **Bun** as the only JS runtime and package manager

## Code Style

- Double quotes for strings (Prettier default)
- Trailing commas everywhere (Prettier default)
- Semicolons required
- Arrow functions preferred over `function` declarations for components
- Named exports for components; default exports only for Next.js route files
- Import order: React/Next first, then third-party, then internal (`@2108trade/*`), then relative
- Type imports use `import type { ... }` syntax

## Testing

- **Vitest** for unit and integration tests
- **Playwright** for E2E tests (in `apps/web`)
- Each package/app has its own `vitest.config.ts`
- Tests live in `__tests__/` directories or `*.test.ts` co-located

## Git

- Feature branches: `feat/<description>`, `fix/<description>`, `docs/<description>`
- Squash merge into `main`
- PR title: concise summary of the change
- PR body: what changed, why, how to test

## Packages (Internal)

- `@2108trade/shared` — shared types, utils, constants
- Path alias: `@2108trade/shared` → `packages/shared/src`
