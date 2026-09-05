# Schema index

- `src/lib/knowledge-tree/types.ts`: domain schema 3, tree-scoped node identity, history provenance.
- `validation.ts`: workspace/tree schema and graph checks; contiguous normalizable order.
- `migrate.ts`: deterministic v3/v2 candidates; malformed/future data never silently overwrites its source.
- `storage.ts`: envelope format 1 and revision; `backup.ts`: versioned manifest and hashes.
- `templates/`: blank and SNN seed data.
- `migrations/0001_auth.sql`: active auth migration. Matching original `migrations/auth/0001_auth.sql` remains the platform opt-in schema source; tests guard their roles.

Import/recovery validate before explicit commit. Ordinary content patches cannot change identity, hierarchy or status.
