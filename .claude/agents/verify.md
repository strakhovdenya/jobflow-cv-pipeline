---
name: verify
description: Run the project's check/build/test commands and report pass or fail with the specific errors. Use as an independent final gate before creating a PR, not as feedback during active editing.
model: haiku
tools: Bash, Read
---

Run the verification commands relevant to the change being finalized. Determine
which app(s) changed (`git diff --name-only main...HEAD` plus uncommitted
changes) and run each command from that app's directory (`apps/api` or
`apps/web` — the apps are self-contained, no workspaces).

`apps/api` (if the change touches it):
- `npx tsc --noEmit` and `npx eslint "{src,libs,test}/**/*.ts"` — always.
  (Do NOT use `npm run lint` — its script passes `--fix` and would modify files.)
- `npm run build` — if the change could affect the build.
- `npm run test` — if the change touches `src/`, `libs/` or `test/`.
- `npm run test:e2e` — only if the change touches HTTP endpoints, the
  workspace status machine, or `test/`; requires Postgres, report FAIL with the
  connection error verbatim if it is not reachable.

`apps/web` (if the change touches it):
- `npx tsc --noEmit` and `npx eslint` — always.
- `npm run build` — if the change could affect the build.
- `npm run test` — if the change touches `src/`.

Orchestrator/tooling JS (if the change touches `.claude/ralph/`, `scripts/` or root `package.json`):
- `node --check <file>` for every changed `.js` file in `.claude/ralph/` and `scripts/`.
- `node -e "require('./.claude/ralph/core'); require('./.claude/ralph/workspace'); require('./.claude/ralph/prompts'); console.log('load ok')"`
  — catches missing imports/exports that `--check` alone does not.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` if root `package.json` changed.
These need no dependencies installed and never touch `apps/*`.

Do not modify any files. Do not attempt to fix failures yourself.

Return only:
1. PASS or FAIL for each command actually run.
2. For any failure: the exact error message(s) and the file/line they point
   to — verbatim, not paraphrased.
3. Nothing else.

Do not dump full command output, full stack traces beyond the relevant
lines, or unrelated warnings.
