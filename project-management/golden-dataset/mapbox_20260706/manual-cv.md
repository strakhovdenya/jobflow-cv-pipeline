# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Mapbox — Software Development Engineer III, Telemetry

Date analyzed: 2026-07-06
Company: Mapbox
Role: Software Development Engineer III, Telemetry
Location / remote: Not specified in the provided vacancy text
Core stack: high-volume backend services, petabyte-scale streaming data pipelines, Python, Node.js, TypeScript, Rust, C++, AWS CDK/ECS/Fargate/Step Functions/Lambda/S3
Final score: 43/100
Decision: SKIP

## Main skip reason
Главный blocker: роль требует senior-level / SDE III опыта в scalable high-volume low-latency backend services и 3+ года petabyte-scale streaming pipelines. В моём профиле есть сильный backend/integration/serverless production experience, но нет подтверждённого commercial streaming pipeline / petabyte-scale telemetry опыта и нет commercial AWS stack ownership.

## Key mismatches
- Требуется 8+ лет scalable high-volume low-latency backend services; мой основной современный Node.js/TypeScript commercial stack — Nov 2021 – May 2025, плюс более ранний PHP/PostgreSQL backend foundation.
- Требуется 3+ года streaming pipelines capable of handling petabytes of data; у меня есть long-running ProductsUp sync и data-processing workflows, но не petabyte-scale streaming telemetry pipelines.
- Основной cloud stack вакансии — AWS CDK, ECS, Fargate, Step Functions, Lambda, S3; мой production cloud stack — Azure Functions, Durable Functions, Cosmos DB, Blob Storage, Application Insights.
- Роль требует broad multi-language readiness: Python, NodeJS, TypeScript, Rust, C++; коммерчески подтверждены Node.js/TypeScript, Python/FastAPI только personal/coursework, Rust/C++ не поддержаны.
- Seniority / scope: новая Telemetry team from the ground up, company-wide scope, operational excellence, on-call, high autonomy. Это выше текущего безопасного positioning без overclaiming.

## Evidence from my profile
- Strong confirmed: EPAM production backend experience with Node.js/TypeScript, Azure Functions/Durable Functions, integrations, testing and production debugging.
- Strong confirmed but not enough: ProductsUp sync flow with Azure Durable Functions, CommerceTools enrichment, Blob Storage, retries, idempotency and 20,000–40,000 products per sync.
- Relevant but cautious: Azure Application Insights/KQL production debugging and observability mindset.
- Supporting only: AI workflow / JobFlow and Python/FastAPI learning are personal/portfolio evidence, not commercial production.

## Risks if applying anyway
- CV would need to stretch ProductsUp sync into streaming telemetry / big-data pipeline experience, which would be overclaiming.
- AWS CDK/ECS/Fargate/Step Functions/Lambda/S3 would be a major interview gap.
- Rust/C++ and production Python would be unsupported or weak.
- Senior SDE III expectations may expose gaps in system design for petabyte-scale data pipelines.
- Location/remote policy is not visible in the provided text, so logistical fit is unclear.

## Useful keywords to track later
- telemetry
- high-throughput streaming pipelines
- low-latency backend services
- observability platforms
- AWS Step Functions
- AWS Lambda
- AWS ECS / Fargate
- S3 data pipelines
- data security standards
- on-call operational excellence

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если роль будет Mid Backend / Integration Engineer, где streaming pipelines are nice-to-have, а core stack ближе к Node.js/TypeScript + Azure/serverless/API integrations. Для Senior telemetry/data-platform ролей нужно сначала получить или доказать production evidence по AWS и streaming/data pipelines.
