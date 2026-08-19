I want to plan out a new epic: [describe the rough idea/capability here]. Here's roughly what I
want, in priority order (feel free to list this messily, it doesn't need to be structured):

[your list of wants, even if overlapping or vague]

Before you write anything: break this into separate workstreams if it's really more than one
thing, and propose an epic/phase split, reusing the existing structure and numbering in
docs/05_epics.md and docs/06_roadmap.md. Ask me about ordering, scope and dependencies wherever
it's ambiguous instead of guessing.

If I have a real supporting artifact for this (a past chat transcript, an example output, an
existing file showing how this currently works manually), I'll attach it — use it to find
concrete gaps by checking the real code, don't just take my description at face value. If I
haven't offered one, ask me if one exists before finalizing scope.

Verify every claim about what currently exists or is missing against the real codebase before
writing it into the epic — don't rely on docs or assumptions alone.

Once the epic/phase split is agreed: write the full epics/phases into docs/05_epics.md and
docs/06_roadmap.md for the whole plan. Then, for the *first* phase only, run `.claude/skills/prd`
to write a PRD for it, `.claude/skills/plan` to break that PRD into implementation phases, and
`.claude/skills/issues` to create the resulting milestones/issues on GitHub (source of truth per
ADR-030 — do NOT write TASK-XXX entries into docs/07_task_backlog.md, that file is frozen
historical record). Leave later phases at the epic/phase level until we actually get to them —
don't run PRD/plan/issues for phases we're not starting yet.

Before calling the breakdown finished: cross-check the resulting GitHub issues against any real
supporting artifact I gave you — walk through it action by action and confirm every action maps to
an issue, not just the obvious happy-path ones.

Add a final issue whose only job is to manually verify real flow variants (not just the one path
we designed around) against the finished result, and file new follow-up issues for anything that
doesn't work — don't quietly patch gaps found late inside an already-scoped issue.
