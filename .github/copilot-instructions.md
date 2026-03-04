# Copilot Instructions — asini monorepo

## Critical context

Read `AGENTS.md` at the repo root before ANY task. It contains:
- The full architecture and dependency rules
- Canonical domain types (never modify without flagging)
- The TourSlot state machine (non-negotiable)
- Extraction rules for moving logic from Zaur
- Build order with dependency gates

## Repository structure

pnpm monorepo with workspace packages:
```
packages/svelte-calendar/    — @nomideusz/svelte-calendar (published)
packages/svelte-scheduler/   — @nomideusz/svelte-scheduler (in progress)
apps/yoga/                   — szkolyjogi.pl (live site)
apps/thebest/                — thebest.travel (future)
```

Reference repos (read-only, never import from):
- `tours/` — Zaur, the business logic reference
- `booking-platform/` — abandoned prototype, secondary reference

## Tech stack
- Svelte 5 (runes: `$state`, `$derived`, `$props`) — NO Svelte 4 syntax
- SvelteKit 2, TypeScript strict, Vite 7
- vitest for testing
- pnpm workspaces, Node >= 20
- CSS: `--asini-*` tokens inside packages, Tailwind + DaisyUI in apps only

## Validation commands
```bash
pnpm install                    # install deps
pnpm -r check                   # typecheck all packages
pnpm -r test                    # run all tests
pnpm --filter @nomideusz/svelte-scheduler check   # typecheck scheduler only
pnpm --filter @nomideusz/svelte-scheduler test    # test scheduler only
```

## Rules
1. Dependencies flow downward only: apps → scheduler → calendar → nothing
2. Never import from Zaur (`tours/`) or `booking-platform/` — read them as specs
3. Guide cancellation = 100% refund. Always. No exceptions.
4. Slot generation is lazy — only cancelled instances are persisted
5. Package CSS uses `--asini-*` tokens only — no Tailwind inside packages
6. Every extracted module must have unit tests (Zaur had none)
7. Pure functions only in `core/` — no DB, no Stripe, no SvelteKit imports
8. Use `crypto.randomUUID()` for IDs — no external deps
9. All types live in `src/lib/core/types.ts` — never duplicate them

## Task agent files
Task-specific instructions are in `.github/agents/`. Each file is a complete spec for one task.
When assigned an issue that references one of these agents, follow that agent file as the primary spec.

## PR requirements
- `pnpm -r check` must pass (zero errors)
- `pnpm -r test` must pass (all green)
- New code must have tests
- Follow existing code style and patterns
- Commit messages: conventional commits (feat:, fix:, test:, refactor:)
