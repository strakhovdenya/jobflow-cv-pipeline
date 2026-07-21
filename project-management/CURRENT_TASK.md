# Current Task

## TASK-072 — Manual verification pass: real historical flow variants against the new UI

Status: **done** — the project owner supplied and closed 4 flow variants (2026-07-21); see
`## Flow Variants Checked` below and `project-management/TEST_LOG.md`.

## Context

TASK-063 through TASK-071 wired up every pipeline/lifecycle action individually (pipeline
step triggers, async analysis polling, Prompt 3/5 checks, cover letter, application
tracking/rejection, existing-folder import), but none of them alone proves that a real
*end-to-end variant* the project owner actually used in the manual ChatGPT workflow — not
just the one happy path (apply → analyze → draft → export) — works correctly through the new
`apps/web` UI. This task is a manual verification/parity pass across Phase 15 as a whole, not
a new feature. No code changes are expected as part of this task itself.

## Docs to Read

- `docs/07_task_backlog.md` — TASK-072 section (Context/Acceptance criteria/Test
  requirement/Done definition) and the TASK-063 through TASK-071 sections above it — the full
  set of actions this pass exercises.
- `project-management/TEST_LOG.md` — existing manual-test entry format to match (see the
  TASK-005/TASK-059 persistence-check entries, and the TASK-063 through TASK-071 entries, for
  the expected level of detail).
- `project-management/TASK_BOARD.md` "Current Focus" section — narrative summary of what each
  of TASK-063 through TASK-071 actually built, useful context for knowing which screen/button
  maps to which flow step.

## Verification Method

The project owner will paste the full text of a real past ChatGPT project chat (one flow
variant per chat) into the conversation, one at a time. For each one:

1. Claude Code reads the pasted chat text and approximates which real sequence of decisions/
   actions it represents (e.g. "vacancy analyzed → maybe → CV drafted → pre-PDF check →
   export → applied → rejected with feedback").
2. Claude Code maps that sequence onto the actual `apps/web` UI/backend as it exists today,
   and narrates it step by step to the project owner: which screen to be on, which button to
   press, and what result/state they should expect to see after each step.
3. The project owner drives the real UI by hand following that narration (against a real
   running `apps/api` backend) and reports back what actually happened at each step.
4. Any mismatch between "what the narration said should happen" and "what the UI/backend
   actually did" is a finding. Findings are collected as they occur during the session (not
   fixed inline mid-pass) and, once the pass for that chat is done, each one is either:
   - recorded as a passed step in `project-management/TEST_LOG.md` if everything matched, or
   - filed as its own new backlog task in `docs/07_task_backlog.md` +
     `project-management/TASK_BOARD.md` if a real gap was found — per the Key Invariant below.

This repeats for each pasted chat until the project owner has no more flow variants to supply.

## Flow Variants Checked

- [x] **Flow 1 — "Hired — Fullstack Developer"** (apply happy path + pre-PDF check): PASS, no
      gaps found. See `project-management/TEST_LOG.md` 2026-07-21 TASK-072 "Flow variant 1" entry
      for the full step-by-step screen/action/expected/observed table — reusable as a QA script
      after TASK-073's redesign. One environment note (not a gap): the fake AI provider can't
      recommend "maybe"/"skip" on Prompt 1, so "Approve (maybe)" was untestable and "Approve
      (apply)" was substituted.
- [x] **Flow 2 — "6037 — Senior Back-End Engineer"** (skip via human override): PASS, no gaps
      found. See `project-management/TEST_LOG.md` 2026-07-21 TASK-072 "Flow variant 2" entry.
      Also newly confirms the ADR-022 `confirm-skip` seeding gap is fixed in practice (real
      backend, not just unit tests).
- [x] **Flow 3 — "Monpay — Fullstack Engineer"** (maybe → CV → pre-PDF check → export → cover
      letter): PASS overall, **1 finding filed as TASK-074** (final check becomes permanently
      unreachable once cover letter is generated first — asymmetric status guard between Prompt 5
      and cover letter). See `project-management/TEST_LOG.md` 2026-07-21 TASK-072 "Flow variant 3"
      entry.
- [x] **Flow 4 — "SME Careers — Full Stack Engineer"** (maybe → CV → pre-PDF check → export →
      final check): PASS, no new gaps found. Confirms the correct ordering (final check before
      cover letter) works, complementing Flow 3's TASK-074 finding about the reverse order. See
      `project-management/TEST_LOG.md` 2026-07-21 TASK-072 "Flow variant 4" entry.
Project owner confirmed no further flow variants for this pass (2026-07-21) — 4 total.

All 4 test workspaces (DB rows + `storage/applications/` folders) cleaned up on 2026-07-21.

## Key Invariants

- This task *is* the test — no source code is expected to change. A recorded manual pass in
  `project-management/TEST_LOG.md` covering every variant checked is the deliverable.
- Every gap found is filed as its own new backlog task (not fixed inline as a scope-creep
  patch inside this one) — consistent with how TASK-060's README fixes and TASK-057's CodeQL
  finding were each handled as their own explicit, scoped items.

## Acceptance Criteria

- [x] The project owner has supplied a list of real historical flow variants to check (4,
      supplied incrementally as pasted chat transcripts).
- [x] Each listed variant is driven for real through the `apps/web` UI end-to-end and its
      outcome recorded (pass, or a specific gap found) — see `TEST_LOG.md` entries for Flows 1-4.
- [x] Every gap found is filed as its own new backlog task, not fixed inline — TASK-074 filed
      for Flow 3's finding.

## Test Requirement

This task *is* the test — a recorded manual pass in `project-management/TEST_LOG.md` covering
every variant checked, with notes where useful, is the deliverable.

## Done Definition

Every flow variant the project owner identifies has been driven through the real UI at least
once, with the result (pass or filed gap) recorded in `TEST_LOG.md`.

## Git Instructions

Likely no code changes, so likely no commit — but if a doc-only follow-up (e.g. `TEST_LOG.md`
entry, or new backlog tasks filed for gaps) needs to land, use the standard order:

1. `git add <files>`
2. `git commit -m "docs: TASK-072 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
