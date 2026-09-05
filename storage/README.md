# Storage index

Active code remains under `src/lib/knowledge-tree/`:

- `service.ts`, `operations.ts`: commands, field preconditions, Web Locks, revision checks, drafts and peer refresh.
- `storage.ts`: adapter, active envelope, last-good and raw recovery copies, typed failures.
- `migrate.ts`: candidate migration; `import.ts`: conflict preview and explicit activation.
- `files.ts`: immutable IndexedDB transactions; `cover-draft.ts`: cancellation without writes.
- `backup.ts`: ZIP manifest, hashes, validation and restore.

Legacy `src/lib/garden-store.ts` remains inactive in public UI and is retained in full backup. Guest/UI preferences are separate. `src/lib/db.ts` serves identities/platform facilities, not knowledge. See [protocol](../docs/DATA_SAFETY_PROTOCOL.md).
