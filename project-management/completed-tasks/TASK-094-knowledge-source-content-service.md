# Current Task

## TASK-094 — Add KnowledgeSourceContentService: real content loading with hash verification

**Status:** DONE
**Branch:** `task/TASK-094-knowledge-source-content-service`
**Epic:** EPIC-23 (Phase 16), first task — see `docs/07_task_backlog.md`.

### Context

`PromptInputBuilderService`, `Prompt2InputBuilderService`, and `CoverLetterInputBuilderService` all
currently emit `[content not loaded in MVP]` instead of a knowledge source's real file content
(confirmed at `prompt-input-builder.service.ts:62`, `prompt2-input-builder.service.ts:102`,
`cover-letter-input-builder.service.ts:91`). This task builds the shared foundation service the
three input builders will consume in TASK-095/096/097 — it does **not** touch the input builders
itself.

`KnowledgeSource.filePath` is already an absolute path outside `STORAGE_ROOT` (confirmed in
`register-knowledge-sources.ts:80`, which joins `KNOWLEDGE_SOURCES_ROOT` + a relative path once, at
registration time, and stores the resulting absolute path). `ArtifactStorageService.readFile()`
cannot be reused because it hard-enforces the path is inside `STORAGE_ROOT`
(`assertInsideStorageRoot`) — a different root. This task adds an equivalent, separately-rooted
containment check rather than overloading `ArtifactStorageService` with a second root concept
(keeps `ArtifactStorageService`'s single responsibility — `STORAGE_ROOT` only — matching ADR-017
point 6).

Of the 9 currently-registered knowledge sources (`register-knowledge-sources.ts`), 8 are `.md` and
1 (`sourceType: layout`, `CV_Layout_Reference_EN_2026-06.pdf`) is a real binary PDF. Per the project
owner's decision: binary/non-text sources get a metadata-only stub in the returned content, not
decoded bytes — no PDF-parsing dependency is introduced.

**Found during a post-planning audit (2026-08-06), corrected here before implementation starts:**
making `KNOWLEDGE_SOURCES_ROOT` a hard-required env var is not a self-contained change — three
other places already assume it's absent/optional and must be updated in the same task, or this
task's own PR breaks CI on landing:

- `apps/api/.env.example:19` **already** documents `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources` as
  `# Optional: root path for knowledge source content files (default: ./knowledge-sources)` — this
  task must correct that comment to `# Required`, not just "document" it as if it were new.
- `.github/workflows/ci.yml`'s `docker-build` job (a required branch-protection check, ADR-025) only
  passes `DATABASE_URL`/`STORAGE_ROOT`/`API_KEY`/`NODE_ENV`/`PORT` to `docker run -e ...` — once
  `KNOWLEDGE_SOURCES_ROOT` is Joi-required, the container fails env validation at boot and the
  "Wait for /health" step times out, failing this required check.
- The `test`, `test-e2e`, and `docker-build` jobs' job-level `env:` blocks in `ci.yml`, and all
  three e2e spec files (`test/mvp-flow.e2e-spec.ts`, `test/rate-limiting.e2e-spec.ts`,
  `test/skip-flow.e2e-spec.ts`, each setting `process.env.STORAGE_ROOT` before bootstrapping the
  app) never set `KNOWLEDGE_SOURCES_ROOT` — app bootstrap will fail Joi validation the same way.

### Files Affected

```text
apps/api/src/knowledge-sources/knowledge-source-content.service.ts       (new)
apps/api/src/knowledge-sources/knowledge-source-content.service.spec.ts  (new)
apps/api/src/knowledge-sources/knowledge-sources.module.ts               (register + export new provider)
apps/api/src/config/env.validation.ts                                    (add KNOWLEDGE_SOURCES_ROOT)
apps/api/src/config/env.validation.spec.ts                               (cover new required var)
apps/api/.env.example                                                    (correct existing entry: optional -> required)
.github/workflows/ci.yml                                                 (add KNOWLEDGE_SOURCES_ROOT to test/test-e2e/docker-build env: blocks and docker-build's docker run -e)
apps/api/test/mvp-flow.e2e-spec.ts                                       (set process.env.KNOWLEDGE_SOURCES_ROOT before bootstrap)
apps/api/test/rate-limiting.e2e-spec.ts                                  (same)
apps/api/test/skip-flow.e2e-spec.ts                                      (same)
apps/api/CLAUDE.md                                                       (add KNOWLEDGE_SOURCES_ROOT to the "Интеграции и зависимости" env-var list)
```

### Docs to Read

- `apps/api/src/artifacts/hash.service.ts` — `hashText()`/`hashFile()` signatures to reuse (do not
  reimplement hashing).
- `apps/api/src/artifacts/artifact-storage.service.ts` lines 1–20, 62–75 — `assertInsideStorageRoot`
  pattern to mirror for a second, independent root.
- `apps/api/src/knowledge-sources/knowledge-sources.service.ts` — `KnowledgeSource` shape
  (`filePath`, `sourceType`, `contentHash`, `versionLabel`, `isActive`) and `findActive()`.
- `apps/api/src/knowledge-sources/knowledge-source-selection.service.ts` — `selectForStep()`'s
  return shape; this is what callers will pass into the new service in later tasks.
- `apps/api/scripts/register-knowledge-sources.ts` lines 1–74 — confirms `filePath` is already
  absolute, the current `KNOWLEDGE_SOURCES_ROOT` default-path fallback logic (do not replicate the
  fallback in app runtime config — see Key Invariants), and the full list of 9 registered
  sources/types including the one binary `layout` entry.
- `apps/api/src/config/env.validation.ts` — existing Joi pattern for `STORAGE_ROOT` (required) to
  mirror for `KNOWLEDGE_SOURCES_ROOT`.

### Key Invariants

- `KnowledgeSource.filePath` is already absolute (per `register-knowledge-sources.ts`) — do not
  re-join it with `KNOWLEDGE_SOURCES_ROOT`. Still validate it resolves inside
  `KNOWLEDGE_SOURCES_ROOT` before reading (path-safety, same principle as `ArtifactStorageService`,
  root `CLAUDE.md`'s "Filesystem root must never be escaped" — applied here to the second root).
- `KNOWLEDGE_SOURCES_ROOT` is a new **required** env var (Joi `.required()`, matching
  `STORAGE_ROOT`'s pattern) — no silent relative-path fallback like the standalone script has; the
  running app must fail fast at boot if it's unset, not guess a path.
- Do not modify `PromptInputBuilderService`, `Prompt2InputBuilderService`, or
  `CoverLetterInputBuilderService` in this task — they are separate follow-up tasks
  (TASK-095/096/097) that consume this service once merged.
- Do not add a PDF-parsing dependency — binary handling is a metadata-only stub per the project
  owner's decision, not text extraction.
- Reuse `HashService.hashText()` for the on-disk-content-vs-`contentHash` comparison — do not
  hand-roll a second SHA-256 call.

### Acceptance Criteria

- [x] `KNOWLEDGE_SOURCES_ROOT` is added to `env.validation.ts` as a required string; `.env.example`'s
      existing entry is corrected from "Optional ... (default: ...)" to "Required", not merely
      re-documented as if new.
- [x] `.github/workflows/ci.yml`'s `docker-build` job's `docker run -e ...` block and all three
      `test`/`test-e2e`/`docker-build` job `env:` blocks pass a `KNOWLEDGE_SOURCES_ROOT` value; all
      three `test/*.e2e-spec.ts` files set `process.env.KNOWLEDGE_SOURCES_ROOT` before app
      bootstrap, mirroring their existing `process.env.STORAGE_ROOT` setup.
- [x] New `KnowledgeSourceContentService.loadContent(sources: KnowledgeSource[]):
      Promise<KnowledgeSourceContentEntry[]>`, where each entry carries `{ id, sourceType, filePath,
      versionLabel }` plus either `{ contentAvailable: true, content: string }` or
      `{ contentAvailable: false, unavailableReason: string }`.
- [x] For every source whose `filePath` extension is `.md` or `.txt`: reads the file, computes
      `HashService.hashText(fileContent)`, and compares against `ks.contentHash`.
- [x] On any hash mismatch: the whole call throws `BadRequestException` naming the offending
      source's `sourceType`/`filePath` and both the expected and actual hash — no partial/successful
      result is returned when any source fails verification.
- [x] For every source whose `filePath` extension is `.pdf` (or any other non-`.md`/`.txt`
      extension): returns `{ contentAvailable: false, unavailableReason: ... }` — no exception, no
      attempt to decode/hash binary bytes as UTF-8 text.
- [x] A path outside `KNOWLEDGE_SOURCES_ROOT` throws (mirrors `ArtifactStorageService`'s
      path-traversal guard) rather than silently reading it.
- [x] An empty `sources` array returns `[]` without touching the filesystem.

### Test Requirement

- `knowledge-source-content.service.spec.ts` using a real temp directory fixture (mirroring
  `artifact-storage.service.spec.ts`'s `tmpDir` pattern — never touch the real
  `apps/api/knowledge-sources/` folder from a test), covering:
  - a `.md` fixture with a matching hash loads real content;
  - a `.md` fixture whose on-disk content was changed after the `contentHash` was computed (stale
    hash) throws `BadRequestException`;
  - a `.pdf`-extension fixture (dummy bytes, extension is all that matters for this check) returns
    a content-unavailable stub, not an exception;
  - a `filePath` resolving outside the temp root throws;
  - `loadContent([])` resolves to `[]`.
- `env.validation.spec.ts` gains a case asserting `KNOWLEDGE_SOURCES_ROOT` is required (mirrors the
  existing `STORAGE_ROOT` required-var test).

### Done Definition

`KnowledgeSourceContentService` is injectable, fully unit-tested, and exported from
`KnowledgeSourcesModule`, ready for TASK-095/096/097 to consume — but nothing calls it yet in this
task. `npx tsc --noEmit`, `npm run lint`, `npm run test`, and `npm run test:e2e` all green (the e2e
run is the only thing that actually proves the new required env var doesn't break app bootstrap —
unit tests alone would not catch this). A CI run on this task's own PR shows `docker-build`/
`test-e2e` passing, not just unit tests.

### Progress Notes

Implementation matched this spec as planned, with one modeling detail not spelled out above:
`KnowledgeSourceContentEntry` is a discriminated union (`{ contentAvailable: true; content: string
} | { contentAvailable: false; unavailableReason: string }` intersected with the shared `{ id,
sourceType, filePath, versionLabel }` base) rather than one interface with both fields optional —
this gives TypeScript-level exhaustiveness on `contentAvailable` for callers in TASK-095/096/097,
which the AC's plain-English shape description didn't rule out either way. `HashService` is
injected via `ArtifactsModule`'s existing export (already imported by `KnowledgeSourcesModule`) —
no new module wiring beyond registering the new service itself was needed.

Two post-implementation review findings (from `/code-review` and an independent
`/requesting-code-review` subagent pass, both run before commit) were fixed before closing this
task: `assertInsideKnowledgeSourcesRoot` originally threw a raw `Error` for the path-traversal
guard (mirroring `ArtifactStorageService`'s existing pattern literally) — changed to
`BadRequestException` per `apps/api/CLAUDE.md`'s error-handling rule, since this is new code with
no reason to carry the older file's convention gap forward; the traversal test now also asserts
the exception type, not just the message. Separately, `CURRENT_TASK.md` was originally left
holding the full TASK-094 spec with only its status line changed instead of being reset to "no
active task" — `/requesting-code-review` caught this as a real gap against the project's own Task
Closure Checklist; fixed by resetting it to the short pointer form used by prior task closures
(e.g. TASK-093).

### Dependencies

None upstream (first task of EPIC-23). Downstream: TASK-095 (Prompt 1 input builder), TASK-096
(Prompt 2 input builder), TASK-097 (cover-letter input builder) all require this task merged first —
each will inject `KnowledgeSourceContentService` and replace their own
`[content not loaded in MVP]` line.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-094 ..."`
3. `git push -u origin task/TASK-094-knowledge-source-content-service`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not select the next task automatically.
