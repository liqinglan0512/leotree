# Leo Tree RC1 architecture

The product retains React 19 / TanStack Start / Vite / Nitro, pure domain functions and a StorageAdapter. Tree → Section → flat Node[] + parentId supports arbitrary depth. Node identity is (treeId, nodeId). SNN is template data.

## Writes and recovery

`knowledge-app.tsx` subscribes to `WorkspaceService` in `src/lib/knowledge-tree/service.ts`. Components submit named commands through `operations.ts`, not workspace snapshots. Search, filter, selected tree, focus and dialogs are view state; text commands coalesce for 300ms.

The service takes a Web Lock, rereads the latest revision, checks command preconditions, applies pure engine functions, validates, stages immutable bytes in IndexedDB, then atomically changes the active localStorage envelope. BroadcastChannel and storage events refresh peers. Conflicts/failures retain drafts and expose retry/rescue. Missing Web Locks disables unsafe writes.

`validation.ts` checks schema and domain relationships. `storage.ts` owns typed reads, revision CAS, last-good candidates and raw recovery copies. `migrate.ts` validates v3/v2 candidates without writing on read. `import.ts` separates independent import, restore and merge and requires an unchanged confirmed preview. `backup.ts` hashes and validates ZIP payloads before activation. `files.ts` stores immutable Blobs; `cover-draft.ts` keeps cancelled selections in memory.

Active key: `leo-tree-workspace-v1`, envelope format 1, domain schema 3. `knowledge-tree-workspace-v3` and v2 keys remain legacy read sources. Attachment database: `leo-tree-files-v1`, store `blobs`. Last-good and retained garden references protect recovery bytes until unreferenced. See [data protocol](docs/DATA_SAFETY_PROTOCOL.md).

## Learning and public surfaces

`history.ts` maintains immutable learning facts with completeness provenance; `firstDoneAt` survives compact-history trimming and reset. `progress.ts` separates historical totals from current diagnostics. Incomplete legacy evidence is unknown, never invented zero.

`tree-page.tsx` links search → node → practice → review → node, exposes filters, reading titles and bounded indentation. Native dialogs provide Escape, focus containment/restoration; popovers stay within the viewport. `grove.tsx`, `community-preview.tsx`, `settings.tsx` implement the three destinations. Original community code remains inactive; the old standalone SNN URL is a script-free redirect with its original archived.

`product-contract.ts` owns version, progress explanation and nine user answers. Knowledge never enters auth SQL. Public email/password requires opt-in persistent storage, stable secret, valid origin and DB probe; no phone/OAuth simulation is exposed. The portable Node build traces the full PGLite package so WASM/data survive extraction. `scripts/verify-build.mjs` rejects dependencies resolved outside the output.

## Verification

Product tests discover all `src/lib/knowledge-tree/*.test.ts`; platform/inherited helpers run separately. Production browser scripts cover data failures, learning loops, accounts and actual browser/server restart. [tests/README.md](tests/README.md) and [RELEASE_STATUS.md](RELEASE_STATUS.md) define evidence; this description alone is not a gate result.
