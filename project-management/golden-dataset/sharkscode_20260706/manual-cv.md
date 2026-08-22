# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — SharksCode — Node.js Backend Developer (NestJS)

Date analyzed: 2026-07-06
Company: SharksCode
Role: Node.js Backend Developer (NestJS)
Location / remote: Kyiv office mentioned; remote/hybrid not specified
Core stack: Node.js, TypeScript, NestJS, PostgreSQL, MySQL, MongoDB, microservices, RabbitMQ, Kafka, Redis, Jest, Docker, Kubernetes, CI/CD, WebSocket/gRPC
Final score: 52/100
Decision: SKIP

## Main skip reason
Главный blocker — роль выглядит как Senior backend/platform позиция с ожиданием 5+ лет commercial Node.js, production NestJS, microservices, RabbitMQ/Kafka, Kubernetes и distributed/event-driven architecture. У Дениса сильный commercial Node.js/TypeScript/Azure/API integration background, но несколько core requirements подтверждены только частично, personal/training-only или [needs evidence].

## Key mismatches
- Вакансия требует 5+ лет commercial backend development with Node.js; подтверждённый современный commercial Node.js/TypeScript период — Nov 2021–May 2025, то есть меньше 5 лет.
- NestJS указан как 3+ years или быстрое освоение; подтверждённый NestJS сейчас — portfolio/personal JobFlow, не commercial production.
- RabbitMQ/Kafka/event-driven architecture — core requirement; подтверждён Azure Service Bus subscriptions, но RabbitMQ/Kafka production evidence отсутствует.
- Docker/Kubernetes/CI/CD выглядят как core platform expectations; Docker в основном local/personal, Kubernetes basic/training exposure, CI/CD — participation/collaboration, не platform ownership.
- Database requirements включают PostgreSQL, MySQL, MongoDB; сильный PostgreSQL есть, MongoDB только internship/training, MySQL [needs evidence].
- Location/remote unclear: вакансия упоминает office in Kyiv, а целевой формат Дениса — Germany / remote EU / Cologne.

## Evidence from my profile
- Commercial Node.js/TypeScript backend experience в EPAM с Azure Functions, Durable Functions, REST/API integrations, CommerceTools, Amplience, ProductsUp.
- Strong PostgreSQL foundation из Factor–IT: financial/accounting systems, complex SQL, migrations, data integrity.
- Redis used commercially for selected API/navigation caching, but not enough for Pub/Sub/distributed synchronization claim.
- Current JobFlow portfolio supports NestJS/TypeScript learning, but only as personal/portfolio evidence.

## Risks if applying anyway
- CV пришлось бы сильно растягивать под NestJS, RabbitMQ/Kafka, Kubernetes and distributed systems.
- На technical interview вероятны вопросы по Kafka/RabbitMQ, K8s, gRPC/WebSocket, integration tests and high-load architecture, где evidence слабый или [needs evidence].
- Seniority mismatch из-за 5+ years Node.js requirement.
- Remote/location could become blocker if Kyiv office presence is expected.
- Риск overclaiming Docker/Kubernetes/CI/CD ownership.

## Useful keywords to track later
- NestJS production architecture
- RabbitMQ
- Kafka
- Event-driven architecture
- Kubernetes
- gRPC
- WebSocket
- Integration testing with Jest
- Observability: Prometheus, Grafana, OpenTelemetry, ELK

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если RabbitMQ/Kafka и NestJS будут не core requirements, а nice-to-have; если remote from Germany clearly supported; или если появится подтверждённый production/portfolio evidence по NestJS microservices, queues, integration tests and deployment/container orchestration.
