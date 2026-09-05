# Leo Tree — Current Architecture Map

This is an orientation map for audit work, not a favorable architecture verdict. Claims below point to files included in this snapshot. Where behavior has not been executed during packaging, it should be treated as source-inspected rather than runtime-verified.

## Application shell and routes

- `src/routes/index.tsx` renders the main Leo Tree application.
- `src/components/kt/knowledge-app.tsx` owns the main workspace state, shell navigation, import/export flows, review/log screens, and persistence commits.
- `src/components/kt/grove.tsx`, `community.tsx`, and `settings.tsx` implement the three bottom-navigation product areas.
- `src/components/kt/tree-page.tsx` implements the knowledge-tree and node experience.
- `src/components/kt/dock.tsx` implements the floating bottom navigation.
- `src/styles.css` contains the shared visual and responsive system.

## Knowledge-tree domain

The primary domain code is under `src/lib/knowledge-tree/`:

| Concern | Evidence |
|---|---|
| Domain types and schema constants | `types.ts` |
| Tree/workspace factories and labels | `factory.ts` |
| Tree, section, node, review, and log operations | `engine.ts` |
| Parent/child traversal and cycle checks | `tree.ts` |
| Progress and review calculations | `progress.ts` |
| Version migration and import merging | `migrate.ts` |
| Storage adapters and JSON import/export | `storage.ts` |
| Attachment metadata and IndexedDB blobs | `files.ts` |
| Stable domain-facing export surface | `api.ts` |
| Blank and SNN templates | `templates/` |

The source declares `SCHEMA_VERSION = 3` and uses `knowledge-tree-workspace-v3` as the current workspace storage key. Prior v2 keys are enumerated in `types.ts`; migration behavior is implemented in `migrate.ts` and exercised in colocated tests.

## Persistence boundaries

There are several persistence mechanisms to audit separately:

- Knowledge workspace JSON: `src/lib/knowledge-tree/storage.ts` using a `StorageAdapter`, with localStorage as the default adapter.
- Attachment blobs: `src/lib/knowledge-tree/files.ts` using IndexedDB database `leo-tree-files-v1`.
- Garden/community-facing local state: `src/lib/garden-store.ts` using localStorage.
- Guest and shell UI flags: `src/lib/guest.ts` and `src/components/kt/knowledge-app.tsx` using localStorage.
- Authentication/application data: `src/lib/auth/`, `src/lib/app-data/`, `src/lib/db.ts`, and SQL under `migrations/`.

The audit should verify whether these boundaries form one coherent product data lifecycle, especially during import, migration, reset, delete, and sign-in transitions.

## UI-to-domain flow

The intended flow is:

```text
React routes and components
        ↓
knowledge-tree engine / helpers
        ↓
storage adapter and migration layer
        ↓
localStorage / IndexedDB
```

`src/lib/knowledge-tree/api.ts` exposes domain and persistence operations intended to be callable without scraping the DOM. The review should verify how consistently current UI code uses this boundary and whether important business logic remains embedded in component event handlers.

## Build and platform layer

- Framework/runtime: React 19, TanStack Start/Router, Vite, Nitro, Tailwind CSS, and TypeScript.
- `vite.config.ts` imports utilities from `scripts/` and registers application/platform middleware.
- `server/middleware/grok-pwa.ts` and `public/__grok/` support the current PWA/container environment.
- `src/lib/db.ts` and `scripts/migrate.mjs` consume SQL under `migrations/`.

These platform files were kept because removing them would conceal real coupling. They may be product-essential, environment-essential, stale scaffolding, or some mixture; that is a review question, not a packaging assumption.

## Test topology

Tests are colocated with the code they exercise and also live under `scripts/`. They were not moved because moving them would alter imports and package scripts. See `tests/README.md` for the inventory.

## Visual assets

The production visual system is under `public/theme/` and is referenced directly by CSS and components. Four representative rendered screens are in `screenshots/`. Raw generation pools and intermediate QA captures are intentionally absent.
