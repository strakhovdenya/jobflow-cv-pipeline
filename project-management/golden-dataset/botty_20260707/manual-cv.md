# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Botty — Senior Back-end Developer Node.js / NestJS

Date analyzed: 2026-07-07
Company: Botty
Role: Senior Back-end Developer
Location / remote: fully remote; company/product context Ukraine / international markets
Core stack: Node.js, TypeScript, NestJS, PostgreSQL, RabbitMQ, microservices, Docker, Kubernetes, Grafana/Prometheus/ELK, CI/CD, highload, Crypto/FinTech/Trading
Final score: 56/100
Decision: SKIP

## Main skip reason
Главный blocker — Senior highload backend role с несколькими core-требованиями, где мой подтверждённый опыт слабый или отсутствует: RabbitMQ, production Kubernetes/Docker ownership, Grafana/Prometheus/ELK metrics setup, commercial NestJS production, crypto/trading domain. Чтобы выглядеть сильным кандидатом, пришлось бы завышать опыт.

## Key mismatches
- RabbitMQ указан как практический core requirement: проектирование очередей, обработка сообщений, reliability и scalability async процессов; в моих sources нет подтверждённого RabbitMQ production experience.
- Docker/Kubernetes требуются практически в production: контейнеризация, deploy, scaling, поддержка сервисов; у меня Docker — local/personal, Kubernetes — basic/training exposure.
- Monitoring stack Grafana/Prometheus/ELK требуется для диагностики и метрик; мой подтверждённый production observability — Azure Application Insights/KQL, не Grafana/Prometheus setup.
- NestJS требуется как backend framework; мой NestJS сейчас personal/portfolio через JobFlow, не commercial production.
- Crypto/FinTech/Trading domain и order-processing/low-latency trading logic отсутствуют в подтверждённом commercial experience.
- Senior role требует высокого ownership, mentorship, architecture influence и fault tolerance for critical components; часть этого есть в EPAM, но не в их core stack.

## Evidence from my profile
- Strong commercial Node.js/TypeScript backend experience from EPAM, including REST/API integrations and production backend services.
- Strong PostgreSQL foundation from Factor–IT: complex SQL, migrations, indexes, data integrity and performance analysis.
- Relevant production reliability experience: ProductsUp long-running sync, retries, idempotency, per-locale logging, Azure Application Insights/KQL debugging.
- CI/CD and Terraform/Azure DevOps collaboration exist, but not DevOps/platform ownership.

## Risks if applying anyway
- CV would need to overemphasize NestJS, Docker, Kubernetes and monitoring beyond confirmed evidence.
- Interview could quickly go deep into RabbitMQ design, queue reliability, DLQ/retry strategy, backpressure, scaling and message ordering — [needs evidence].
- Crypto exchange integrations, trading orders, latency and capital-risk/security topics are domain gaps.
- Senior-level expectations around architecture and production platform ownership could expose mismatch.
- Fully remote is good, English B1+ is acceptable for the vacancy, but senior communication expectations remain a risk.

## Useful keywords to track later
- RabbitMQ
- message queues / async processing
- NestJS production architecture
- Kubernetes production deployment
- Grafana / Prometheus / ELK
- highload REST API optimization
- trading systems / order management
- crypto exchange integrations
- fault tolerance
- secure API integrations

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если роль будет Mid / Middle+ или Backend Node.js с RabbitMQ/Kubernetes/Grafana как nice-to-have, а не core; либо после появления реального portfolio/commercial evidence по NestJS + RabbitMQ + Docker/Kubernetes deployment + monitoring metrics.
