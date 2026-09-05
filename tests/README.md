# Test Index

Tests remain at their original paths so the snapshot does not rewrite imports or falsify repository structure.

## Product/domain tests

- `src/lib/knowledge-tree/engine.test.ts`
- `src/lib/knowledge-tree/migrate.test.ts`
- `src/lib/knowledge-tree/tree.test.ts`
- `src/lib/app-data/app-data.test.ts`
- `src/lib/auth/gate-identity.test.ts`
- `src/lib/auth/sign-in-gate.test.ts`

## Script/platform tests

- `scripts/brand-check.test.mjs`
- `scripts/browser-smoke-verdict.test.mjs`
- `scripts/check-auth-invariant.test.mjs`
- `scripts/grok-pwa-plugin.test.mjs`
- `scripts/migration-plan.test.mjs`
- `scripts/preview.test.mjs`
- `scripts/sign-out-plan.test.mjs`
- `scripts/with-app-env.test.mjs`
- `scripts/write-atomic.test.mjs`

## Package command

`npm test` runs the script tests and a selected set of TypeScript tests. Reviewers should compare that explicit list with the inventory above; a file's presence does not prove that the default test command executes it.

No test result in this curated package should be treated as current unless the reviewer runs the command in a suitable disposable environment.
