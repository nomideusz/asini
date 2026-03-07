# Publish @nomideusz Package

Publish one of the public packages in `packages/` to npm under the `@nomideusz` scope.

## Steps

1. **Choose package**: Ask which package to publish if not specified: `svelte-calendar`, `svelte-scheduler`, `svelte-notify`, or `svelte-payments`.

2. **Typecheck**: Run `pnpm --filter @nomideusz/<package> check`. Fix all errors before continuing.

3. **Tests**: Run `pnpm --filter @nomideusz/<package> test`. Fix all failures before continuing.

4. **Build package**: Run `pnpm --filter @nomideusz/<package> package`.

5. **Version bump**: Show the current version from `package.json`. Ask the user what the new version should be (semver: patch/minor/major or explicit like `0.7.0`). Update `version` in the package's `package.json`.

6. **Changelog**: Remind the user to update `CHANGELOG.md` if they haven't.

7. **Confirm**: Show a summary — package name, version, what will be published — and ask for final confirmation before publishing.

8. **Publish**: Run `pnpm --filter @nomideusz/<package> publish --access public`.

9. **Done**: Confirm success and show the npm URL: `https://www.npmjs.com/package/@nomideusz/<package>`.

## Notes
- Never publish with uncommitted changes unless the user explicitly says to proceed
- Never bump version automatically — always ask the user
- Package manager: pnpm (not npm directly)
