# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Factor Eleven — Staff Backend Engineer

Date analyzed: 2026-07-07
Company: Factor Eleven
Role: Staff Backend Engineer
Location / remote: [needs evidence] — в загруженном тексте location и remote/hybrid не указаны
Core stack: Node.js backend, event-driven architecture, Kafka, distributed systems, state machines, async workflows, PDF/document generation, DocuSign integrations, observability
Final score: 55/100
Decision: SKIP

## Main skip reason

Главный blocker — Staff-level technical ownership / architecture leadership с core Kafka, event sourcing, state machines, DocuSign/order-contract domain и cross-functional Product/Legal/Ops alignment. В профиле есть сильный Node.js/TypeScript backend, production integrations, retries, idempotency and observability, но нет подтверждённого lead/staff-level ownership of complex distributed systems and deep production Kafka/event sourcing evidence.

## Key mismatches

- Роль требует Staff-level technical authority and architectural ownership for a greenfield Order Management domain; мой strongest evidence больше про implementation/key contribution, not staff-level domain authority.
- Kafka указан как особенно важный event-driven requirement; в Sources нет подтверждённого production Kafka experience.
- Требуются event sourcing, state machines, reconciliation, eventual consistency and failure recovery as deep architecture-level topics; часть пересекается с Durable Functions/ProductUp, но не на требуемом Staff/Kafka уровне.
- Требуется ownership of PDF generation pipeline, contract library, DocuSign/e-signature integrations and legal order lifecycle; JobFlow даёт personal PDF/export evidence, но не commercial contract/e-signature production.
- Нужна сильная cross-functional работа с Product, Legal, Operations and Engineering leadership; есть QA/BA/PM/PO/team collaboration, но direct Legal/Ops/domain decision ownership — [needs evidence].
- Location / remote не указаны, что создаёт практический риск для Германии/remote EU стратегии.

## Evidence from my profile

- Strong commercial Node.js/TypeScript backend production experience at EPAM with REST APIs, backend business logic, integrations, testing and production debugging.
- ProductsUp sync case: Azure Durable Functions, long-running workflow, retries, idempotency, partial failure handling, Blob Storage and observability — relevant, but not Kafka/event-sourcing/staff ownership.
- Amplience and CommerceTools integrations show third-party API integration and e-commerce/data workflow experience.
- JobFlow CV Pipeline supports document generation / AI-assisted workflow angle, but only as personal/portfolio evidence, not commercial production.

## Risks if applying anyway

- CV would need to overemphasize architecture leadership and domain ownership beyond confirmed evidence.
- Interview could focus on Kafka, event sourcing, reconciliation and distributed systems design at Staff level, where evidence is weak / [needs evidence].
- DocuSign, contract management and legal workflow questions would require speculative answers.
- English communication may be tested at senior/staff leadership level; safe profile is English B1/B1+ professional working use, not fluent.
- Remote/location conditions are unknown and may make the role impractical.

## Useful keywords to track later

- Kafka
- event sourcing
- state machines
- reconciliation
- eventual consistency
- DocuSign
- contract management
- document generation pipeline
- RFCs / design docs
- Staff Backend Engineer
- technical authority without people management

## Future reconsideration condition

Похожие роли можно рассматривать позже, если это Senior Backend rather than Staff, Kafka/event sourcing are optional rather than core, location/remote is clearly compatible, and the role accepts Azure Durable Functions / integration-heavy Node.js experience as transferable architecture evidence.
