# RC1 acceptance — 15/15 PASS

LT-0 = PASS; LT-1 = PASS; LT-2 = PASS. V1_RC_READY.

| # | Required check | Status | Evidence |
|---|---|---|---|
| 1 | clean install / clean build | PASS | RC_CLEAN_CHECK.json |
| 2 | empty-profile startup | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json |
| 3 | existing v3 migration | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json |
| 4 | legacy v2 migration | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json |
| 5 | corrupted-data recovery | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json |
| 6 | full-backup restore into empty profile | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json; import-backup.test.ts |
| 7 | multi-tab adversarial test | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json; service.test.ts |
| 8 | attachment copy/delete test | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json |
| 9 | import conflict test | PASS | lt0-browser-2026-09-05T13-44-58-082Z.json; import-backup.test.ts |
| 10 | 390px mobile complete learning loop | PASS | lt1-browser-2026-09-05T13-45-33-429Z.json |
| 11 | 430px mobile complete learning loop | PASS | lt1-browser-2026-09-05T13-45-33-429Z.json |
| 12 | desktop smoke | PASS | lt1-browser-2026-09-05T13-45-33-429Z.json |
| 13 | logout/login local-data behavior | PASS | rc-production-2026-09-05T13-44-34-935Z.json |
| 14 | restart persistence | PASS | rc-production-2026-09-05T13-44-34-935Z.json |
| 15 | all regression tests | PASS | rc-clean-tests.txt; rc-extracted-production-final.txt |

All final browser checks ran against the independently extracted runtime ZIP. The clean build is from 916cdf2; later test-only wait correction and documentation do not change runtime code. Required mobile scope was explicitly accepted by the user: real Chrome viewport/touch/input and keyboard-space simulation, not physical phone/native IME.

Earlier failures and explicit generated-document skips are retained; only the identified final runs count. Runtime ZIP SHA-256: 8d9f2ddd98184aae76e0bfb45642af4c5ba908706e4f54710c1f306246004237. No public deployment.
