# RC1 test entry points

`npm test` runs both groups and propagates failures:

- `test:product`: discovers all `src/lib/knowledge-tree/*.test.ts`, including `tree.test.ts`; invariants, races, recovery, bytes, backup, migration, learning history and public configuration.
- `test:platform`: discovers `scripts/*.test.mjs` plus inherited app-data/auth helpers. Four unavailable generated-document checks are explicitly skipped. See [scope](../release-evidence/PLATFORM_TEST_SCOPE.md).

`test:build` checks portable Node output, contained dependencies and PGLite binary assets. `test:browser:production` starts two owned production servers, verifies public/account behavior and real browser/server restart, then runs both browser suites. Requires a production build and installed Chrome. Temporary credentials and profiles stay in ignored evidence directories.

`test:browser:data` covers ten adversarial scenarios. `test:browser:learning` covers 390/430/desktop loops and both mobile maximum-font/landscape cases. `RC_URL` overrides the local test target. Keyboard occupancy is simulated under the accepted user scope. Failures remain timestamped evidence; current counts/verdict are in [RELEASE_STATUS.md](../RELEASE_STATUS.md).
