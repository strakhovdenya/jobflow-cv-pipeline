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

Absent optional blocks are hidden completely. No empty placeholders.

## Conditional Blocks

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
1. Hide volunteering.
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

### Experience Item Shape

```json
{
  "company": "EPAM Systems",
  "role": "Backend-focused Fullstack Developer",
  "dates": "Nov 2021 - Apr 2025",
  "context": "E-commerce / Azure serverless / integrations",
  "experience_type": "commercial",
  "can_split_across_pages": true,
  "bullets": [
    {
      "text": "Built and maintained Node.js/TypeScript backend services...",
      "priority": "high",
      "evidence_source": "Career_Case_Deep_Dives_RU_v0_5_consistency_sync.md"
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
  "project_type": "current_personal_project",
  "include": true,
  "safe_label": "Current Personal Project",
  "relevance_reason": "Relevant to AI-assisted workflow automation and backend architecture.",
  "display_priority": "high",
  "bullets": [
    {
      "text": "Built a backend-first workflow for vacancy ingestion, AI-assisted analysis and CV artifact generation.",
      "priority": "high",
      "evidence_source": "Project_Inventory_RU_v0_5_consistency_sync.md"
    }
  ],
  "tech_stack": ["TypeScript", "NestJS", "PostgreSQL", "Prisma", "OpenAI API"]
}
```

## Validation Rules

Before export:

```text
required blocks exist
no empty optional headings
personal/current projects are not mixed into commercial experience
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
