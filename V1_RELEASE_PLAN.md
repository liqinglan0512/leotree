# Leo Tree v1.0 RC1 release closure

The implementation authorization supplied on 2026-09-05 supersedes the review-only phase of ASTRA_REVIEW_BRIEF.md. The original archive is preserved outside this repository. Source archive SHA-256: `9f04604a61d180c3b4c26d6ac8c2fbb5cd741ee9318023311b45429867e182cf` (173 files). This is an independent workspace, not Leo AI Studio.

## Release rule

LT-0 DATA SAFETY → LT-1 LEARNING LOOP → LT-2 PUBLIC RELEASE CONTRACT. Each gate is exclusively PASS, FAIL, BLOCKED or UNVERIFIED. Every gate must PASS for V1_RC_READY. The product model, local-first architecture, flat nodes plus parentId, pure domain functions, StorageAdapter, paper/ink visuals, and three bottom navigation destinations remain frozen. No feature expansion or deployment is authorized by this plan.

## Finding-to-work mapping

| Finding | Implementation and permanent regression | Gate / dependency |
|---|---|---|
| F01 | Command/updater boundary; explicit tree identity; domain revisions and serialized cross-tab writes; UI state does not persist domain. Parallel writes, stale search/tab, upload with note/edit/tree switch/deletion tests. | LT-0, validators |
| F02 | Parse/validate/analyze/preview/atomic import. Default independent new tree; explicit restore/merge, chronology and structure/attachment conflicts; stale preview rejected. | LT-0, F01/F04/F06 |
| F03 | Typed read outcomes; no write on failed read; preserve raw; validate recovery candidate and explicitly activate; v3/v2/future/malformed tests. | LT-0, F04 |
| F04 | Workspace/tree validators; unique identities, references, parent graph, order, log/review/attachment metadata; narrow content patches; deletion reference repair. | LT-0 first |
| F05 | Reset learning state only, preserve knowledge, reviews, logs and attachment bytes. | LT-0, F04 |
| F06 | Independent tree copy with new file IDs and copied bytes; transaction-safe attachment edits and reference-aware collection; cancellation cleanup. | LT-0, F01/F04 |
| F07 | Versioned ZIP backup with manifest, complete workspace, attachment bytes, retained garden assets and SHA-256; restore into empty storage and compare all content. JSON explicitly incomplete. | LT-0, F01/F03/F06 |
| F08 | SAVE_FAILED/DEGRADED/RECOVERY_REQUIRED; retain unsaved draft and rescue export; retry; quota/serialization/IDB abort tests; coalesce text edits. | LT-0, F01/F03/F06 |
| F09 | Expose only verifiable configured authentication; remove fake phone/provider entry points; explain account/local-space relationship and test sign-in/out persistence. | LT-2, LT-0 and LT-1 PASS |
| F10 | Search opens detail; visible effective filters and accurate empty states; new nodes visible; full paths; node→practice→review→node links. | LT-1, LT-0 PASS |
| F11 | Include tree.test in product tests; separate generated-platform checks; permanent F01–F13 regressions; clean install, typecheck, lint, applicable tests and production build. | All gates |
| F12 | Durable firstDoneAt and historical evidence; separate current diagnostics; unknown history never reported as known zero; trimming/relearning regression. | LT-1, LT-0 PASS |
| F13 | Normalize sibling order after every structural mutation; delete/add/move/reparent combinations. Structural invariant groundwork belongs to LT-0. | LT-0 invariant + LT-1 interaction |
| F14 | Defer community expansion and hide local simulation actions; preserve future source architecture; natural unavailable state. | LT-2, LT-0 and LT-1 PASS |
| F15 | Readable long titles, bounded deep indentation, modal focus/Escape/close/restore, touch targets and viewport-aware structure menus. Real 390/430/desktop/landscape/max-font/deep-tree/long-list checks. | LT-1, LT-0 PASS |

## Ordered implementation and commits

1. Preserve baseline and this plan. Establish isolated reproducible product tests.
2. Enforce domain invariants and learning reset semantics. Validate migrations without lossy coercion.
3. Add conservative storage/recovery and revision-based command service. Migrate every product writer and async file flow onto the boundary. Preserve failed drafts.
4. Add independent attachment transactions, import conflict preview, and complete verified ZIP backup/restore. Exercise all ten LT-0 acceptance conditions and F01–F08 reproductions before recording LT-0 PASS.
5. Only after LT-0 PASS: close navigation/practice/review loop, historical semantics, mobile interactions. Verify LT-1 and save screenshots.
6. Only after LT-0 and LT-1 PASS: narrow public community/auth/legacy entry points and publish short accurate user documentation. Verify LT-2.
7. Repeat full applicable checks from a clean install/build; record fifteen RC acceptance outcomes and logical commits; package source, evidence and RC artifacts; write A–L release report. No automatic public deployment.

Each logical commit needs passing tests for its scope. Failures remain in the evidence log, are fixed, and are rerun. New P0 findings block dependent work until resolved. Checkpoints live in `RELEASE_STATUS.md` and `release-evidence/`; no destructive rollback of evidence.

## LT-0 acceptance (all required)

1. Parallel tabs have no silent overwrite.
2. Old callbacks cannot overwrite new notes or trees.
3. Malformed/unsupported/future schema never overwrites raw source.
4. Unconfirmed import conflicts cannot overwrite a tree.
5. Duplicate IDs, cycles, missing sections and dangling parents rejected.
6. Reset retains notes/logs/reviews.
7. Copied attachments own different IDs and identical bytes.
8. Deleting copy attachment retains original bytes.
9. Full backup restores complete content and attachment hashes into empty storage.
10. Quota/IndexedDB failures retain rescueable content.

## RC acceptance and evidence

Clean install/build; empty profile; v3 migration; v2 migration; corrupted recovery; full backup into empty profile; multi-tab adversarial; independent files; import conflicts; 390px learning loop; 430px learning loop; desktop smoke; logout/login local-data behavior; browser restart persistence; all regressions. Record command, environment, actual result and artifact for each. Synthetic viewport/keyboard simulation must be distinguished from physical-device observation. Missing runtime or credentials is UNVERIFIED, never PASS.

## Initial state

LT-0 = UNVERIFIED; LT-1 = BLOCKED (LT-0 dependency); LT-2 = BLOCKED (LT-0/LT-1 dependencies); release = V1_RELEASE_BLOCKED until evidence changes these states.
