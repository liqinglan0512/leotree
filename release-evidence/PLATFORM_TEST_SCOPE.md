# Product and platform test scope

`npm test` runs `test:product` and then `test:platform`. Neither runner uses a hard-coded list of product test files: `scripts/product-tests.mjs` includes all knowledge-tree `*.test.ts`, including `tree.test.ts`. The platform runner discovers all `scripts/*.test.mjs` and the three existing app-data/auth helper suites.

Current checkpoint: product 56 PASS, platform 236 PASS, 4 SKIP, 0 FAIL (`lt1-final-tests.txt`). Typecheck exit 0. Lint exit 0 with 13 React Fast Refresh module-export warnings; these are development reload advisories, not disabled correctness rules (`lt1-lint.txt`).

The four explicit skips check generated documents omitted from the supplied review bundle: three `brand-check.test.mjs` assertions require generated AGENTS/OG skill documents, and one `write-atomic.test.mjs` assertion requires `.grok/skills/og/references`. These do not validate Leo Tree runtime behavior. Their test names and missing-input reason remain visible. Product tests have zero skips.

The first platform run (`platform-initial.txt`) had 13 additional failures. They were not skipped. OG unit cases unintentionally read this product's real `site.json` and `public/og.jpg` instead of an empty template, and environment-wrapper cases assumed a generated auth-off file existed. These now use explicit temporary workspaces and exercise the real production functions. The actual auth migration is present and byte-identical to its preserved source; the corresponding check now reflects this configured product rather than an unused template's auth-off state. The fixture-corrected run is `platform-fixtures.txt`.

An existing empty token-parser catch failed lint. It now documents the already implemented fallback to hashing the opaque token. An unused lint-disable directive and unused browser-fixture variable were removed. No authentication behavior was changed during LT-1.
