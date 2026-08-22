# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Miratech — Senior Backend Engineer Node.js

Date analyzed: 2026-07-10
Company: Miratech
Role: Senior Backend Engineer
Location / remote: ForeverRemote / remote work culture; exact hiring countries not specified
Core stack: Node.js, TypeScript, REST, GraphQL, PostgreSQL, microservices, Kafka, Temporal.io, Docker, Kubernetes/EKS, AWS
Final score: 59/100
Decision: SKIP

## Main skip reason

Главный blocker — роль Senior Backend Engineer с несколькими core-технологиями, где профиль Denys имеет слабое или неподтверждённое evidence: Kafka, Temporal.io, AWS cloud services и Kubernetes/EKS. Node.js/TypeScript/API/PostgreSQL/integrations совпадают хорошо, но targeted CV пришлось бы слишком сильно натягивать под event-driven/AWS/Kubernetes expectations.

## Key mismatches

- Kafka указан как hands-on requirement для event-driven systems; подтверждённого Kafka production evidence нет.
- Temporal.io указан как workflow orchestration requirement; есть Azure Durable Functions experience, но Temporal production evidence отсутствует.
- AWS cloud services требуются practically; основной commercial cloud evidence — Azure Functions/Durable Functions, не AWS.
- Docker + Kubernetes/EKS указаны как proficient requirement; Kubernetes есть только basic/training exposure, Docker в основном local/personal/portfolio use.
- Роль Senior и consulting/client enterprise context повышают ожидания по autonomy, architecture and production ownership.
- Telecom/VoIP domain является nice-to-have, но прямого SIP/signaling/voice infrastructure evidence нет.

## Evidence from my profile

- Strong commercial Node.js/TypeScript backend experience from EPAM production e-commerce platform.
- Strong REST/API integrations evidence: Amplience, CommerceTools, ProductsUp.
- Strong PostgreSQL foundation from Factor–IT financial/accounting systems.
- Long-running workflow evidence exists through Azure Durable Functions / ProductsUp sync, but it is not Temporal.
- Event-driven/backend reliability evidence exists through Azure Functions and Azure Service Bus-related flows, but it is not Kafka.

## Risks if applying anyway

- Interview may quickly focus on Kafka partitions/consumer groups/idempotency/exactly-once semantics where evidence is weak.
- Temporal questions may require direct workflow/activity/retry/saga experience, not just conceptual transfer from Durable Functions.
- AWS/EKS/Kubernetes expectations may look like platform ownership rather than developer collaboration.
- Senior-level architecture discussion could expose gaps around microservices in AWS/EKS/Kafka stack.
- CV would need to overemphasize transferable Azure/Durable Functions experience to compensate for missing core stack.

## Useful keywords to track later

- Kafka
- Temporal.io
- AWS Lambda / ECS / EKS
- Kubernetes production basics
- Event-driven architecture
- Workflow orchestration
- Telecom / VoIP / SIP
- RBAC / MFA
- Billing pipelines
- API contracts / GraphQL

## Future reconsideration condition

Похожие вакансии можно рассматривать позже, если Kafka/Temporal/AWS/Kubernetes будут listed as nice-to-have rather than core requirements, либо после появления практического portfolio/commercial evidence по Kafka + AWS + Kubernetes basics. Также можно рассматривать Azure-based event-driven backend roles, где Durable Functions, Service Bus, Azure Functions and API integrations являются основным стеком.
