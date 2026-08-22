# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — MEV — Senior Backend Engineer

Date analyzed: 2026-06-24
Company: MEV
Role: Senior Backend Engineer / Senior Software Engineer
Location / remote: Львов, Черкассы, за рубежом, удаленно; outstaffing team extension; daily overlap until 8:00 PM EEST
Core stack: TypeScript, Node.js, Express, PostgreSQL, MongoDB, RabbitMQ, Redis
Final score: 62/100
Decision: SKIP

## Main skip reason
Главный blocker — Senior outstaffing/client-facing роль с несколькими core gaps одновременно: MongoDB и RabbitMQ требуются как hands-on/core, Express указан в основном стеке, плюс нужен Upper-Intermediate English и прямое взаимодействие с клиентским PO/stakeholders. Для apply пришлось бы завышать MongoDB/RabbitMQ/Express и senior communication readiness.

## Key mismatches
- MongoDB указан как solid experience, но у меня это internship/training exposure, не commercial production.
- RabbitMQ/message queuing указан как hands-on requirement, а у меня подтверждён Azure Service Bus subscriptions / event-driven flow, но не RabbitMQ.
- Express указан в основном стеке, но подтверждён только training/internship exposure; основной production Node.js стек был Azure Functions / serverless.
- Роль Senior с high ownership: system hardening, fault tolerance, performance profiling, architecture hardening, direct PO/client collaboration.
- Upper-Intermediate English minimum выше моего safe level: English B1/B1+ professional working use.
- Outstaffing/client-facing формат усиливает риск по коммуникации и senior autonomy.

## Evidence from my profile
- Сильное совпадение по TypeScript/Node.js, REST/API integrations, backend production work.
- Есть PostgreSQL foundation из Factor–IT: complex SQL, migrations, indexes, transactions, data integrity.
- Есть Redis commercial working experience: selected API/cache/navigation use cases.
- Есть production debugging/observability evidence: Application Insights/KQL, notification incident, logs/alerts.
- Есть async/event-driven transferable experience через Azure Service Bus subscriptions and Azure Durable Functions, но это не RabbitMQ.

## Risks if applying anyway
- На интервью могут глубоко проверять MongoDB schema/query/indexing/production issues — evidence слабый.
- RabbitMQ может быть core topic: queues, exchanges, routing, retries, DLQ, delivery guarantees — needs evidence.
- Senior-level system hardening/performance ownership может потребовать архитектурной автономии выше подтверждённого уровня.
- Direct client communication and Upper-Intermediate English могут стать rejection point.
- Targeted CV пришлось бы слишком заметно поднимать Express/MongoDB/RabbitMQ, что создаёт overclaiming risk.

## Useful keywords to track later
- System hardening
- Fault-tolerance patterns
- Advanced error handling
- Data validation
- RabbitMQ
- MongoDB production experience
- APM / structured logging / metrics
- Performance profiling / memory optimization
- Legacy modernization
- E-signature workflows
- Notification system design
- Startup ownership
- Client-facing product collaboration

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если RabbitMQ/MongoDB будут nice-to-have, а не core must-have; если роль будет Middle/Middle+ без heavy client-facing senior expectations; или после подготовки/портфолио-практики с RabbitMQ + MongoDB + Express на production-like проекте и прокачки English до устойчивого Upper-Intermediate speaking level.
