# CV Template Block Rules — Flexible Renderer MVP

## Purpose

This document defines which CV blocks are required, optional or conditional, how priorities work, and how the renderer should handle page breaks and overflow.

The rules are for deterministic HTML/PDF rendering from approved `02_targeted_cv_content.json`.

## Core Rule

```text
Prompt 2 decides content.
Renderer decides placement.
Renderer does not rewrite content.
```

Prompt 2 decides:

```text
bullet count
exact bullet wording
selected project inclusion
certification inclusion
section priority
bullet priority
layout density hints
```

Renderer decides:

```text
column placement
page breaks
orphan heading prevention
conditional hiding only when instructed by Prompt 2 priorities
```

Renderer must not:

```text
invent bullets
rewrite bullets
summarize bullets
decide project relevance
move personal/current projects into commercial experience
add unsupported claims to fill space
```

## Required Blocks

Required blocks must exist in valid CV content.

```text
candidate_name
contact
location
work_authorization
target_headline
summary
professional_experience
top_skills
education
languages
```

If a required block is missing, schema validation or CV draft review should fail before export.

## Optional Blocks

Optional blocks render only when Prompt 2 includes content and marks them for inclusion.

```text
selected_projects
certifications
links
volunteering
additional_technical_context
```

`current_work_block` is conditional / normally included for external CVs after May 2025 unless the user explicitly requests a legacy/no-current-work CV. It is still rendered only from approved Prompt 2 content; the renderer must not create it by itself.

Absent optional blocks are hidden completely. No empty placeholders.

## Conditional Blocks

### Current Independent Work & Portfolio Projects

Render `current_work_block` before Professional Experience when Prompt 2 includes it. This block is semi-fixed and is used to close the May 2025-Present post-EPAM timeline gap without turning portfolio/personal evidence into commercial production employment.

Rules:

```text
- Header, role line, dates and stable intro stay consistent across CVs.
- Prompt 2 may adapt only 1-2 bullets for vacancy relevance.
- Keep 4-5 bullets total unless the user explicitly approves a longer general CV.
- EPAM remains the primary commercial production evidence.
- JobFlow may be included inside this block as current portfolio evidence.
- Volunteering may be rendered as its own bullet inside this block.
- If volunteering is already included here, do not render a duplicate bottom volunteering section.
- Do not claim commercial production experience for JobFlow, NestJS, Python/FastAPI or OpenAI API.
```

`current_work_block` is not the same as `selected_projects`: it is a timeline/context block. `selected_projects` are additional role-relevant project cards and may be hidden when not needed.

### Selected Projects

Render only when Prompt 2 includes at least one project with:

```text
include: true
project_type: personal_project | current_personal_project | portfolio_project
safe_label present
relevance_reason present
```

Selected projects must be visually separate from professional experience.

Projects are useful when they support role fit, for example:

```text
AI-assisted tooling
OpenAI / LLM / FastAPI relevance
backend architecture
PostgreSQL / Prisma relevance
automation or document generation workflows
product/startup ownership signal
```

Hide projects when Prompt 2 marks them as not relevant or lower priority than commercial experience.

### Certifications

Render when role-relevant or when there is enough space.

Priority examples:

```text
high: directly relevant cloud/backend/AI certification
medium: generally useful engineering certification
low: unrelated or weak relevance
```

### Volunteering

Render only if Prompt 2 marks it relevant to local/Germany signal or there is available space.

Volunteering should stay compact.

### Links

Render links only when provided and useful:

```text
LinkedIn usually yes
GitHub only if relevant and clean
portfolio only if polished and role-relevant
```

## Priority Model

Each section should support:

```text
priority: required | high | medium | low | hide_if_no_space
```

Each experience bullet should support:

```text
priority: high | medium | low
```

Each selected project should support:

```text
include: boolean
project_type
safe_label
relevance_reason
display_priority: high | medium | low | hide_if_no_space
```

## Hide-if-no-space Order

If content does not fit the target page count, reduce in this order:

```text
1. Hide standalone volunteering if it is duplicated inside current_work_block.
2. Hide low-priority certifications.
3. Hide low-priority links or additional technical context.
4. Hide selected projects marked hide_if_no_space.
5. Hide low-priority selected project bullets.
6. Hide low-priority Factor-IT bullets.
7. Hide low-priority EPAM bullets.
8. Switch to compact density.
9. Allow page 3 only if Prompt 2 marks the role as strong match and the extra evidence is high value.
```

The renderer may hide whole low-priority optional blocks or bullets only when Prompt 2 provided explicit priorities. It must not rewrite remaining text.

## Page-Break Behavior

### General Rules

Avoid orphan headings.

```text
A section heading must not appear at the bottom of a page without content.
```

Avoid isolated job headers.

```text
A company header must stay with at least two bullets when possible.
```

### Professional Experience

EPAM may split across pages because it is the largest and strongest commercial experience block.

If split, render a continuation label:

```text
EPAM Systems — continued
```

Factor-IT should normally stay together unless Prompt 2 output is unusually long.

CHI should be compact and usually not split.

### Selected Projects

A selected project card should stay together when possible.

If a project does not fit and has lower priority, hide it rather than splitting it awkwardly.

### Left Column

The left column can differ by page.

Page 1 preferred:

```text
Contact
Work Authorization
Top Skills
Languages
```

Page 2 preferred:

```text
Certifications
Links
Optional compact tech focus
```

If a left-column optional block is absent, collapse it. Do not render decorative filler.

## Recommended Schema Fields for Renderer

The renderer should expect structured content similar to:

```json
{
  "layout_mode": "normal",
  "page_target": 2,
  "candidate": {
    "name": "Denys Strakhov",
    "contact": {},
    "location": "Cologne, Germany",
    "work_authorization": "Eligible to work in Germany"
  },
  "headline": "Backend Developer | Node.js | TypeScript | REST APIs",
  "summary": [],
  "top_skills": [],
  "current_work_block": {},
  "experience": [],
  "selected_projects": [],
  "education": [],
  "certifications": [],
  "languages": [],
  "links": [],
  "volunteering": [],
  "rendering_hints": {
    "density": "normal",
    "target_pages": 2,
    "max_pages": 3,
    "optional_sections_to_hide_first": [],
    "strong_match_allows_page_3": false
  }
}
```

### Current Work Block Shape

```json
{
  "include": true,
  "safe_label": "Current Independent Work & Portfolio Projects",
  "role_line": "Freelance Software Development, Backend Portfolio Projects & Relocation",
  "dates": "May 2025 - Present",
  "location": "Cologne, Germany | Remote",
  "stable_intro": "Continued active software development after relocating from Ukraine to Germany through small freelance tasks, backend-focused portfolio projects, structured upskilling and local volunteering.",
  "bullets": [
    {
      "text": "Built JobFlow CV Pipeline, a backend-first NestJS/TypeScript portfolio project...",
      "priority": "high",
      "evidence_source": "Project_Inventory_RU_v0_6_current_work_sync.md"
    }
  ],
  "tech_stack": ["NestJS", "TypeScript", "PostgreSQL", "Prisma", "Docker", "OpenAI API"]
}
```

### Experience Item Shape

```json
{
  "company": "EPAM Systems",
  "role": "Backend-focused Fullstack Developer",
  "dates": "Nov 2021 - May 2025",
  "context": "E-commerce / Azure serverless / integrations",
  "experience_type": "commercial",
  "can_split_across_pages": true,
  "bullets": [
    {
      "text": "Built and maintained Node.js/TypeScript backend services...",
      "priority": "high",
      "evidence_source": "Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md"
    }
  ],
  "tech_stack": [],
  "rendering_hints": {
    "keep_header_with_min_bullets": 2
  }
}
```

### Selected Project Shape

```json
{
  "title": "AI Job Assistant",
  "project_type": "personal_project",
  "include": true,
  "safe_label": "Personal Project",
  "relevance_reason": "Optional only for AI/Python/FastAPI-friendly roles; otherwise JobFlow in current_work_block is the primary current portfolio signal.",
  "display_priority": "hide_if_no_space",
  "bullets": [
    {
      "text": "Built a FastAPI/PostgreSQL personal project for job ingestion, deduplication and AI-assisted extraction workflows.",
      "priority": "high",
      "evidence_source": "Project_Inventory_RU_v0_6_current_work_sync.md"
    }
  ],
  "tech_stack": ["Python", "FastAPI", "PostgreSQL", "OpenAI API", "GitHub Actions"]
}
```

## Validation Rules

Before export:

```text
required blocks exist
no empty optional headings
current_work_block and personal/current projects are not mixed into commercial experience
experience bullets have evidence_source or needs_evidence marker
selected projects have safe_label and relevance_reason
renderer has no permission to create new content
```

## MVP Acceptance

TASK-035B can start when:

```text
visual-concept.md exists
block-rules.md exists
Prompt 2 content-selection contract is documented
the renderer schema can support variable bullet counts and selected projects
```
