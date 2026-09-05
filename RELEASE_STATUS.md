# RC1 execution checkpoint

Phase: LT-0 accepted; LT-1 implementation starts next. No LT-2 product changes yet.

LT-0: PASS. LT-1: UNVERIFIED. LT-2: BLOCKED. Verdict: V1_RELEASE_BLOCKED.

Domain/service tests: 51 PASS, 0 FAIL (`release-evidence/lt0-product-tests.txt`). Typecheck PASS; domain lint PASS. LT-0 browser acceptance: 10 PASS, 0 FAIL, Chrome 152.0.7977.77 (`release-evidence/lt0-browser-2026-09-05T12-48-50-996Z.json`). Matrix: `release-evidence/LT0_ACCEPTANCE.md`.

2026-09-05 new blocker during LT-0: the startup overlay intercepted all recovery actions because the normal knowledge shell did not mount in recovery mode. Evidence: `release-evidence/screenshots/lt0-recovery-blocker.png`; browser reported `#leo-boot intercepts pointer events`. Recovery now explicitly dismisses the boot layer independently of authentication. Downstream gates remain blocked pending a passing browser rerun.

Earlier browser harness run used an exact implicit label that included the textarea's initial text; corrected to a stable label pattern. A subsequent run was interrupted by Windows EBUSY in Vite's watcher when a download file was written; test artifacts are now excluded from source watching. Those failed/interrupted runs are retained. Only the final complete 10/10 run is used for acceptance.

Tooling follow-up: product and platform tests are separated. Four checks against intentionally omitted generated OG/AGENTS documents are explicitly skipped as unavailable platform inputs. Initial applicable-platform run has additional environment-flag assertions to adapt/verify; it is not yet a full-suite PASS. See `release-evidence/platform-initial.txt`.
