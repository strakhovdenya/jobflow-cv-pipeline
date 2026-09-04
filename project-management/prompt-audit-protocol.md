# Prompt Audit Protocol

A reusable procedure for auditing `apps/api/prisma/prompts/prompt2_v6.txt` (and, with the obvious
substitutions, prompt 1/3/5). Written after the ISSUE-278 calibration rounds, where five
consecutive full passes each found real defects — because each pass used a *different* angle. A
sixth pass repeating an earlier angle would have found nothing.

Use it by pasting the "Audit prompt" section below into a session that has the prompt file and
`apps/api/knowledge-sources/` available.

---

## Why this exists

Three failure modes made naive review useless on this file:

1. **The external evaluator is not a source of truth.** The comparison reports scoring CV B against
   CV A are produced by an LLM that has never seen `knowledge-sources/`. It repeatedly demanded
   claims the sources explicitly prohibit (BullMQ, a 2x+ SQL metric) and once demanded a factual
   error (`CSV/ZIP` → `CSV/GZIP`, where every source says ZIP and the string GZIP appears nowhere).
   Three of four "mandatory" fixes in one round were regressions. Acting on a report without
   grepping the sources first will lower quality while appearing to raise it.
2. **The prompt is long and self-referential.** Rules cross-reference each other, so a correct local
   edit routinely contradicts a rule 80 lines away, or leaves a dangling permission the new rule
   revoked. Every round must end with a whole-file re-read.
3. **Your own edits are the highest-yield defect source.** In the final pass, three of three
   defects found were introduced by the auditor in earlier passes — including a rule that would
   have cut exactly the content the vacancy most rewarded. Never close an audit without an
   adversarial pass over your own recent changes.

---

## Standing rules

- **Never seed to the database without explicit permission.** Editing the prompt file and seeding
  are separate acts; git and the DB diverge until seeded, and that is deliberate.
- **Fact-check before fixing.** Before acting on any finding that says "add", "strengthen" or
  "claim more", grep `apps/api/knowledge-sources/` for the term and read the surrounding sentence
  and heading. A hit inside a `do not claim` / `what not to quantify` / `future design target` /
  `needs evidence` / `open question` passage is a prohibition, not evidence.
- **Small, attributable batches.** A round of five rules once produced an unexplainable regression
  that had to be reverted wholesale because no single rule could be blamed. Prefer 2–4 changes per
  round, each independently attributable.
- **State the trade-off.** Any change that adds content, length or constraint must say what it
  could cost, and which existing metric it must not damage.

---

## Audit prompt

> You are auditing `apps/api/prisma/prompts/prompt2_v6.txt`. Read the entire file before forming
> any conclusion — not excerpts. Then work through the angles below.
>
> Pick the angles that have **not** been used in recent rounds; re-running a spent angle produces
> confident-sounding noise. State at the top which angle(s) you are running and why.
>
> For every candidate finding, produce: the line, what the prompt currently causes, the concrete
> evidence it is a defect (a source quote, a contradicting line number, or an observed output), and
> the score consequence. Discard anything you cannot evidence — "could be phrased better" is not a
> finding. Do not edit anything until the full list is presented and approved.

### Angle A — Findings vs. sources

For each claim in the latest comparison reports and each correction in the latest
`03_pre_pdf_check.json`: grep the knowledge sources and decide whether the generator was **wrong**
or **right and the evaluator was wrong**. Report both categories. A report demanding a claim the
sources prohibit is itself the finding, and the correct action is no change.

### Angle B — Internal contradictions and impossible instructions

Look for rules that cannot all hold at once. Signatures seen in practice:

- **Arithmetic that does not close.** A block required to hold 4–5 bullets, an inventory of exactly
  four items, and a rule permitting one to be dropped. The permission was unreachable, and the
  model resolved it by always keeping the low-value item.
- **A dead permission left behind by a later rule.** One section still allowed what another had
  since forbidden.
- **A constraint with no resolution path.** "If two bullets describe the same project, merge them"
  — merging freed a slot, the block had a floor, and nothing said what refills it.

For each: trace the arithmetic explicitly and name every line that states the same constraint, so
they can be checked against each other.

### Angle C — Contract field coverage

Walk the JSON contract at the top of the file field by field, including nested ones. For each,
find the rule that tells the model how to set it. Fields found undefined in practice:
`rendering_hints.density`, `experience[].can_split_across_pages`, `bullets[].risk_level`,
`target_strategy.positioning`, `target_strategy.risk_mitigation`, `evidence_table` granularity,
`selected_projects[].safe_label`. An undefined field is filled arbitrarily; where it controls
layout, that is a silent quality loss. Check the renderer
(`src/document-export/cv-template-renderer.ts`) for what a field actually does rather than guessing.

### Angle D — Hardcoded facts vs. sources

The prompt hardcodes employment history, role titles, dates, the current-work inventory, project
descriptions and stacks, `stable_intro`, and language levels. Every one is inherited by every CV,
so an error here is systematic. Verify each against `knowledge-sources/` verbatim. Also check
**formatting consistency** across hardcoded values — a hyphen in one date range and an en dash in
another renders as visibly inconsistent typography in the same document.

### Angle E — Cross-prompt collision

Read prompt 2 against prompt 3's banned-phrasing lists. Prompt 2 once described three JobFlow
facets in wording that collapsed directly into three of prompt 3's sixteen forbidden patterns — so
prompt 2 systematically generated what prompt 3 was obliged to strip, wasting the slot. Ask, for
each descriptive block in prompt 2: if a model compressed this into CV prose, would prompt 3 flag
it? Also check the reverse: does prompt 3 have authority to rewrite a field prompt 2 declares
fixed or factual (`stable_intro`, `company`/`role`/`dates`)?

### Angle F — Adversarial pass on recent edits

Take every change made in the last few rounds and argue against it. Specifically:

- Does this rule fire in **almost every run**? If a lever meant for exceptional cases triggers
  universally, it is now the default and will damage whatever it trades against.
- Does it cut something that is currently **winning** a metric? Cross-check against the per-criterion
  scores in the comparison reports before removing or de-prioritizing any content.
- Does bullet-slot logic leak somewhere it does not belong? Scarcity reasoning is correct for
  bullets and wrong for third-party corroboration and for evidence-backed technology lists.
- Did a new sentence assert a capability that no source supports?

### Angle G — Structure and attention

- Paragraphs over ~1500 characters carrying several distinct rules — split them; a buried rule is a
  rule that does not fire.
- Insertions that merged into a neighbouring paragraph, or that orphaned an example so it now reads
  as an example of the wrong thing.
- The same constraint restated in many places: acceptable where each restatement sits at a point of
  application, a problem when the wordings have drifted apart.

---

## Closing a round

1. Re-read the whole file top to bottom for contradictions introduced by this round's edits.
2. Grep for the phrases the round was meant to eliminate, to confirm none survive.
3. Confirm no code or fixture depends on a hardcoded string that changed
   (`grep -rn "<string>" --include=*.ts src test prisma`).
4. Report what changed, what it could cost, and what is knowingly left unfixed.
5. Ask before seeding.
