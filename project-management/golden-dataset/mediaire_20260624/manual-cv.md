# Skip reasoning (Prompt 1 output, SKIP branch)

# SKIP — mediaire — Full-Stack Developer

Date analyzed: 2026-06-24
Company: mediaire
Role: Full-Stack Developer
Location / remote: Berlin-Kreuzberg or remote
Core stack: React/JavaScript frontend, Python backend, FastAPI/Flask/Django/Litestar, Cornerstone.js/medical imaging, Docker, GitLab CI/CD, AWS/PostgreSQL nice-to-have
Final score: 52/100
Decision: SKIP

## Main skip reason

Главный blocker — роль требует сильного сочетания frontend + Python backend + medical imaging/3D annotation tooling. У меня есть коммерческий backend/fullstack опыт с Node.js/TypeScript/Azure и рабочий React/Next.js, но Python/FastAPI — personal/project experience only, а medical imaging, Cornerstone.js, DICOM/NIfTI, volumetric MRI и browser-based 3D annotation workflows не подтверждены.

## Key mismatches

- Core backend роли построен вокруг Python/FastAPI-like backend, а мой коммерческий backend core — Node.js/TypeScript/Azure.
- Роль требует strong frontend ownership и lead development of a new annotation platform built largely from scratch; мой React/Next.js опыт коммерческий, но backend-focused, не pure frontend/platform ownership.
- Нет evidence по medical imaging libraries: Cornerstone.js, VTK.js, ITK.js.
- Нет evidence по DICOM/NIfTI, volumetric MRI data, 3D rendering, segmentation или annotation tools.
- GitLab CI/CD и Docker указаны как modern DevOps practices; у меня Docker/GitHub Actions сильнее в personal projects, а commercial CI/CD — Azure DevOps participation, not pipeline ownership.
- Domain shift: healthcare/medtech/radiology/ML annotation workflows не подтверждены.

## Evidence from my profile

- Есть коммерческий production backend/fullstack опыт в EPAM: Node.js, TypeScript, Azure Functions, integrations, React/Next.js contribution.
- Есть production React/Next.js contribution как backend-focused fullstack developer, но не frontend-first ownership.
- Есть personal FastAPI/PostgreSQL project with Pytest, Docker, GitHub Actions and OpenAI API, но это не commercial production Python.
- Есть сильный PostgreSQL/backend foundation from Factor–IT, transferable for backend/data logic.

## Risks if applying anyway

- Придётся слишком сильно подсвечивать Python/FastAPI, хотя это personal/project experience only.
- Интервью может быстро уйти в Cornerstone.js, DICOM/NIfTI, MRI volumes, 3D rendering, segmentation workflows — сейчас нет evidence.
- Роль может ожидать самостоятельное ведение платформы с нуля и bridge-коммуникацию между Software, ML и radiologists.
- CV пришлось бы выглядеть как frontend/Python/medical-imaging profile, что создаёт риск overclaiming.
- Высокая вероятность отказа на screening или technical interview из-за domain/core-stack mismatch.

## Useful keywords to track later

- Cornerstone.js
- DICOM / NIfTI
- Medical imaging annotation tools
- Volumetric MRI data
- Browser-based 3D viewer
- FastAPI production backend
- React high-density data UI
- GitLab CI/CD
- Healthcare AI / radiology workflows

## Future reconsideration condition

Похожие вакансии можно рассматривать позже, если роль будет backend/API/integration-focused with Node.js/TypeScript или cloud backend, а medical imaging/Python будут nice-to-have. Также можно вернуться к такому направлению после portfolio project или learning project с DICOM/NIfTI/Cornerstone.js и более уверенным FastAPI production-like backend.
