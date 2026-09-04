# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — Wildix — Backend Developer

Date analyzed: 2026-07-01
Company: Wildix
Role: Backend Developer
Location / remote: Remote-first / global team; headquarters Tallinn, Estonia
Core stack: PHP 8.x and/or Go, AWS Lambda, API Gateway, SQS, AWS SAM, Redis/ElastiCache, MySQL/MSSQL, SAP, Salesforce, Stripe/SureTax integrations
Final score: 53/100
Decision: SKIP

## Main skip reason
Главный blocker — core stack mismatch. Вакансия AWS-heavy и ориентирована на PHP 8.x / Go backend в бизнес-платформе с SAP/Salesforce/Stripe интеграциями. Мой основной актуальный commercial stack — Node.js / TypeScript / Azure serverless, а PHP — сильный, но прошлый foundation, не текущий target stack. Go, AWS Lambda/SQS/API Gateway/AWS SAM, SAP B1, Salesforce и Stripe production evidence отсутствуют или требуют [needs evidence].

## Key mismatches
- Core language mismatch: PHP 8.x and/or Go required; PHP есть как past commercial PHP 7.x, Go не подтверждён.
- Cloud mismatch: роль AWS-heavy; мой production cloud evidence — Azure Functions / Durable Functions, не AWS.
- IaC mismatch: требуется AWS SAM; у меня Terraform configuration support в Azure context, не SAM.
- Database mismatch: требуется MySQL / MSSQL; сильная база — PostgreSQL, MySQL/MSSQL commercial evidence [needs evidence].
- Testing mismatch: требуется PHPUnit / Go testing; подтверждён Jest для backend, Pytest personal, PHPUnit/Go testing [needs evidence].
- English B2+ required; мой safe level — English B1/B1+ professional working use, это interview/communication risk.

## Evidence from my profile
- Strong backend/API integration background: Amplience, CommerceTools, ProductsUp, production REST/API workflows.
- Strong serverless transferability: Azure Functions / Durable Functions, long-running workflows, retries, idempotency, observability.
- Redis/caching production experience exists, but not cache architecture ownership.
- Strong SQL/backend foundation from Factor–IT with PostgreSQL, financial/accounting data and PHP 7.x custom framework.

## Risks if applying anyway
- CV пришлось бы сильно сдвигать в PHP/AWS direction, что может выглядеть как PHP-only/AWS profile overclaim.
- На интервью вероятны вопросы по AWS Lambda, SQS, API Gateway, AWS SAM, Bref, PHP 8 modern ecosystem, Go testing — evidence слабое или отсутствует.
- SAP B1 / Salesforce / Stripe / SureTax direct experience отсутствует; можно говорить только про transferable third-party integrations.
- English B2+ daily collaboration может стать фильтром на screening или tech interview.
- Если роль действительно Business Layer & Portal с SRE interview, могут ожидать AWS/platform confidence выше текущего профиля.

## Useful keywords to track later
- AWS Lambda
- API Gateway
- SQS
- AWS SAM
- PHP on Lambda / Bref
- Go backend
- Salesforce REST API
- SAP B1 Service Layer
- Stripe integrations
- Redis / ElastiCache
- MySQL / MSSQL

## Future reconsideration condition
Похожие вакансии можно рассматривать позже, если роль допускает TypeScript/Node.js или Azure/serverless как core stack, либо если AWS/PHP/Go указаны как optional. Также стоит вернуться к таким ролям после появления хотя бы personal/portfolio evidence по AWS Lambda + SQS + API Gateway + SAM и после подготовки сильного английского self-pitch под B2+ screening.
