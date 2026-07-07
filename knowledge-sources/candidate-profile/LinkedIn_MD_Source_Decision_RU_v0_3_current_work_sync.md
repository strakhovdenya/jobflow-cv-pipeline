# LinkedIn MD Source Decision RU


## Update v0.3 — LinkedIn current-work decision

The previous LinkedIn MD / Career Break framing is superseded for the current public profile if the user wants to present freelance/independent activity.

### Decision

Do **not** use LinkedIn `Career Break` for the current period if the goal is to show freelance and portfolio work. LinkedIn visually labels it as `Career break / Перерыв в карьере`, which can make the gap more visible. Use a normal Experience entry instead.

Recommended LinkedIn Experience:

- Title: `Freelance Software Developer | Backend Portfolio Projects & Relocation`
- Employment type: `Self-employed`
- Company: `Self-employed`
- Location: `Cologne, North Rhine-Westphalia, Germany`
- Location type: `Remote`
- Dates: `May 2025 – Present`

### LinkedIn description rule

Keep under 2000 characters. Structure should be recruiter-friendly:

1. Relocation + active development narrative.
2. Small freelance / independent Node.js/React tasks.
3. JobFlow CV Pipeline as the main current portfolio project.
4. AI Job Assistant / Python learning as secondary.
5. Certifications summarized, not listed one by one.
6. HEY, ALTER! volunteering as local integration signal.

### Safe LinkedIn wording

```text
Relocated from Ukraine to Germany in 2025 and continued software development through small freelance tasks, backend-focused portfolio projects, structured upskilling, and continued learning. Also active locally through volunteering in Cologne.

As a freelance / independent developer, supported small Node.js/React improvements, including feature additions, bug fixes, API-related changes, UI adjustments, and maintenance tasks.

Currently building JobFlow CV Pipeline — a backend-first AI pipeline for vacancy analysis, targeted CV generation, and deterministic PDF export. Built as a portfolio project to develop production-style NestJS/TypeScript backend skills and explore structured AI-assisted development workflows.

Stack: NestJS, TypeScript, PostgreSQL, Prisma, Docker, OpenAI API, AI Provider Abstraction, Swagger/OpenAPI.
GitHub: github.com/strakhovdenya/jobflow-cv-pipeline

Key engineering features:
- Human-in-the-loop pipeline with mandatory review gates after each AI step.
- Evidence Guard module flags unsupported CV claims using a structured knowledge base with evidence levels.
- Deterministic backend HTML-to-PDF export with predictable output and no AI tokens used for export.
- AI usage tracking by run, prompt type, token count, and estimated cost.
- Modular NestJS architecture with Workspace, Artifact Storage, Prompt Pipeline, AI Provider Abstraction, Evidence Guard, and Document Export modules.
- Prompt versioning with input hashes, source snapshots, artifact traceability, and explicit KnowledgeSource selection.

Also built AI Job Assistant, a personal FastAPI/PostgreSQL project for job ingestion, deduplication, AI-assisted extraction, and automated review workflows using OpenAI API and GitHub Actions.

Continued backend upskilling through Python/FastAPI learning, Node.js/system design certifications, Redis training, Claude Code/MCP courses, and German practice.

Volunteer IT Technician at HEY, ALTER! Köln e.V., refurbishing donated laptops for school students in Cologne.
```

### Source-of-truth decision

LinkedIn text remains a public output/draft, not a source of truth. The actual source facts are stored in:

- Master_CV
- Master_Profile_Summary
- Project_Inventory
- Tech_Stack_Matrix
- Career_Case_Deep_Dives
- CV_Format_Rules

---

## Update v0.2 — consistency decisions

- External name: **Denys Strakhov**.
- Profile linkedIn MD draft remains a public output/draft, not a source of truth.
- Streamlit from LinkedIn MD is accepted as confirmed personal/project UI for AI Job Assistant.
- ProductsUp/Cosmos DB facts should be stored in master sources, not inferred from LinkedIn MD.

## Решение

Profile linkedIn MD draft **не стоит добавлять как отдельный постоянный source file**.

Лучший подход: использовать его как public LinkedIn output/draft, забрать из него полезные новые факты и синхронизировать их с master sources.

## Почему не добавлять как сорс

1. **Он производный.** LinkedIn MD уже собран из части master data и публичного positioning. Если сделать его source of truth, появится риск циклических данных.
2. **Он менее безопасен.** В нём нет классификации `commercial / personal / training / needs evidence`.
3. **Он менее полезен для targeted CV.** Для vacancy tailoring нужны detailed evidence, ownership boundaries, risks and safe wording, а это есть в Master CV / Tech Stack Matrix / Career Case Deep Dives.
4. **Он может создавать overclaim.** Например, personal projects и certifications могут выглядеть слишком сильными, если не отделять их от commercial production experience.

## Что из него забрать

- Career Break — Relocation, May 2025 – Feb 2026.
- Email Camp personal project.
- Cards personal language-learning app.
- Streamlit mention for AI Job Assistant — accepted as personal/project UI evidence, not commercial/core skill.
- Public LinkedIn wording for About/Profile.
- CHI external period Jul 2021 – Oct 2021 — needs final consistency check.

## Где хранить дальше

- Timeline / career break → `Master_CV_RU_v0_6_current_work_sync.md` and `Master_Profile_Summary_RU_v0_6_current_work_sync.md`.
- New projects → `Project_Inventory_RU_v0_6_current_work_sync.md`.
- New technologies → `Tech_Stack_Matrix_RU_v2_3_current_work_sync.md`.
- Interview/case usage → only lightweight note in `Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md` unless these projects become important for a specific vacancy.

## Practical rule for future

Use Profile linkedIn MD draft only to check whether the public LinkedIn profile is aligned with master sources. Do not feed it as a main evidence source when generating CVs. Feed updated master sources instead.
