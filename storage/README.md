# Storage Index

Leo Tree does not currently have a standalone `storage/` implementation directory. Active persistence code remains at its real source paths:

- Workspace storage adapter, load/save, and JSON export: `src/lib/knowledge-tree/storage.ts`
- Workspace migration and merge behavior: `src/lib/knowledge-tree/migrate.ts`
- Attachment metadata and IndexedDB blob operations: `src/lib/knowledge-tree/files.ts`
- Garden state: `src/lib/garden-store.ts`
- Guest marker: `src/lib/guest.ts`
- Shell-tab persistence: `src/components/kt/knowledge-app.tsx`
- Authentication/application data boundary: `src/lib/app-data/`, `src/lib/auth/`, and `src/lib/db.ts`

This index is intentionally non-duplicative. Review the actual files above for overwrite behavior, malformed-data handling, identity stability, migration safety, import semantics, and orphaned attachment risks.
