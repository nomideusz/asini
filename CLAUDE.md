# CLAUDE.md — Asini Monorepo

> Read AGENTS.md for the full spec, architecture, package registry, build order, and agent rules.
> This file contains only essential quick-start commands.

---

## Commands

```bash
# Install
pnpm install

# Dev servers
pnpm dev:calendar    # packages/svelte-calendar demo
pnpm dev:scheduler   # packages/svelte-scheduler demo
pnpm dev:yoga        # apps/yoga (szkolyjogi.pl)
pnpm dev:thebest     # apps/thebest (thebest.travel)

# Typecheck all packages
pnpm check

# Run all tests
pnpm test

# Package for npm publish
pnpm --filter @nomideusz/<package-name> package
```

## Package manager: pnpm workspaces
## Node: >=20 | TypeScript: strict | Svelte: v5 runes mode
