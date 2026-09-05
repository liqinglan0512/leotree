# LT-2 PUBLIC RELEASE CONTRACT — PASS

LT-0 and LT-1 passed before these changes. Production run `rc-production-2026-09-05T13-34-43-659Z.json`: 6/6 PASS. Its child data suite passed 10/10 (`lt0-browser-2026-09-05T13-35-05-319Z.json`); learning passed 5/5 (`lt1-browser-2026-09-05T13-35-47-170Z.json`). Real Chrome 152.0.7977.77, Node 24.16.0, isolated synthetic identities and local ports 8082/8083.

| Public requirement | Evidence |
|---|---|
| Only working auth; default is local space | Unconfigured production server exposes no credential form or provider buttons. Configured server successfully registers and logs in through actual Better Auth UI. Invalid password is rejected. |
| Account/local knowledge boundary | Signup, logout, login, second account and actual browser/server restart preserve the identical workspace string and attachment bytes. Re-login after restart proves durable credentials, not merely a cached session. |
| Community scope | Preview with one return action; no create, publish, comment or cover form. Original future code remains inactive. |
| Legacy SNN entry | Ordinary URL redirects to root without domain write. Original file is archived; its SHA-256 is regression-tested. |
| Honest progress | UI and nine-answer guide define current self-reported weighted node progress, equal parent/child weights, and explain denominator expansion. |
| Short public guide | Nine answers appear in settings and USER_GUIDE.md; clarify local data, account, JSON, ZIP, copy independence, bytes, progress, reset and community. |

Production packaging failure was discovered and retained: the first build exited 0 but omitted PGLite runtime data/WASM; the configured capability probe failed. A second attempt externalized the package but did not trace it. Final Nitro `traceDeps` full-package configuration includes the package and required assets. `rc-runtime-assets.txt` records their hashes and dependency containment. Earlier failures are not counted as acceptance.

Final scope checks before clean-room verification: `lt2-tests-final.txt` = 58 product PASS, 236 applicable platform PASS, 4 generated-document SKIP, 0 FAIL; typecheck/lint exit 0 (13 existing Fast Refresh advisories). Screenshots `rc-public-data-guide.png`, `rc-community-preview.png`, `rc-configured-account.png`, `rc-after-restart.png` document the public contract. The guide screenshot was visually inspected.

Remaining release work is clean install/build plus independent extracted runtime verification and final packaging. This gate PASS alone is not a public deployment claim.
