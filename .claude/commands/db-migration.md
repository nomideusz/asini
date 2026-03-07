# Run Database Migration

Generate and apply a Drizzle ORM database migration for one of the apps.

## Apps and their databases
- `thebest` — PostgreSQL via `postgres` driver, configured in `apps/thebest`
- `yoga` — libSQL/Turso via `@libsql/client`, configured in `apps/yoga`

## Steps

1. **Choose app**: Ask which app if not specified: `thebest` or `yoga`.

2. **Understand the change**: Ask what schema change triggered this migration (new table, added column, etc.) so the migration can be verified as correct.

3. **Generate**: Run `pnpm --filter <app> db:generate`. Show the path to the generated migration file.

4. **Review SQL**: Read and display the generated migration SQL. Ask the user to confirm it looks correct before applying.

5. **Apply**: Run `pnpm --filter <app> db:migrate` after confirmation.

6. **Verify**: Confirm success. Remind the user to commit the migration file to git.

## Notes
- Never run `db:push` (bypasses migration history) unless the user explicitly asks
- Never run `db:reset` without explicit user confirmation — it clears all data
- Always show the SQL before applying
