# Schema Index

Leo Tree does not currently have a standalone `schemas/` implementation directory. This index preserves the requested review boundary without duplicating or relocating active code.

- Knowledge domain and schema version: `src/lib/knowledge-tree/types.ts`
- Runtime hydration/migration/merge logic: `src/lib/knowledge-tree/migrate.ts`
- Template shape and seed data: `src/lib/knowledge-tree/templates/`
- Attachment metadata type: `src/lib/knowledge-tree/files.ts`
- Authentication SQL: `migrations/0001_auth.sql`
- Opt-in authentication schema source: `migrations/auth/0001_auth.sql`

The two SQL files are byte-identical in this snapshot, but both original paths are retained because current scripts and tests assign them different roles. The audit should decide whether that contract is necessary and sufficiently guarded.
