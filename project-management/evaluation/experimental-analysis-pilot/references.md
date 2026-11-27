# T7 pilot — reference lists and evaluation method

**Owner approval: 2026-11-27.** The owner approved these reference lists (D-1 to D-7) and the evaluation method of Part B, with the final clarifications of B3 and B5, in the interactive T7 session on 2026-11-27. The approval is recorded on ISSUE-718. Its SHA-256 is in `references.sha256`, committed before the first pilot run (ISSUE-718 AC-1, AC-2, INV-1). This file is not changed after the first paid call. A Russian reading copy is kept in the git-ignored validation folder. If the two differ, this English file is authoritative.

Written from: the four `00_vacancy_source.txt` files (hashes below), the active knowledge sources
(hashes in Part C), `CANDIDATE_PROFILE_CONFIG`, the frozen #702 requirement lists
(`cv-quality-refinement-validation/assessments/vacancy-assessments-2026-11-25.md`, sha256
`c41920fb…1e50`, verified 2026-11-27) and the #690 protocol §2 must-keep list. **No pilot output
exists. I read no experimental output and no historical model output (01/02 JSON) to write this
file.** The historical decisions I quote are workspace metadata (decision/score columns), used only
as context for the acceptable sets and never as requirement or evidence items.

No CV text, no contact data, no full vacancy text. Requirement anchors are short verbatim
fragments of one vacancy line. They are used for quote-span matching.

---

## 0. Conventions

**Tiers.** M = must-have (a requirements section), N = nice-to-have, R = responsibility / key duty,
I = implied (not extracted from a line; excluded from completeness counts).

**Evidence keys** use the catalog grammar `<kind>:<container>[#<item>]` (ADR-046 item 7). The
catalog was rebuilt offline from the active sources: 338 entries, 8 projects, 31 credentials and
career cases 1–9, 12–14. Hit rules for map recall and critical evidence:
- `case:N` item: a hit when the run cites `case:N` or any `case:N#section-k`.
- project item given at item level (for example `project:cards#fact-3`): a hit only for a listed
  accepted key. A citation of the bare container `project:cards` is recorded as a "container hit",
  not a hit.
- project item given at container level (`project:x`): any key of that container is a hit.
- Alternatives are separated by `|`: a citation of any one of them is a hit.

Commercial cases: 1 ProductsUp sync (EPAM), 2 Amplience automation (EPAM), 3 CommerceTools
(EPAM), 4 notification production incident (EPAM), 5 PostgreSQL account-splitting migration
(Factor–IT), 6 vacation payment logic (Factor–IT), 7 EPAM platform overview, 8 event-driven
notification flow (EPAM), 9 custom PHP framework (Factor–IT). 12 Viber bot (personal), 13 CHI
internship (training), 14 volunteer.

**Never displayable / ineligible (all vacancies).** Naming any of these as evidence in `01`
breaks the minimum bar: `project:ai-bootcamp-rag-service`, `project:ai-job-assistant`,
`project:email-camp`, and every credential with `displayable: no` (all `gc-lab-*`,
`gc-path-*`, `gc-course-*`).

**Candidate constants** (`CANDIDATE_PROFILE_CONFIG`): Cologne, Germany; eligible to work in Germany;
English B1/B1+ (professional working use); German A2/B1; Russian, Ukrainian native. **No Spanish.**

**Global unsupported claims** (must not appear in any run): commercial AWS, Kubernetes, Docker in
production, commercial AI product or LLM-integration experience, AI Engineer title, productivity
figures, English above B1/B1+, German above A2/B1, any project or credential from the ineligible
list as evidence.

---

## S1 — Action1, Full-Stack Developer

- Source: Baseline B workspace `cmwv8dfc5003nza06uxeu6sn9`. `00` sha256 `b9be5f0df37f65907b4eda7065391c40f6b7a4fe69a1c09a4cda7b5e40c168b6` (1830 chars, LF, no BOM). Company `Action1`, role = the stored Baseline B value (October duplicated title, kept on purpose as in #702). Manual notes: none.
- Requirement list provenance: #702 frozen list (7 original rows plus the 2026-11-25 completion), IDs kept.
- **Acceptable decisions: {maybe}.** Clear-cut: no (one of the two #702 flips).
- **Expected flags:** none required. `borderline` acceptable (the score is expected near 65). `manual_review_required` acceptable for remote eligibility: "Fully remote" names no country.
- **Rationale.** All must-haves except two have direct commercial evidence: Node/TS/React/REST at EPAM, tests, legacy PHP at Factor–IT, and more than 3 years of experience. The two gaps are vendor-specific: AWS (M6) and DynamoDB/MySQL (M4). Each has only a commercial *transferable* basis (Azure serverless; Cosmos DB / PostgreSQL). The rubric counts a transferable basis as a core gap (Appendix C1), so the cap is maybe and apply is not acceptable. Skip is not acceptable either: the core stack is close and the gaps are manageable (B3), and no hard constraint applies. Historical context only: maybe 69 / 67 / 71, skip 61 (#702 attempt 1).

| ID | Tier | Anchor (vacancy fragment) | Expected evidence (accepted keys) | Expected basis | Critical |
|---|---|---|---|---|---|
| M1 | M | "3+ years of software development experience" | `case:7` \| `case:9` \| `case:5` | commercial | — |
| M2 | M | "Excellent knowledge of Node.js, JavaScript, TypeScript, ReactJS" | `case:7` \| `case:1` (Node/TS); `case:7` \| `case:3` (React) | commercial (React: working, not "excellent") | — |
| M3 | M | "Experience in designing and developing REST APIs" | `case:1` \| `case:3` \| `case:7` | commercial | — |
| M4 | M | "Proficiency in working with databases (DynamoDB, MySQL)" | `case:1` \| `case:7` (Cosmos DB); `case:5` (PostgreSQL) | commercial_transferable | **C-S1-1** Cosmos DB |
| M5 | M | "Experience writing tests" | `case:1` \| `case:2` \| `case:3` (Jest); `project:b1-kompass#fact-7` \| `project:b1-kompass#wording-1` | commercial + personal | **C-S1-2** B1 Kompass e2e |
| M6 | M | "Good knowledge of AWS (Lambda, EC2)" | `case:1` \| `case:2` (Azure Functions, transferable) | commercial_transferable / none | — |
| M7 | M | "Readiness to support legacy PHP code" | `case:9` \| `case:5` \| `case:6` | commercial | **C-S1-3** custom PHP framework (`case:9`) |
| R1 | R | "Develop and maintain frontend part of the product" | `case:7` \| `case:3` | commercial | — |
| R2 | R | "Develop API and backend for a high-load product" | `case:1` \| `case:7` | commercial | — |
| R3 | R | "Write unit and integration tests for both frontend and backend" | `case:1` \| `case:2` \| `case:3`; `project:b1-kompass#fact-7`; `project:home-budget#fact-6` | commercial + personal | (C-S1-2) |
| R4 | R | "Refactor code and improve application performance" | `case:2` (Redis caching) \| `case:5` (query optimisation) | commercial | — |
| I1 | I | (no AI anywhere in the vacancy) | — | — | — |

- Critical items: C-S1-1 Cosmos DB (`case:1` | `case:7`), C-S1-2 B1 Kompass e2e (`project:b1-kompass#fact-7` | `#wording-1`), C-S1-3 custom PHP framework (`case:9`).
- Gaps / risks: AWS (core, transferable only); DynamoDB/MySQL (core, transferable only); React as "excellent" (backend-focused fullstack); remote-location eligibility unstated.
- Must not appear: AWS, Lambda, EC2, DynamoDB or MySQL experience; frontend-first or "excellent React" claims; any AI wording or AI evidence (I1); Docker as commercial.
- Insufficient evidence / open: the vacancy states no English level and no location; the AWS gap cannot be closed from the sources.

---

## S3 — Binary Studio, Middle JS Full-Stack Engineer

- Source: Baseline B workspace `cmwvatfyh0073za06prjwqq9e`. `00` sha256 `102f65ec457940dd7601cc825a7e4387257fc63a018b839680f73d6f54ca2e80` (3851 chars). Company `Binary Studio`, role `Middle JS Full-Stack Engineer`. Manual notes: none.
- Requirement list provenance: #702 list "reconstructed 2026-11-25, not original", IDs kept.
- **Acceptable decisions: {maybe}.** Clear-cut: no (the second #702 flip).
- **Expected flags:** none required; `borderline` acceptable.
- **Rationale.** Node/TS, React/Next, PostgreSQL, REST and integrations, and tests are commercially evidenced. Two core asks have only personal or no evidence: NestJS (JobFlow, CHI exposure) and Tailwind (none eligible). Under C1 this caps the decision at maybe. English is required at B2 against B1/B1+: that is a *language risk*, not an eligibility incompatibility. The vacancy is remote abroad, so the location is compatible. Skip would need stacking of three or more categories or a hard constraint, and neither is expected. Historical context only: maybe 69 / 70 / 68 / 68, skip 67 (#702 attempt 1).

| ID | Tier | Anchor | Expected evidence | Expected basis | Critical |
|---|---|---|---|---|---|
| M1 | M | "4+ years of hands-on full-stack development" | `case:7` \| `case:9` | commercial (full-stack part partial) | — |
| M2 | M | "Practical knowledge of Node.js, TypeScript, and NestJS" | `case:7` \| `case:1` (Node/TS); `project:jobflow-cv-pipeline` (NestJS) | commercial + personal (NestJS) | — |
| M3 | M | "Hands-on expertise with React.js and Next.js" | `case:7` \| `case:3` | commercial | **C-S3-4** EPAM React/Next |
| M4 | M | "Knowledge of PostgreSQL and relational database concepts" | `case:5` \| `case:6` | commercial | **C-S3-3** Factor–IT PostgreSQL (`case:5` \| `case:6`) |
| M5 | M | "Experience with Prisma ORM or similar tools" | `project:jobflow-cv-pipeline`; `case:9` (Data Mapper, transferable) | personal / commercial_transferable | — |
| M6 | M | "Understanding of REST API development and third-party integrations" | `case:1` \| `case:2` \| `case:3` | commercial | **C-S3-2** ProductsUp (`case:1`) |
| M7 | M | "Knowledge of Tailwind CSS and responsive interface development" | — (no eligible evidence) | none | — |
| M8 | M | "writing clean, maintainable, and well-tested code" | `case:1` \| `case:2` \| `case:3`; `project:b1-kompass#fact-7` \| `#wording-1` | commercial + personal | **C-S3-1** B1 Kompass e2e |
| M9 | M | "Confidence working independently and collaborating closely with a Team Lead" | `case:7` | commercial | — |
| M10 | M | "Readiness to work in a fast-paced and iterative development environment" | `case:7` | commercial | — |
| M11 | M | "Upper-Intermediate level of English" | (candidate constant B1/B1+) | gap | — |
| N1 | N | "Familiarity with AWS" | `case:1` (Azure, transferable) | transferable / none | — |
| N2 | N | "Experience integrating Microsoft Graph API or Outlook services" | — | none | — |
| N3 | N | "Knowledge of Docker and GitHub Actions" | `project:jobflow-cv-pipeline` \| `project:dark-factory` \| `project:b1-kompass#fact-8` | personal | — |
| N4 | N | "Experience working on MVPs or early-stage products" | `project:b1-kompass` \| `project:cards` | personal | — |
| N5 | N | "Familiarity with data-heavy business applications" | `case:3` \| `case:1` \| `case:5` | commercial | — |
| N6 | N | "AI-assisted development tools such as Claude Code, Codex, or Cursor" | `project:dark-factory` \| `project:jobflow-cv-pipeline` \| `project:home-budget`; `credential:anthropic-claude-code-101` | personal / training | — |
| R1 | R | "Build and maintain frontend functionality using React.js" | `case:7` \| `case:3` | commercial | (C-S3-4) |
| R2 | R | "Develop backend functionality using Node.js, TypeScript, and NestJS" | `case:7` \| `case:1`; `project:jobflow-cv-pipeline` | commercial + personal | — |
| R3 | R | "Work with PostgreSQL and Prisma ORM" | `case:5`; `project:jobflow-cv-pipeline` | commercial + personal | (C-S3-3) |
| R4 | R | "Design and implement REST APIs and third-party integrations" | `case:1` \| `case:2` \| `case:3` | commercial | (C-S3-2) |
| R5 | R | "Implement product features based on agreed requirements and designs" | `case:7` | commercial | — |
| R6 | R | "including when using AI-assisted tools" | `case:1` \| `case:2` \| `case:3`; `project:b1-kompass#fact-7` | commercial + personal | — |
| R7 | R | "Investigate and resolve frontend, backend, and integration issues" | `case:4` | commercial | — |
| R8 | R | "Participate in code reviews, testing, demos, and feedback sessions" | `case:7` | commercial | — |
| R9 | R | "Collaborate with the Team Lead, Solution Architect, UI/UX Designer" | `case:7` | commercial | — |
| R10 | R | "Contribute to continuous product improvement" | `case:7` | commercial | — |
| I1 | I | AWS / MS Graph / Tailwind gaps stated, not invented | — | — | — |
| I2 | I | English B2 against B1/B1+ | — | — | — |

- Critical items: C-S3-1 B1 Kompass e2e, C-S3-2 ProductsUp (`case:1`), C-S3-3 Factor–IT PostgreSQL (`case:5` | `case:6`), C-S3-4 EPAM React/Next (`case:7` | `case:3`).
- Gaps / risks: NestJS (personal only), Tailwind (none), English B2, full-stack years (backend-heavy), AWS and MS Graph (nice-to-have).
- Must not appear: Tailwind experience; `project:email-camp`; commercial NestJS or Prisma; AWS; MS Graph; English B2; commercial AI work.
- Insufficient evidence / open: how many of the commercial years count as "full-stack" is a judgement. If a run marks English B2 as `mandatory_language: incompatible` and skips, that run is outside the acceptable set: the rubric treats an English level gap as a language risk.

---

## S4 — Employment Hero, Software Engineers - Remote

- Source: Baseline B workspace `cmwvaw2ol007rza06k4zfvdk6`. `00` sha256 `443afe1e06743355584548d4498ec6e5ae0acf5c4297e3e0bf8531a0a5d46a49` (6956 chars). Company `Employment Hero`, role `Software Engineers - Remote`. Manual notes: none.
- Requirement list provenance: #702 list "reconstructed 2026-11-25, not original", IDs kept.
- **Acceptable decisions: {maybe, apply}** (owner decision D-3), with mandatory manual review of location eligibility. Clear-cut: no.
- **Expected flags: `manual_review_required` expected** (remote eligibility / location).
- **Rationale.** The vacancy accepts "transferable proficiency in … Node.js … with React", which matches the candidate's commercial evidence: an *equivalent experience accepted* fact. PostgreSQL and Redis are commercial. AI-assisted workflow and security evidence are strong but personal. All levels are open, and Intermediate (3–7 years) fits. The open point is location: the title is "Romania (Remote)", the company is "expanding … in Romania", and it states "We verify candidate identity and location". The text never says that residency in Romania is required, so ADR-046 item 5 reads this as *undetermined* and sets `manual_review_required`, without a risk weight and without a hard constraint. Skip is acceptable only if the owner reads the title as a residency requirement (owner decision D-3). Historical context only: maybe 69 / 70 / 69.

| ID | Tier | Anchor | Expected evidence | Expected basis | Critical |
|---|---|---|---|---|---|
| R1 | R | "business logic, APIs, user authentication, and interactive workflows" | `project:cards#fact-3` \| `project:cards#wording-1` (auth); `case:8` \| `case:4` (Service Bus workflows); `case:1` \| `case:3` | personal + commercial | **C-S4-1** Cards auth; **C-S4-3** Service Bus |
| R2 | R | "Championing AI-assisted workflow execution" | `project:dark-factory` \| `project:jobflow-cv-pipeline` \| `project:home-budget`; `credential:anthropic-claude-code-101` | personal / training | — |
| R3 | R | "zero-trust security practices (OWASP Top 10), and automated testing standards" | `project:cards#fact-4` \| `project:cards#fact-5` \| `project:cards#wording-1`; `credential:linkedin-nodejs-security`; `case:1` \| `case:2` \| `case:3` (tests) | personal + training + commercial | **C-S4-2** Cards server-enforced demo / rate limiting |
| R4 | R | "Executing autonomously in a 100% remote, asynchronous environment" | `case:7` | commercial | — |
| R5 | R | "End-to-End Feature Ownership" | `case:1`; `project:jobflow-cv-pipeline` | commercial + personal | — |
| R6 | R | "Ruby on Rails, React/TypeScript, and .NET Core, backed by PostgreSQL, MySQL, and Redis" | `case:7` \| `case:3` (React/TS); `case:5` (PostgreSQL); `case:2` (Redis) | commercial (Rails/.NET none) | — |
| R7 | R | "Leveraging AI agents for boilerplate generation, test drafting, and refactoring" | `project:dark-factory#fact-8` \| `project:dark-factory#fact-9` \| `project:dark-factory#wording-1` \| `project:dark-factory#wording-3` | personal | — |
| R8 | R | "robust error handling, and zero-trust security practices" | `case:1` (retries, idempotency); `project:cards#fact-4` \| `#fact-5` | commercial + personal | (C-S4-2) |
| R9 | R | "Breaking down ambiguous business requirements into testable tasks" | `case:7` | commercial | — |
| M1 | M | "Professional software engineering experience aligned with our leveling criteria" | `case:7` \| `case:9` \| `case:5` | commercial | — |
| M2 | M | "relational databases (PostgreSQL, MySQL, Redis), RESTful API design" | `case:5`; `case:2`; `case:1` \| `case:3` | commercial | — |
| M3 | M | "transferable proficiency in Java, Node.js, Python, or Go with React/Angular" | `case:7` \| `case:1` | commercial | — |
| M4 | M | "reasoning through concurrency and edge cases" | `case:1` \| `case:5` | commercial | — |
| M5 | M | "critical skepticism toward code (especially AI-generated code)" | `case:4` (debugging); `case:1` \| `case:2` \| `case:3` (tests); `project:dark-factory#fact-8` \| `#fact-9` | commercial + personal | — |
| M6 | M | "Clear, empathetic written communication (Jira, Slack, Confluence)" | `case:7` | commercial | — |
| I1 | I | "We are AI First" | — | — | — |
| I2 | I | location "Romania (Remote)" + "We verify candidate identity and location" | — | — | — |
| I3 | I | Rails / .NET / C# / MySQL gaps stated, not invented | — | — | — |

- Critical items: C-S4-1 Cards authentication (`project:cards#fact-3` | `#wording-1`), C-S4-2 Cards server-enforced read-only demo or rate limiting (`project:cards#fact-4` | `#fact-5` | `#wording-1`), C-S4-3 EPAM Service Bus notifications (`case:8` | `case:4`).
- Gaps / risks: Rails / .NET / C# / MySQL (equivalence accepted); location eligibility (undetermined); AI evidence is personal only.
- Must not appear: Rails, .NET, C# or MySQL experience; Romanian residency; commercial AI-assisted work; productivity figures; AI Engineer title; commercial OWASP or security ownership.
- Insufficient evidence / open: residency requirement (D-3); English level not stated (written async communication against B1/B1+).

**S4 location wording (verbatim) and how the rules apply (D-3).**

Every location statement in the vacancy:
1. Title line: "Software Engineers All Levels Romania (Remote)"
2. "We are expanding our engineering presence in Romania to establish a founding European squad."
3. "you’ll be working with our founding European squad in Romania"
4. "We are Remote First - we champion a remote environment with a preference for asynchronous communication"
5. "Executing autonomously in a 100% remote, asynchronous environment across distributed global squads."
6. "we ask all applicants to complete the salary expectation question on the application form in Monthly NET RON."
7. "We verify candidate identity and location as part of our hiring process."

No sentence states that residence in Romania, a Romanian work permit or relocation is required. Equally, none states that candidates elsewhere in the EU are accepted. Lines 1–3, 6 and 7 together make a Romania-based contract likely but not stated.

How each arm treats this:
- **B/C, eligibility stage.** The template defines `incompatible` as "only when the vacancy states a condition the candidate clearly cannot meet", and `undetermined` as the case where "the vacancy does not state enough to decide" (`fit-assessment.txt`, Eligibility). The expected value is therefore `remote_location: undetermined`. ADR-046 item 5 then applies:
  - `undetermined` is never a risk and has no weight;
  - for remote eligibility / location it sets `manual_review_required`;
  - the decision is not rewritten.
  - Expected result: a policy decision from the bands (maybe or apply) plus the manual-review flag. A run that sets `incompatible` gets H2 → skip. Under this reference that is outside the acceptable set, and it is reported with the run's own `note`.
- **B/C, early-stage cap.** If a run records the X1 fact `early_stage_role`, for example reading "founding European squad" or "customer-facing application features" that way, then Appendix C2 applies. Undetermined location means not "all fits very strong", so the cap holds the decision at maybe at most. Maybe is inside the acceptable set either way.
- **B/C, apply band.** Appendix B2: in the 65–74 band, "undetermined eligibility → manual review, does not block apply". B1 (≥ 75) has no eligibility condition either.
- **Legacy.** `prompt1_v13.txt` lists "remote/location conditions are unrealistic" among the skip blockers (line 164), and sets `manual_review_required` for every maybe and for any high location risk (line 215). A legacy skip on S4 is therefore possible if the model judges Romania-only as unrealistic. Under this reference it is outside the acceptable set and reported.
- **If the owner reads the title as a residency requirement,** the acceptable set becomes {skip} and the expected value becomes `incompatible`. The owner decided D-3 on 2026-11-27: {maybe, apply} with mandatory manual review of location eligibility.

---

## JG — Jobgether, Backend Engineer (clear-cut pilot vacancy)

- Source: Baseline B workspace `cmwvatfpy006xza06rxygmeh9` (TASK-E "Jobgether" regression case). `00` sha256 `de43248e814e47486429979ccc33b445cea7af4d3fcd26343edb4e772fb69daf` (7044 chars). Company `Jobgether`, role `Backend Engineer`. Manual notes: none (Baseline B had none).
  - The October workspace of the same vacancy carries one note about a German hiring subsidy. That is application context, not candidate evidence, so it is **not** copied (owner decision D-5).
- Requirement list provenance: **new, written 2026-11-27 from `00` only, not original.**
- **Acceptable decisions: {skip}. Clear-cut: yes** (the ADR-046 item 6 clear-cut vacancy, D-2).
- **Expected flags:** none required. `manual_review_required` should *not* be set by the Spanish condition, because it is explicit.
- **Rationale.** "Professional proficiency in both Spanish and English" is a mandatory language the candidate does not have. That is `mandatory_language: incompatible`, so H2 gives skip. Everything else fits: more than 5 years of backend in production (Factor–IT since 2016, EPAM 2021–2025), commercial Node/TS, location in Germany. A clean fit everywhere else is what makes the hard constraint a good test of the policy and of legacy. Historical context only: skip 67 (Baseline B), maybe 65 (October, with the note).

| ID | Tier | Anchor | Expected evidence | Expected basis | Critical |
|---|---|---|---|---|---|
| M1 | M | "At least 5 years of professional experience developing and maintaining backend services" | `case:7` \| `case:9` \| `case:5` | commercial | — |
| M2 | M | "Strong proficiency in Node.js and TypeScript" | `case:7` \| `case:1` | commercial | **C-JG-1** EPAM Node/TS |
| M3 | M | "relational and non-relational databases, such as MySQL, MongoDB, ClickHouse" | `case:5` (PostgreSQL); `case:1` \| `case:7` (Cosmos DB) | commercial_transferable | — |
| M4 | M | "Strong knowledge of API design, data modeling, and web architecture" | `case:1` \| `case:3` \| `case:5` | commercial | — |
| M5 | M | "query optimization, latency management, scalability" | `case:5`; `case:2` | commercial | — |
| M6 | M | "AI-assisted coding tools such as Claude Code, Cursor, GitHub Copilot" | `project:dark-factory` \| `project:jobflow-cv-pipeline` \| `project:home-budget`; `credential:anthropic-claude-code-101` | personal / training | — |
| M7 | M | "CI/CD pipelines and cloud deployment practices, including tools such as Docker, GitHub Actions" | `project:jobflow-cv-pipeline` \| `project:dark-factory#fact-7` \| `project:dark-factory#fact-12`; `case:7` (Azure DevOps, Terraform) | personal + commercial (working) | — |
| M8 | M | "Experience with unit, integration, and end-to-end testing methodologies" | `case:1` \| `case:2` \| `case:3`; `project:home-budget#fact-6`; `project:b1-kompass#fact-7` | commercial (unit) + personal (integration, e2e) | — |
| M9 | M | "Strong problem-solving skills, technical curiosity" | `case:4` \| `case:5` | commercial | — |
| M10 | M | "Excellent communication and collaboration skills" | `case:7` | commercial | — |
| M11 | M | "Professional proficiency in both Spanish and English" | — (Spanish: none; English B1/B1+) | none | — |
| N1 | N | "Experience working with ClickHouse or other OLAP" | — | none | — |
| N2 | N | "real-time data pipelines, streaming technologies, Kafka, or event ingestion APIs" | `case:8` (event-driven, transferable) | commercial_transferable | — |
| N3 | N | "data-intensive backend services at scale" | `case:1` \| `case:3` | commercial | — |
| N4 | N | "middleware architectures, including API gateways, request pipelines" | `case:7` (BFF) \| `case:1` | commercial_transferable | — |
| N5 | N | "Familiarity with PHP and/or Java/Spring" | `case:9` \| `case:5` | commercial | — |
| N6 | N | "agents, MCP servers, or team-wide AI-assisted engineering practices" | `project:dark-factory`; `credential:anthropic-mcp-introduction` \| `credential:anthropic-mcp-advanced-topics` | personal / training | — |
| N7 | N | "Contributions to open-source projects" | — | none | — |
| R1 | R | "scalable backend services and applications using Node.js and TypeScript" | `case:7` \| `case:1` | commercial | (C-JG-1) |
| R2 | R | "Build and optimize APIs supporting analytics products" | `case:1` \| `case:3` | commercial_transferable | — |
| R3 | R | "large-scale data systems and relational and non-relational databases" | `case:5`; `case:1` | commercial_transferable | — |
| R4 | R | "high standards of performance, scalability, reliability" | `case:1` \| `case:2` | commercial | — |
| R5 | R | "Contribute to architectural decisions and technical design" | `case:1` | commercial | — |
| R6 | R | "Develop efficient data models and optimize queries" | `case:5` | commercial | — |
| R7 | R | "Collaborate closely with product managers, data specialists" | `case:7` | commercial | — |
| R8 | R | "Work within an Agile development environment" | `case:7` | commercial | — |
| R9 | R | "Integrate AI-powered development tools into everyday workflows" | `project:dark-factory` \| `project:jobflow-cv-pipeline` | personal | — |
| R10 | R | "testing strategies, deployment processes, and continuous integration" | `case:1` \| `case:7`; `project:jobflow-cv-pipeline` | commercial + personal | — |
| R11 | R | "Navigate existing codebases when necessary" | `case:9` \| `case:7` | commercial | — |
| I1 | I | "listed on behalf of a partner company" (agency-style listing) | — | — | — |
| I2 | I | "based in Germany" — location compatible | — | — | — |

- Critical items: C-JG-1 EPAM Node/TS (`case:7` | `case:1`). Map evidence matters less for a skip vacancy; the decision and its deciding rule are the main signal.
- Language facts expected: Spanish — mandatory, the candidate has none, so **incompatible**. English — professional, against B1/B1+, so a language risk.
- Must not appear: any Spanish ability; commercial MongoDB, ClickHouse, MySQL or Kafka; "5 years of Node.js"; commercial AI-assisted work; MongoDB beyond CHI internship exposure.
- Insufficient evidence / open: whether the aggregator listing counts as `agency_listing` (C3) is a judgement and does not change the expected skip.

**Spanish requirement confirmed (D-2).**
- The line "Professional proficiency in both Spanish and English." is the last item of the section headed "Requirements" (not of "Additional Experience That Would Be Considered An Advantage"), so it is a mandatory requirement.
- The vacancy also offers "free English and Spanish language classes" and mentions an office "near Barcelona". These are context only and do not soften the requirement.
- The candidate constants list no Spanish, so the candidate "has no working command at all" of a mandatory language. That is `mandatory_language: incompatible` (`fit-assessment.txt`, Eligibility), and Appendix H2 gives skip.
- Legacy has no Spanish rule. Its skip has to come from the model's judgement under the general blocker rules (`prompt1_v13.txt` line 164). A legacy maybe or apply on Jobgether is outside the acceptable set and is reported.

---

## Critical evidence register (D-4)

Each item's meaning is taken from the source that the evidence key points to. "Requirement" names the reference rows the item supports. An item counts as present in a B/C run when two things hold:
- any `01b.coverage[].evidence[].ref` anywhere in the map is one of its accepted keys (the ADR wording "missing from the map");
- for a `case:N` key, the coverage row that cites it actually uses the case for the fact in the "Meaning" column. A case cited for unrelated content does not count (B5).

This verified presence is the minimum-bar measure. Deterministic presence (key only) and row-level presence are reported as supplementary measures.

| ID | Vacancy | Requirement | Accepted keys | Meaning (from the source) | Provenance |
|---|---|---|---|---|---|
| C-S1-1 | S1 | M4 "Proficiency in working with databases (DynamoDB, MySQL)" | `case:1` \| `case:7` | EPAM: Cosmos DB in production (containers, partition key / id, queries, select/update) — the closest NoSQL analogue to DynamoDB | commercial (transferable) |
| C-S1-2 | S1 | M5 "Experience writing tests"; R3 | `project:b1-kompass#fact-7` \| `project:b1-kompass#wording-1` | B1 Kompass: 29 Vitest unit test files and 49 Playwright end-to-end specs on an isolated local Supabase, run in CI | personal |
| C-S1-3 | S1 | M7 "Readiness to support legacy PHP code" | `case:9` | Factor–IT: a custom in-house PHP backend framework (Data Mapper; routing, validation, migrations, database layer, permissions) | commercial |
| C-S3-1 | S3 | M8 "well-tested code"; R6 | `project:b1-kompass#fact-7` \| `project:b1-kompass#wording-1` | as C-S1-2 | personal |
| C-S3-2 | S3 | M6 "REST API development and third-party integrations"; R4 | `case:1` | EPAM ProductsUp sync: long-running Durable Functions flow with retries and idempotency, CommerceTools enrichment, CSV/GZIP, Azure Blob Storage | commercial |
| C-S3-3 | S3 | M4 "PostgreSQL and relational database concepts"; R3 | `case:5` \| `case:6` | Factor–IT: PostgreSQL schema design, migrations, complex SQL (high-risk account-splitting migration; payment calculation logic) | commercial |
| C-S3-4 | S3 | M3 "React.js and Next.js"; R1 | `case:7` \| `case:3` | EPAM: React/Next.js frontend features through the BFF layer on the e-commerce platform | commercial |
| C-S4-1 | S4 | R1 "… user authentication …" | `project:cards#fact-3` \| `project:cards#wording-1` | Cards: invite-only email/password sign-up through a Supabase RPC | personal |
| C-S4-2 | S4 | R3 "zero-trust security practices (OWASP Top 10)"; R8 | `project:cards#fact-4` \| `project:cards#fact-5` \| `project:cards#wording-1` | Cards: a read-only demo user whose writes are blocked on the server; rate limiting with Upstash and an in-memory fallback | personal |
| C-S4-3 | S4 | R1 "… interactive workflows …" | `case:8` \| `case:4` | EPAM: event-driven customer notification flow over Azure Service Bus (subscription events enriched and sent to the email/SMS service); case 4 is the production incident in the same flow | commercial |
| C-JG-1 | JG | M2 "Strong proficiency in Node.js and TypeScript"; R1 | `case:7` \| `case:1` | EPAM 2021–2025: Node.js/TypeScript backend in production | commercial |

Note: `project:cards#wording-1` states sign-up, demo and rate limiting in one sentence, so citing it counts for both C-S4-1 and C-S4-2.

## Owner decisions (status)

All approved by the owner on 2026-11-27:
- D-1 S1 {maybe}, S3 {maybe}.
- D-2 Jobgether is the clear-cut vacancy, expected {skip}. The Spanish requirement is confirmed above.
- D-3 S4 {maybe, apply}, with mandatory manual review of location eligibility.
- D-4 The 11 critical items above.
- D-5 No manual notes.
- D-6 A critical item cited in any legacy repetition enters the minimum-bar loss assessment (B5).
- D-7 Pooled requirement completeness is the primary comparison. Macro, per-vacancy, per-repetition and per-run results are reported separately (B3).

---

# Part B — Evaluation method (frozen with this file)

This part is fixed before the first result and is covered by the same SHA-256. Nothing here changes the ADR-046 thresholds.

## B1. Runs and failures

- **Planned run** = one fork's analysis job. There are 12 planned runs per arm: 4 vacancies × 3 repetitions.
- **Outcome classes:**
  - `completed`;
  - `failed-output`: the provider answered, but the answer was truncated, refused, empty or failed contract validation;
  - `failed-infrastructure`: no model answer, because of a timeout, a 429/5xx, a network or process error;
  - `incomplete`: C only, X1 completed but X2 did not.
- **Primary figures count every planned run.** A failed or incomplete run counts as no decision, no matched requirement, no evidence hit and every critical item missing. "Completed runs only" figures are reported next to them as supplementary. No run is silently dropped.
- **Re-runs.** A re-run needs a separate owner approval and a new fork. It is reported as an additional run with suffix `X` (for example `TEST_T7_P1_S3_C_R02X`), never as a replacement. The primary figures stay on the planned runs.

## B2. Decision metrics

- **Decision.**
  - Legacy: `01.decision`.
  - B/C: the policy decision in `01c` (projected into `01.decision`). The advisory model decision is reported next to it.
- **Correctness.** A run is correct when its decision is in the acceptable set. Reported per vacancy and arm (out of 3) and per arm (out of 12).
- **Vacancies whose runs all agree with the reference** (ADR-046 item 6, "+1" rule): all 3 planned runs completed and correct. Counted per arm.
- **Stability.** The share of completed runs equal to the arm's modal decision on that vacancy. Without a mode (1-1-1), it is reported as "no mode".
- **Flags.**
  - Expected flags are reported per run, separately from correctness.
  - Legacy sets `manual_review_required` for every maybe (`prompt1_v13.txt` line 215), so legacy flags are marked "not comparable".
- **Score.**
  - Legacy: `01.score`.
  - B/C: the policy score (the sum of the six sub-scores after the language cap).
  - The within-vacancy spread is max − min.

## B3. Requirement matching

- **Evaluated requirements** are the M, N and R rows of the four vacancies: S1 11, S3 27, S4 15, JG 29.
  - That is 82 per repetition; the M rows among them (S1 7, S3 11, S4 6, JG 11) are 35.
  - **Informational rows** (I) are never units of measurement: they record implied context and gaps.
  - Each arm has 12 planned runs, so the pooled denominators are 82 × 3 = **246** evaluated requirements and 35 × 3 = **105** must-have requirements.
  - Each repetition covers all four vacancies once.
- **Reference span** = the character range in `00` of the whole vacancy line that contains the anchor.
- **B/C model units** = every `01a.requirements[]` item plus every `01a.languages[]` item (language requirements live there). Facts are not units.
  - Unit span = the character range of its `quote` in `00`.
  - A quote that occurs more than once in `00` gets every occurrence, and the ambiguity is logged.
- **Candidate pair** (unit u, reference item g): overlap = |span(u) ∩ span(g)| / min(|span(u)|, |span(g)|) ≥ 0.5.
- **Semantic verification by the evaluator.**
  - A candidate pair counts only if the unit's `text` states the requirement of g, or a part of it.
  - Rejected candidates are logged with a reason.
  - A unit without a candidate may still match g semantically if its quote comes from another line saying the same thing. This is logged as "semantic-only".
  - Both the deterministic figure (span pairs only) and the verified figure are reported. **The verified figure is primary.** Every ambiguous decision is listed.
- **Broad quote.** A unit whose span reaches ≥ 0.5 overlap with two or more reference spans is flagged `broad`. It still credits at most one item.
- **One-to-one assignment for completeness.**
  - Maximum-cardinality bipartite matching over accepted pairs. Ties go to the higher overlap, then to the earlier reference order.
  - Each reference item is credited at most once, and each unit credits at most one item. So duplicates and splits cannot inflate completeness.
- **Per-run measures:**
  - Completeness = assigned reference items / reference items of the vacancy.
  - Must-have completeness = assigned M items / M items.
  - Precision = units with at least one accepted pair (many-to-one allowed) / all units.
  - **Strict precision** (supplementary, penalizes duplicates) = units credited in the one-to-one assignment / all units. A second unit for an already credited requirement counts against it.
- **Also reported:**
  - duplicates: units whose item is already credited to another unit;
  - unmatched units, classified as valid-but-not-in-reference, invalid, or fact or noise, and listed;
  - kind agreement (M against `must_have`, and so on).
  - The reference is never edited after the hash.
- **Legacy.**
  - Units are the items of `01.must_have`, `01.nice_to_have` and `01.wishlist`. They have no quotes, so every pair is judged semantically by the evaluator under the same one-to-one rule.
  - Every legacy figure is labelled **evaluator-judged**. B/C figures are labelled **span-based, evaluator-verified**.
- **Aggregation.**
  - Per run, per vacancy and arm (mean of the 3 planned runs), and per repetition (pooled over the 4 vacancies).
  - **Pooled** = Σ assigned / Σ evaluated requirements over the 12 planned runs (denominator 246 per arm; must-have denominator 105).
  - **Macro** = the mean of the four vacancy means.
- **Minimum bar "completeness ≥ legacy":** pooled completeness of the arm ≥ pooled completeness of legacy.
  - Macro and per-vacancy values are reported in the same table.
  - Any vacancy where the arm's mean is below legacy's is listed as a **masked regression**. It is shown, but it does not change the ADR rule.
- **C rule "+10 pp reference must-have completeness":** pooled must-have completeness of C − that of B ≥ 10 percentage points.

## B4. Cross-run matching by quote spans (B and C only)

- For vacancy v, arm a and an ordered pair (i, j) of planned runs: m(i→j) = units of run i matched one-to-one to units of run j / units of run i.
  - A match needs span overlap ≥ 0.5 and the semantic check.
  - If either run failed, m = 0 in the primary figure.
- Vacancy value = the mean of the 6 ordered pairs. Arm value = the macro mean over the 4 vacancies.
- C rule: C − B ≥ 15 percentage points.
- Legacy has no quotes and is "not directly comparable". As a supplementary evaluator-judged measure, the report gives the share of reference items whose matched or unmatched state is the same in all 3 legacy runs.

## B5. Evidence

- **Expected-evidence groups** are the `;`-separated groups in a row's evidence cell; alternatives inside a group are separated by `|`. Counts per repetition: S1 16, S3 31, S4 28, JG 35, so 110.
- **Deterministic row-level hit (B/C).** The coverage row of the unit assigned to the reference row cites an accepted key of the group, under the §0 rules and with a resolving `snapshot_id`. An unassigned reference row misses all of its groups.
- **Verified hit.** A deterministic hit counts as verified only when the evidence actually cited corresponds to the expected fact.
  - A broad career-case identifier (`case:N` or `case:N#section-k`) is a verified hit only when the coverage row uses that case for the fact the group names (for example Cosmos DB for S1 M4, Service Bus for C-S4-3), judged from the row's `notes` and the cited section.
  - A project item key (`#fact-n`, `#wording-n`) is a verified hit when it is cited for the matched requirement.
  - Every rejected or ambiguous hit is listed with the row and the reason.
- **Map recall per run** = hit groups / groups of the vacancy (110 per repetition, denominator 330 per arm).
  - Deterministic and verified recall are reported separately: pooled over the 12 planned runs (failed runs = 0), macro, per vacancy and per run.
  - **The verified figure drives the selection rule** (C +10 pp, and "not worse on map recall").
- **Owner adjudication.** If the deterministic and the verified measure would give a different minimum-bar result or a different selection outcome, the report flags it explicitly and gives both results. The owner adjudicates; the agent does not pick one.
- **Critical evidence (D-6, strict).**
  - Legacy "cites" a critical item in a run when its `01` text names that specific fact as candidate evidence. This is judged by the evaluator, and the quote is recorded.
  - The bar-relevant set K_v = the critical items legacy cites in **at least one** of its 3 runs.
  - A **loss** = a B/C planned run (failed included) whose map lacks a *verified* presence of an item of K_v (see the critical register). Every loss is listed individually by run id and item, with the deterministic presence next to it; none is aggregated away.
  - Minimum bar: zero losses.
  - Supplementary: the loss counts for K_v defined as 2-of-3 and 3-of-3 legacy runs.
  - "C not worse than B on critical evidence" = the total number of (run, item) losses over all 11 critical items, C ≤ B.
- **Ineligible or non-displayable entries.** The projected `01` (B/C) and the legacy `01` are scanned for the titles and aliases of every `cvEligible: false` project and credential, and for the keys of entries with `displayable: no`.
  - A mention that presents the entry as evidence is a violation.
  - A mention that explicitly excludes it is logged but not counted.
  - B/C `01b` entries with `offered_for_display: true` on a non-displayable entry are also violations. The validator should already reject these.
- **Unsupported claims.** Claims in `01` and `01b` notes are compared with the "must not appear" lists and the sources. This is evaluator-judged for every arm, and each finding is quoted.

## B6. Latency

- **Per stage:** `PromptRun.updatedAt − createdAt` from the database.
- **Per analysis:** the sum of its stage runs (C = X1 + X2). The job wall time (enqueue to completion) is reported as supplementary.
- **Arm latency for the ADR-046 rule:** the arithmetic mean over the arm's **completed** analyses. Failed analyses are listed with their durations but are not in the mean. Median, min, max and the number of completed analyses are reported too.
- **C rule:** mean(C) − mean(B) ≤ 30 s.
- Legacy latency is reported for Gate A (≤ 2 × legacy).

## B7. Selection (ADR-046 item 6, as written)

**Minimum bar per arm:**
1. All 3 Jobgether runs correct.
2. No ineligible or non-displayable entry named (B5).
3. Zero critical losses (B5, strict).
4. Pooled completeness ≥ legacy (B3).

**C is selected only if all of these hold:**
- C meets the bar;
- C ≥ B on correctness (count of correct runs out of 12);
- C ≤ B on critical losses;
- C ≥ B on map recall (pooled, deterministic);
- mean(C) − mean(B) ≤ 30 s;
- at least one of: must-have completeness +10 pp; cross-run matching +15 pp; map recall +10 pp; vacancies with all runs agreeing ≥ B + 1.

**Otherwise:** B is selected if it meets the bar. If neither arm meets it, the outcome is revise or stop.

No weighting and no compensation between metrics.

## B8. Costs

- **Measured usage per call** from `AiRun.usageRawJson`:
  - input = `prompt_tokens`, including cache reads and writes;
  - cache read = `cached_tokens`;
  - cache write = `cache_write_tokens`;
  - output = `completion_tokens`, including reasoning;
  - reasoning is reported but not priced again.
- **List price** (table `openai-standard-2026-11-27`, per 1M tokens): uncached input $0.10, cache read $0.01, cache write $0.125, output $0.50. The long-context rates apply above 272K input tokens.
- **With observed caching** = uncached × 0.10 + read × 0.01 + write × 0.125 + output × 0.50, per 1M tokens.
- **Cold-normalized (ADR-046 item 6)** = T × 0.01 + (input − T) × 0.125 + output × 0.50, per 1M tokens, where T is the template tokens of the stage:
  - prompt_1 v13: 7,437 (the measured template-prefix cache read of earlier runs);
  - X1 ≈ 2,600, X2 ≈ 4,800, B ≈ 6,600, estimated from characters at the same 4.69 chars/token and labelled as estimates.
  - A **fully-cold** upper bound (all input at the write rate) is reported too.
- **Unmeasured usage:** cost "unknown" and listed. It is never treated as 0.
- **Projections** for 100 and 1,000 vacancies = the mean per completed analysis × N, cold-normalized and with observed caching, labelled as estimates.
- **Measured usage, list-price estimates and invoiced amounts stay separate.** Invoices are not available to the application.

---

# Part C — Frozen run conditions

These are the conditions every pilot run must meet. Before any provider call they are checked against the pilot environment, and the report records them as measured.

- **Application commit:** `main` @ `ff05eebc87c537e18b569e87cae6b2fd581e48b2`, run from a separate worktree.
- **Provider and model:** `openai` / `gpt-6-luna`, `OPENAI_TIMEOUT_MS=600000`, `OPENAI_MAX_RETRIES=0`. Output caps are the code defaults: `prompt_1` 16000, `analysis_x1` 8000, `analysis_x2` 24000, `analysis_b` 24000. No automatic retry: jobs keep `attempts: 1` and `maxStalledCount: 0`.
- **Context profile:** `single` / `full` for every fork. No `01a` carry-over.
- **Templates (file sha256):**
  - `prompt1_v13.txt` `7879e9fd6e654cee91bb109d1a126be47edba0d100d3c3ace88f2d9bcdc9cfab` (legacy `prompt_1` v13);
  - `structured-analysis/shared-rules.txt` `7ef2453bcd00cba1bbebe19bcbf7788808810ba0324c06e6d5a2cfb34fee5deb`;
  - `structured-analysis/requirements-extraction.txt` `429bb0934fdcf34dba2a51f6df2c60c564b08195304d243bd99aeb72fa5de510`;
  - `structured-analysis/fit-assessment.txt` `8f86bdc9e3fa5225c90760b518e1db344e8d163b7ba683c7a0493d760495afc6`;
  - `analysis_x1`, `analysis_x2` and `analysis_b` v1 are composed by the seed from these fragments. The seeded content hashes are recorded in the report.
- **Active knowledge sources (`contentHash`, equal to the working database on 2026-11-27):**
  - `career_cases` v0_9_portfolio_refresh `352b3a155595d98912ba40f2fa5677cb5c583fbcfd329539f5980388b2bc30fb`
  - `certifications` 2026-11_credential_refresh `b65ba9b1548e17f037327d840ccacbf2535f13ac628d3c4847757e8bc3fa4754`
  - `cv_rules` v0_10_credential_output `7c7dc0c164a5d483b1a40e07ef50af1d27aa0c990c51026683bd0faf97628a2e`
  - `layout` 2026-06 `b8f9fba169d1fc1de4fe954ebc589db4bb69505a20276eccd0f7961dfb6c131b`
  - `linkedin_source_decision` v0_3_current_work_sync `02b0893b377c340dc12f00ce9c98e1ad91f9a48dccd30976b8b4bf830a97c5f2`
  - `master_cv` v0_8_portfolio_refresh `fa6946b60d13547ddb5bd0f9024ea456c29252e1c5699a698e6498163fd11651`
  - `profile_summary` v0_8_portfolio_refresh `83083f24ea47b65166b67983b2ac44cda6d306dcf719ece42b3e5b13b23f7be5`
  - `project_inventory` v0_8_portfolio_refresh `f1ad290a118ded5c6dc5d7493892a571f81495aa1fadb1067fed005ce52c829b`
  - `tech_stack` v2_6_credential_refresh `a8984a51ece2a32b1982c943c95e8355e49020a430a89dc89c912f3d305f9d6d`
- **Vacancy inputs:** the four `00` hashes above. The company and role values are those of the Baseline B source workspaces. There are no manual notes.
- **Environment:** database `jobflow_test_t7_p1`, queue prefix `test_t7_p1`, storage root `apps/api/storage/TEST_T7_P1_storage/`, API port 3100, web port 3101, batch `TEST_T7_P1`. The test marker is `sourceUrl` `https://test-t7.invalid/TEST_T7_P1/<vacancy>`.
- **Execution order:** the balanced order below. Analyses run one at a time, and before each one a budget check runs: accumulated list-price cost plus the worst-case cost of the next complete job must stay within $1.20. The operational budget is $1.50. Neither figure is a provider-enforced limit.

| Repetition | Order (vacancy-arm) |
|---|---|
| R01 | S1-L, S1-B, S1-C, S3-B, S3-C, S3-L, S4-C, S4-L, S4-B, JG-L, JG-B, JG-C |
| R02 | S3-C, S3-L, S3-B, S4-L, S4-B, S4-C, JG-B, JG-C, JG-L, S1-B, S1-C, S1-L |
| R03 | S4-B, S4-C, S4-L, JG-C, JG-L, JG-B, S1-C, S1-L, S1-B, S3-L, S3-B, S3-C |
