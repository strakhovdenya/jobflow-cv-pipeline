# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — OnlyMonster — Senior Backend Engineer (Automation)

Date analyzed: 2026-08-04
Company: OnlyMonster
Role: Senior Backend Engineer (Automation)
Location / remote: Fully remote; global candidates considered
Core stack: Node.js, TypeScript, microservices, TimescaleDB/PostgreSQL, Kafka/RabbitMQ/SQS, AWS/GCP, Docker, Kubernetes, AI coding agents
Final score: 61/100
Decision: SKIP

## Main skip reason
Роль требует Senior-level production ownership сразу в нескольких областях, где мой подтверждённый опыт либо ограничен, либо отсутствует: high-availability microservices, AWS/GCP, Kubernetes, message queues/event buses и TimescaleDB. Дополнительно компания ожидает доказанный production-процесс, в котором AI coding agents пишут основную часть кода, а инженер поддерживает полноценный AI harness с автоматической валидацией и verification.

## Key mismatches
- Нет подтверждённого production-опыта с AWS или GCP.
- Kubernetes — только basic/training exposure, без production ownership.
- Kafka, RabbitMQ и SQS не подтверждены; есть Azure Service Bus, но это лишь частично переносимый опыт.
- TimescaleDB и time-series workloads не подтверждены.
- Не подтверждено проектирование high-availability/fault-tolerant microservices на Senior ownership level.
- AI-assisted workflow хорошо представлен в personal portfolio, но нет подтверждённого коммерческого опыта shipping production code mainly through AI agents.

## Evidence from my profile
- Сильный коммерческий Node.js/TypeScript backend опыт в EPAM.
- Production Azure Functions / Durable Functions, интеграции, retries, idempotency, Application Insights/KQL.
- Подтверждённый Azure Service Bus experience в event-driven notification flows.
- JobFlow показывает ежедневную работу с Claude Code, review gates, automated checks и AI-assisted engineering, но остаётся personal/portfolio evidence.

## Risks if applying anyway
- CV пришлось бы слишком сильно строить вокруг personal AI tooling вместо коммерческого production evidence.
- Возникнет риск overclaim по Kubernetes, cloud portability и microservices architecture.
- На system design интервью вероятны глубокие вопросы по HA, fault tolerance, queues, AWS/GCP и high-load.
- Работодатель может ожидать уже готовый production AI harness, а не portfolio implementation.
- Senior title повышает требования к architecture ownership и автономности.

## Useful keywords to track later
- AI coding agents
- AI harness
- automated code verification
- TimescaleDB
- Kafka / RabbitMQ / SQS
- high availability
- fault-tolerant microservices
- Kubernetes production operations
- AWS/GCP backend architecture

## Future reconsideration condition
Рассматривать похожие вакансии можно после появления подтверждённого production или сильного public-project evidence минимум по трём направлениям: message queues/event bus, Kubernetes/cloud deployment и high-availability microservices. Для AI-first ролей также нужен публично демонстрируемый AI harness с автоматическими tests, lint, typecheck, security checks и regression validation.
