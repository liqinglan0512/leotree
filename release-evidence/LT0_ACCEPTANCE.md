# LT-0 DATA SAFETY — PASS

Accepted 2026-09-05 after 51/51 product tests, typecheck and domain lint passed; Chrome 152.0.7977.77 browser acceptance completed 10/10. No LT-1/LT-2 implementation was used to waive a data failure.

| Required condition | Result | Evidence |
|---|---|---|
| Parallel tabs have no silent overwrite | PASS | service.test.ts distinct-field/same-field tests; browser two-tab concurrent writes |
| Old callbacks cannot overwrite notes/trees | PASS | old callback regression; upload+note+switch browser case; delete/upload race unit test |
| Malformed/future payload preserves raw source | PASS | recovery.test.ts error matrix; exact raw browser download and preserved recovery record |
| Import conflicts require explicit preview confirmation | PASS | import-backup.test.ts older/default-new/restore/merge/stale preview/legacy revision-zero cases; browser unconfirmed import leaves 2 trees, confirmed import adds independent third |
| Duplicate IDs/cycles/missing section/dangling parent rejected | PASS | invariants.test.ts and import graph validation regressions |
| Reset preserves note/log/review | PASS | invariant reset test and service command reset timestamp test |
| Tree copy has independent attachment bytes and IDs | PASS | service copy test and actual UI copy test |
| Deleting copy file does not affect original | PASS | original Blob remains readable in actual IndexedDB after copy deletion |
| Complete ZIP restores all knowledge and bytes into empty storage | PASS | deep equality of complete tree payloads, per-Blob SHA-256 unit comparison, browser restore to empty profile and actual IndexedDB byte comparison |
| Quota/IDB/serialization failures remain rescueable | PASS | browser quota failure→JSON rescue→retry; IDB abort/atomic rollback tests; uncommitted attachment rescue ZIP; serialization-before-write regression |

Supporting artifacts: `lt0-product-tests.txt`, `lt0-browser-2026-09-05T12-48-50-996Z.json`, `screenshots/lt0-recovered.png`, `screenshots/lt0-save-failed.png`, `screenshots/lt0-import-preview.png`, `screenshots/lt0-restored-empty-profile.png`, `downloads/LeoTree-backup.zip`.

Regression-discovered blockers fixed before PASS: recovery controls behind startup overlay; stale preview on unversioned legacy source now checks reviewed content as well as revision; reset replay preserves null timestamps. Windows Vite download-watch EBUSY was an environment failure, fixed by excluding evidence paths. Earlier unsuccessful runs remain recorded and are not counted as passes.

Last-good recovery snapshots intentionally retain their referenced bytes for one checkpoint. Collection deletes only unreferenced bytes and defers when a reference source is unreadable. These rules are implemented and tested, not exceptions to the copy/delete acceptance.
