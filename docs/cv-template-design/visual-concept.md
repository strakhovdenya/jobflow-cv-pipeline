# CV Template Visual Concept — Clean Two-Column MVP

## Purpose

This document fixes the approved visual direction for the first deterministic CV renderer.

The renderer must produce an application-ready Software Engineer / Backend Developer / Full-stack Developer CV PDF for Germany and remote EU roles.

## Approved MVP Direction

```text
Clean two-column CV layout, readable, not overloaded, not a pixel-perfect clone of old PDFs.
```

## Design Principles

- No photo in MVP.
- No heavy decorative circles or background graphics.
- White main background.
- Optional subtle left-column background or vertical divider.
- Blue accent may be used for section headings and small separators.
- Selectable text, not image-based text.
- ATS-friendly structure where possible.
- Experience must start on page 1 whenever there is normal two-page content.
- The template must stay stable when optional sections are absent.

## Page Strategy

Default target:

```text
2 pages
```

Allowed exception:

```text
3 pages only when Prompt 2 explicitly marks the role as strong match and the extra content adds relevant evidence.
```

Avoid:

```text
accidental 4+ pages
third page with only weak leftovers such as one certificate or one language line
```

## Layout Structure

Recommended A4 structure:

```text
left column: 24-30%
main column: 70-76%
```

### Page 1

Left column:

```text
Contact
Work Authorization
Top Skills
Languages
```

Main column:

```text
Name
Target Headline
Summary
Current Independent Work & Portfolio Projects
Professional Experience starts here
```

### Page 2

Left column:

```text
Certifications
Links
Optional compact tech focus if space is available
```

Main column:

```text
Professional Experience continued
Education
Selected Projects, if Prompt 2 includes them
Standalone Volunteering only if Prompt 2 includes it and it is not already inside current-work block
```

### Page 3

Only allowed when justified by Prompt 2 rendering hints.

Useful page 3 content may include:

```text
highly relevant selected project
additional strong experience bullets
role-relevant certifications
```

Page 3 must not be created for weak leftover content.

## Content Ownership

```text
AI / Prompt 2 owns content.
Renderer owns layout.
Evidence guard owns safety.
Human owns final approval.
```

The renderer must not generate, rewrite or reinterpret CV content. It renders the approved `02_targeted_cv_content.json` and optional approved Prompt 3 corrections.

## Visual Treatment

### Header

The candidate name must be large and readable. The target headline should be close to the name and role-specific.

Recommended:

```text
Denys Strakhov
Backend Developer | Node.js | TypeScript | REST APIs | Azure Serverless
```

### Visible ATS Contact Line

For PDF exports, the main column must include a visible machine-readable contact line directly under the target headline and before Summary or any divider line.

Required placement:

```text
Name
Target Headline
Phone: [phone] | Email: [email] | LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya
Summary
```

If the full line does not fit visually, render it as two visible lines:

```text
Phone: [phone] | Email: [email]
LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya
```

Rules:

- the line must be visible in the rendered PDF, not hidden metadata, invisible text or link annotation only;
- use readable compact text, not smaller than 7.5 pt;
- include only Phone, Email, LinkedIn and GitHub;
- do not add location or work authorization to this line;
- extracted page-1 text must contain `Phone:`, `Email:`, `LinkedIn:` and `GitHub:`.

### Section Headings

Use clear headings with consistent spacing:

```text
Summary
Professional Experience
Selected Projects
Education
Certifications
Languages
```

### Experience Items

Commercial experience should use a strong hierarchy:

```text
Company name                         Dates
Role title
Optional domain/context line
Bullets
Tech stack line optional
```

Commercial experience, current-work block and personal/current projects must be visually distinguishable.

### Current Independent Work & Portfolio Projects

The current-work block must appear after Summary and before Professional Experience in new external CV/PDF/HTML outputs. It should be compact enough that EPAM still starts on page 1 whenever possible. It closes the May 2025-Present post-EPAM timeline gap, but it must not visually compete with EPAM as the strongest commercial production evidence. It may be absent only in legacy/imported artifacts or an explicit user-requested legacy/no-current-work output.

### Personal / Current Projects

Personal/current projects must be shown as a separate block, never as employment history.

Recommended labels:

```text
Selected Project
Personal Project
Current Personal Project
```

## Density Modes

The renderer may support density modes provided by Prompt 2:

```text
compact
normal
extended
```

Density mode affects spacing and section visibility, not wording.

The renderer must not shorten bullet text by itself. If content needs to be reduced, Prompt 2 must provide lower-priority bullets or explicit hide-if-no-space priorities.

## Non-Goals for MVP

- Pixel-perfect recreation of previous manual PDFs.
- Photo-based CV.
- Decorative visual-heavy layout.
- DOCX export.
- AI-driven layout rewriting during export.
- Renderer-generated bullets or summaries.
