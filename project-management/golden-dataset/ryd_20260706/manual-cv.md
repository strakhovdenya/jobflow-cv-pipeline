# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — ryd — Backend Developer Node.js (m/f/d)

Date analyzed: 2026-07-06
Company: ryd GmbH
Role: Backend Developer Node.js (m/f/d)
Location / remote: Remote, but residence in Portugal is required
Core stack: Node.js, TypeScript, Docker, PostgreSQL, Kafka, microservices, event-driven integrations
Final score: 61/100
Decision: SKIP

## Main skip reason
Главный blocker — location/remote policy: вакансия remote, но прямо требует жить в Portugal. Профиль ориентирован на Cologne / Germany / remote EU, без подтверждённой готовности переезда в Portugal.

## Key mismatches
- Remote доступен только при проживании в Portugal; это не совпадает с текущей локацией Cologne, Germany.
- Kafka указан как часть core stack/event-driven platform; commercial Kafka evidence в профиле не подтверждён.
- Docker присутствует в вакансии как рабочая технология, но в профиле Docker безопасен в основном как local/personal/tooling experience, не production platform ownership.
- Роль требует ownership from day one и scaleup/startup mindset; прямой founder-facing/customer-centric product ownership evidence ограничен / [needs evidence].
- Payment processing / PCI-DSS / payment gateways — bonus, но такого commercial domain evidence нет.

## Evidence from my profile
- Сильное совпадение по Node.js / TypeScript backend production experience из EPAM.
- Сильное совпадение по system integrations: Amplience, CommerceTools, ProductsUp, external API/data workflows.
- Есть PostgreSQL production foundation из Factor–IT и personal/current PostgreSQL practice.
- Есть production reliability evidence: Azure Durable Functions, retries, idempotency, Application Insights/KQL, production debugging.

## Risks if applying anyway
- Вероятный быстрый отказ из-за требования проживания в Portugal.
- Для релевантности пришлось бы слишком сильно подсвечивать Kafka/Docker, где evidence слабее.
- Payment/security domain пришлось бы оставить как transferable, без прямого commercial proof.
- Seniority/ownership expectations могут быть выше, чем безопасно доказывать без overclaim.

## Useful keywords to track later
- Kafka
- Event-driven microservices
- Payment processing
- PCI-DSS
- Payment gateways
- Data parsing / serialization
- PostgreSQL performance optimization
- Docker production workflows

## Future reconsideration condition
Похожие вакансии стоит рассматривать, если remote доступен из Germany / EU без Portugal residence requirement, Kafka является nice-to-have, а не core blocker, и роль принимает transferable integration-heavy Node.js/TypeScript experience вместо прямого payment-domain background.
