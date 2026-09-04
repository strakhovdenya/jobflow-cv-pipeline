# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Sumisni — Node.js Backend Developer

Date analyzed: 2026-07-15
Company: Sumisni / product company partner
Role: Node.js Backend Developer (Project / Contract)
Location / remote: not clearly specified; project/contract format, possible full-time during project
Core stack: Node.js, high-load backend, real-time data processing, TCP/IP, EGTS, Protobuf; Redis/RabbitMQ/Kafka/PostgreSQL/ClickHouse/MongoDB/Docker/Kubernetes as plus
Final score: 55/100
Decision: SKIP

## Main skip reason
Главный blocker — роль требует узкого технического эксперта по high-load real-time telemetry backend с обязательным опытом EGTS и Protobuf, а в профиле нет подтверждённого опыта EGTS, Protobuf, GPS/IoT/телематики и real-time telemetry platforms. Для проектного контракта ожидают не обучение, а быстрое решение конкретной performance-проблемы.

## Key mismatches
- EGTS указан как обязательный протокол, но в профиле нет подтверждённого опыта EGTS: [needs evidence].
- Protobuf указан как обязательный опыт, но в профиле нет подтверждённого commercial Protobuf evidence: [needs evidence].
- Real-time telemetry / GPS / IoT domain отсутствует в подтверждённом коммерческом опыте.
- Роль выглядит как short-term expert audit/performance rescue, а не обычная backend developer позиция с onboarding.
- High-load real-time message processing и TCP/IP/protocol-level optimization не являются сильной подтверждённой зоной профиля.
- Kubernetes указан как плюс, но опыт Kubernetes только basic/training exposure.

## Evidence from my profile
- Есть сильный commercial Node.js/TypeScript backend experience в EPAM, включая Azure Functions, Durable Functions, integrations, data-processing flows and production debugging.
- Есть опыт обработки больших объёмов product data в ProductsUp sync: примерно 20,000–40,000 products per sync, Durable Functions, Blob Storage, retries, idempotency and Application Insights logging.
- Есть Redis caching experience и PostgreSQL foundation, что частично релевантно к performance/database/cache optimization.
- Есть production debugging with Application Insights/KQL and Jest testing, но это не заменяет protocol-level telemetry experience.

## Risks if applying anyway
- Придётся слишком сильно растягивать ProductsUp/data-processing case под real-time telemetry, хотя это batch/scheduled data sync, не telemetry stream.
- На интервью быстро проверят EGTS, Protobuf, TCP/IP и profiling/bottleneck analysis; без доказательств риск отказа высокий.
- Targeted CV пришлось бы overemphasize high-load/performance expertise beyond confirmed evidence.
- Contract/project format снижает шанс, что компания будет готова к долгому onboarding.
- Роль может требовать immediate expert contribution alongside current Backend Engineer.

## Useful keywords to track later
- Node.js performance profiling
- Protobuf
- EGTS
- real-time telemetry
- GPS / IoT platforms
- Kafka / RabbitMQ
- ClickHouse
- high-load API latency optimization
- TCP/IP protocol-level backend

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если EGTS/Protobuf будут nice-to-have, а core будет Node.js/TypeScript backend, Redis/PostgreSQL, queues, API optimization and production debugging. Также можно вернуться к этому направлению после отдельного pet/project proof around Protobuf + real-time message processing + telemetry-like data pipeline.
