# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Toogeza / Spinlab — Full-Stack Developer

Date analyzed: 2026-07-16
Company: Toogeza (recruiting for Spinlab)
Role: Full-Stack Developer
Location / remote: Germany listing; remote, full-time; exact employment/payroll geography is unclear
Core stack: TypeScript, Node.js, NestJS, ClickHouse, Kafka, advanced Redis, browser SDKs, Docker, Helm, ArgoCD, GitHub Actions, Datadog
Final score: 49/100
Decision: SKIP

## Main skip reason

Роль требует не просто Node.js/TypeScript, а подтверждённый production-опыт сразу в нескольких специализированных core-зонах: 2+ года NestJS, Kafka producer, clustered ClickHouse, advanced Redis, browser internals и разработка third-party browser SDK. В моём профиле эти требования либо не подтверждены, либо относятся только к personal/basic exposure. Для убедительной подачи пришлось бы существенно завышать опыт.

## Key mismatches

- Нет подтверждённых 2+ лет commercial production experience с NestJS; текущий NestJS — personal portfolio через JobFlow.
- Нет подтверждённого опыта с Kafka producer.
- Нет подтверждённого опыта с clustered ClickHouse и ClickHouse migrations.
- Redis подтверждён для caching/navigation performance, но не pipelines, Lua scripting и distributed locks.
- Нет подтверждённого опыта с browser internals: Canvas, WebGL, AudioContext, cross-origin iframes, storage partitioning.
- Нет подтверждённого опыта выпуска third-party browser SDK под строгие size/privacy constraints.
- Helm/ArgoCD/platform automation и Datadog/SLO ownership не подтверждены.

## Evidence from my profile

- Strong commercial Node.js/TypeScript backend experience in production Azure serverless systems.
- Strong experience with API integrations, retries, idempotency, caching and long-running workflows.
- Commercial Redis caching contribution with 2x+ navigation/menu retrieval improvement, but not the advanced Redis scope required here.
- Production debugging and observability with Azure Application Insights/KQL, but not Datadog/SLO ownership.

## Risks if applying anyway

- CV would need to overemphasize personal NestJS experience as production experience.
- Likely rejection during technical screening on Kafka, ClickHouse, advanced Redis and browser SDK internals.
- Senior/product-engineer expectations include direct product/business collaboration and infrastructure contribution beyond current evidence.
- English RFC/stakeholder communication may be demanding relative to safe English B1/B1+ level.
- Exact German employment/payroll setup is unclear, so EGZ applicability cannot be assumed.

## Useful keywords to track later

- Kafka producer
- ClickHouse clustering and migrations
- Redis pipelines, Lua scripts, distributed locks
- Browser SDK architecture
- Canvas / WebGL / AudioContext fingerprinting
- Safari/iOS browser compatibility
- Datadog APM and SLO alerts
- Helm and ArgoCD

## Future reconsideration condition

Рассматривать похожую вакансию позже, если core browser SDK requirements станут optional, а основой роли останутся Node.js/TypeScript backend integrations; либо после получения подтверждённого production experience с NestJS и хотя бы двумя из трёх направлений: Kafka, ClickHouse, advanced Redis.
