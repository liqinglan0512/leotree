# Curation Manifest

## Source

- Archive: `H8nHgGPEjrf4zYeA-grok-workspace.zip`
- SHA-256: `C0A153F8A7278FDAF8A45C66DABFE6E05521F69C74CCC16ADA862191FC65AD0C`
- Inventory before curation: 492 files, 108,277,158 uncompressed bytes

The source archive was path-checked before extraction. The original archive was not modified.

## Retained without source-code restructuring

- `src/`
- `public/`
- `scripts/`
- `server/`
- `migrations/`
- `.prettierrc`
- `eslint.config.mjs`
- `package.json`
- `package-lock.json`
- `startup.sh`
- `tsconfig.json`
- `vite.config.ts`

The three code/support directories not shown in the user's simplified target tree are retained because the package scripts, Vite configuration, database layer, and tests directly reference them.

## Added for review navigation

- `README.md`
- `PRODUCT_VISION.md`
- `ARCHITECTURE.md`
- `tests/README.md`
- `schemas/README.md`
- `storage/README.md`
- This curation manifest

These files describe the snapshot; they do not change application behavior.

## Textual evidence preserved

`docs/KNOWLEDGE_TREE_ENGINE_REPORT_PREEXISTING.md` is copied from the source archive's `artifacts/knowledge-tree-engine-report.md`. It is retained as historical context only. Its reported test results and implementation claims are **UNVERIFIED** in this packaging pass and must not substitute for repository inspection.

## Screenshot selection

| Curated name | Source capture | Reason |
|---|---|---|
| `screenshots/garden.png` | `screenshots/qa-grove.png` | Current mobile My Garden composition and bottom navigation |
| `screenshots/community.png` | `screenshots/qa-gardens.png` | Community header, search, cards, artwork, and bottom navigation |
| `screenshots/node.png` | `screenshots/qa-detail.png` | Dense node-detail and structural-operation state central to the audit |
| `screenshots/settings.png` | `screenshots/qa-settings-tab.png` | Current mobile settings hierarchy and account controls |

All four source captures are 390 × 844 PNG files. The other 92 items in the original `screenshots/` directory are omitted.

## Excluded groups

- `.grok/`: builder references, skills, and environment-specific material
- `.tanstack/`: generated framework state
- `.vercel/`: deployment output/cache
- `artifacts/imagine_images/` and other generated artifact output
- `attachments/`: raw prompt/input attachment material
- Original screenshot set except the four selections above
- `AGENTS.md`: environment-specific agent operating instructions, not product documentation
- `.node_modules.lock`: generated dependency marker
- `qa-boot-dbg.mjs`: ad hoc debugging helper

No matching `node_modules/`, `dist/`, `build/`, `coverage/`, `.git/`, `.cache/`, `tmp/`, `backups/`, or `*.log` content is included in the curated root.

## Important evidence boundary

This package is a curated review snapshot, not a claim that the repository builds or that existing tests pass. Packaging validation checks archive integrity, inclusion/exclusion rules, screenshot dimensions, and hashes. Runtime, UX, data-integrity, accessibility, and architecture conclusions remain the reviewer's job.
