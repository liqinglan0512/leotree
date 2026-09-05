# Leo Tree — Astra Review Snapshot

This archive is a curated, review-only snapshot of the current Leo Tree repository. It was prepared for a repository-wide Product / UX / Architecture audit. The source application code was copied without refactoring or feature changes.

The review instructions are supplied separately as `ASTRA_REVIEW_BRIEF.md`. The governing rule is: **audit first; do not implement until explicitly authorized.**

## What is included

- Product orientation: `PRODUCT_VISION.md`
- Architecture orientation: `ARCHITECTURE.md`
- Application source: `src/`
- Runtime public assets: `public/`
- Existing colocated tests plus a test index: `tests/README.md`
- Schema and migration index: `schemas/README.md`
- Persistence index: `storage/README.md`
- Pre-existing implementation report, clearly marked as unverified: `docs/`
- Four representative mobile screenshots: `screenshots/`
- The package manifest, TypeScript/Vite/ESLint/Prettier configuration, lockfile, and the scripts/server/migrations that those files actually reference

The simplified handoff layout requested `src/`, `public/`, `tests/`, `schemas/`, `storage/`, `docs/`, and `screenshots/`. A few additional root items are intentionally retained because omitting them would hide real architecture or make build and test commands misleading: `scripts/`, `server/`, `migrations/`, `vite.config.ts`, `eslint.config.mjs`, `.prettierrc`, `package-lock.json`, and `startup.sh`.

## What was excluded

- Dependency and build output directories such as `node_modules/`, `dist/`, `build/`, and `coverage/`
- `.grok/`, `.tanstack/`, `.vercel/`, cache/tmp/backup material, and repository metadata
- Generated artifact pools and raw prompt attachments
- Ad hoc debug files and lock markers
- 92 redundant or intermediate screenshots; only four representative screens remain

Runtime images under `public/theme/` are retained. They are referenced by the application and define the paper/ink/botanical visual system; they are not the discarded raw generation pool.

## Representative screenshots

- `screenshots/garden.png` — My Garden at a 390 × 844 mobile viewport
- `screenshots/community.png` — Community/search at a 390 × 844 mobile viewport
- `screenshots/node.png` — Node detail and structural controls at a 390 × 844 mobile viewport
- `screenshots/settings.png` — Settings at a 390 × 844 mobile viewport

## Review entry points

Start with:

1. `PRODUCT_VISION.md`
2. `ARCHITECTURE.md`
3. `src/lib/knowledge-tree/types.ts`
4. `src/lib/knowledge-tree/storage.ts`
5. `src/lib/knowledge-tree/migrate.ts`
6. `src/lib/knowledge-tree/engine.ts`
7. `src/components/kt/knowledge-app.tsx`
8. `src/components/kt/tree-page.tsx`
9. `src/styles.css`

## Local checks

No dependencies are bundled. In a disposable checkout with the required environment available:

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build:dev
```

Use `npm run build:dev` for a non-deploy build check. The repository's `npm run build` command also invokes `db:migrate`, so reviewers should inspect the environment and migration target before running it.

## Provenance

- Source archive: `H8nHgGPEjrf4zYeA-grok-workspace.zip`
- Source archive SHA-256: `C0A153F8A7278FDAF8A45C66DABFE6E05521F69C74CCC16ADA862191FC65AD0C`
- Source archive inventory: 492 files, 108,277,158 uncompressed bytes
- Curation date: 2026-09-05

See `docs/CURATION_MANIFEST.md` for the precise curation boundary and validation notes.
