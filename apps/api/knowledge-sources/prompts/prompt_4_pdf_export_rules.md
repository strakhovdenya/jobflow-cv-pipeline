ВАЖНО — current-work source sync 2026-07:
Используй active source set v0.6/v2.3. Не используй archived/old source names из старых промптов; все ссылки на Sources должны указывать на актуальные current-work sync files.

Новый current period после EPAM:
`Current Independent Work & Portfolio Projects` / `Freelance Software Development, Backend Portfolio Projects & Relocation`, May 2025 – Present, Cologne, Germany · Remote.

Этот блок должен закрывать post-EPAM gap, но не заменять EPAM как главный commercial production evidence. Для всех CV/PDF/HTML outputs current-work block должен оставаться ВСЕГДА: Germany / remote EU, Ukraine / Ukrainian-market, generic CV, broad/no-specific-role CV. Не убирай сам блок из-за рынка, page-fit или слабой релевантности; если места мало, сокращай детали внутри блока, но не удаляй блок. Рынок влияет только на volunteering bullet: для Germany / remote EU обычно оставляй HEY, ALTER! как отдельный local integration signal; для Ukraine / Ukrainian-market решай volunteering bullet case-by-case.

JobFlow / NestJS / Prisma / Swagger / OpenAI / FastAPI / AI проекты — personal/portfolio evidence, если не указано иначе в источниках. Small freelance wording держать осторожно: `small Node.js/React improvements on an independent basis`.

Current-work rendering rule: описание периода после дат — это НЕ bullet. После него идут bullets. JobFlow должен быть одним цельным bullet, где purpose проекта и key features объединены. Volunteering / HEY, ALTER! — это отдельный bullet или отдельная compact section, но только если он включён; не сливай volunteering с Python/FastAPI learning и не дублируй volunteering одновременно в current-work и внизу CV без причины. Если volunteering bullet omitted для Ukraine/role-specific reasons, current-work block всё равно остаётся и должен сохранять 4–5 bullets за счёт других safe current-work bullets.

ВАЖНО — автоматизация шага:
Используй latest targeted CV content and the latest pre-PDF check from this chat.

ВАЖНО — учти предыдущий pre-PDF check перед созданием PDF:
Если в контексте чата перед этим шагом уже был выполнен pre-PDF check / final pre-PDF check, и в нём были даны обязательные или optional рекомендации, сначала извлеки эти рекомендации из контекста чата и примени их к финальной targeted CV version. Только после этого создавай PDF. Не игнорируй pre-PDF recommendations, даже если они не повторены в текущем сообщении. Если рекомендации конфликтуют с текущим промптом, приоритет у текущего промпта, но конфликт нужно явно отметить в ответе.

Теперь создай PDF-файл targeted CV в стиле моего текущего CV PDF.

Используй:
- мое имя и фамилия пишутся Denys Strakhov - это важно;
- мой текущий CV PDF как visual/layout reference;
- CV_Format_Rules_EN_v0_3_current_work_sync.md как правила формата, включая current-work block rules;
- финальную targeted CV version из этого чата как content source.

Требования к PDF:

1. Layout:
   - похожая двухколоночная структура;
   - левая колонка: Contact, Top Skills, Languages, Certifications;
   - правая основная колонка: Name, Headline, Summary, Current Independent Work & Portfolio Projects if present, Professional Experience, Education, optional Selected Projects;

   - если финальная targeted CV version содержит `Current Independent Work & Portfolio Projects`, разместить его компактно перед EPAM в main column;
   - current-work block не удалять ни для Germany / remote EU, ни для Ukraine / Ukrainian-market CV; market-specific decision applies only to volunteering bullet; если approved content содержит блок — рендерить его обязательно;
   - current-work block должен иметь: title, subtitle, dates/location, затем description line БЕЗ bullet marker, затем bullets;
   - description line не считается bullet и не должен начинаться с `•` / `-`;
   - current-work block не должен быть длиннее description + 4 bullets по умолчанию; 5 bullets допустимо только если approved content так задан и layout помещается;
   - JobFlow должен быть одним combined bullet, где purpose и key features объединены; volunteering должен быть отдельным bullet/compact section, не слитым с Python/FastAPI;
   - current-work block не должен визуально вытеснять EPAM как основной commercial experience;
   - для лучшей ATS/autofill-читаемости добавить в правой основной колонке компактную machine-readable contact line сразу под Headline и перед Summary;
   - ВАЖНО: эта строка должна быть реально видимой в PDF, а не только присутствовать как link annotation, metadata, hidden text, invisible layer или внутренний объект PDF;
   - размещение строгое: Name → Headline → visible machine-readable contact line → horizontal divider line / Summary; если в layout используется горизонтальная линия под headline, contact line должна быть размещена до Summary так, чтобы её было видно при открытии PDF на первой странице;
   - machine-readable contact line должна содержать только Phone, Email, LinkedIn и GitHub; не добавлять туда Cologne/Germany или Authorized to work in Germany;
   - machine-readable contact line должна выглядеть аккуратно и не ухудшать общий вид CV; использовать компактный, но читаемый шрифт/spacing, не меньше 7.5 pt; не делать текст скрытым, белым или нечитаемо мелким;
   - если одна строка не помещается визуально, разбей contact line на две видимые строки в правой колонке:
     Phone: [phone] | Email: [email]
     LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya
   - сохранить визуально похожий профессиональный стиль;
   - не делать Europass-style;
   - не делать слишком декоративно.

2. Content:
   - использовать только финальный approved CV text из этого чата;
   - не добавлять новые факты;
   - не менять даты и названия компаний без причины;
   - не добавлять неподтверждённые технологии;
   - не превращать JobFlow/NestJS/Prisma/Swagger/OpenAI в commercial production claims;
   - не усиливать small freelance wording beyond approved current-work text;
   - не расширять Summary;
   - под Headline перед Summary добавить дублирующую ATS-friendly contact line в правой колонке; она должна быть видимой в PDF и проверяемой визуально на первой странице;
   - предпочтительный вид contact line, если помещается в одну строку: Phone: [phone] | Email: [email] | LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya;
   - если одна строка получается слишком длинной или не помещается, обязательно использовать двухстрочный вид:
     Phone: [phone] | Email: [email]
     LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya
   - эта дублирующая строка нужна только для распознавания phone/email/LinkedIn/GitHub парсерами и формами; не добавлять туда location и не добавлять туда Authorized to work in Germany;
   - дублирующая строка должна использовать те же значения phone/email/LinkedIn/GitHub, что и Contact в левой колонке; не менять формат LinkedIn и GitHub URLs;
   - если после рендера PDF эта строка не видна глазами между Headline и Summary, PDF считается неготовым: нужно исправить layout и пересоздать PDF, а не сообщать, что строка добавлена;
   - в Contact указывать GitHub как полную кликабельную ссылку с https://;
   - в Contact строку LinkedIn указывать строго в таком формате без www и без переноса на следующую строку: https://linkedin.com/in/denys-strakhov; сама строка должна быть кликабельной и вести на этот же URL; если строка не помещается в левую колонку, нужно уменьшить шрифт/скорректировать ширину или spacing именно для Contact, но не разбивать ссылку, не переносить её и не заменять на другой формат;
   - строку work authorization писать только так: Authorized to work in Germany.

3. Length:
   - цель: 2 страницы;
   - если 2 страницы невозможно без сильного ухудшения читаемости, сначала сообщи, что нужно сократить;
   - не обрезать текст;
   - не оставлять одинокие заголовки внизу страницы;
   - не делать слишком мелкий шрифт.

4. File name:
   Denys_Strakhov_[Company]_[Role]_CV.pdf

5. After creating PDF:
   - перед тем как давать ссылку, обязательно отрендери первую страницу PDF в изображение и визуально проверь, что machine-readable contact line реально видна под Headline и перед Summary;
   - проверь также извлечённый текст PDF: в page 1 должны присутствовать `Phone:`, `Email:`, `LinkedIn:` и `GitHub:` в правой основной колонке / сразу после Headline;
   - если есть `Current Independent Work & Portfolio Projects`, визуально проверь, что description line не отрендерена как bullet, JobFlow находится в одном bullet, volunteering отделён отдельным bullet/section, а EPAM начинается достаточно заметно;
   - если строка не видна в рендере или отсутствует в извлечённом тексте, не выдавай PDF как готовый: исправь верстку и пересоздай PDF;
   - дай ссылку на скачивание;
   - кратко напиши, какие секции были адаптированы под вакансию, включая current-work block variant if present;
   - отдельно предупреди, если layout получился не идеально идентичным оригиналу.

## Output Quality Score — Prompt 4

После создания PDF оцени качество PDF по шкале 0–100.

Обязательно проверяй не только текст, но и визуальный рендер первой страницы.

Критерии:

1. Layout match and readability — 0–20
   - двухколоночная структура похожа на reference CV;
   - текст читаемый;
   - нет визуального хаоса.

2. Contact and ATS line validation — 0–20
   - visible machine-readable contact line реально видна под Headline и перед Summary;
   - в extracted text присутствуют Phone:, Email:, LinkedIn:, GitHub:;
   - LinkedIn URL строго: https://linkedin.com/in/denys-strakhov;
   - GitHub URL полный и кликабельный.

3. Content integrity — 0–20
   - использован только approved CV content;
   - не появились новые факты;
   - даты, компании, имя Denys Strakhov не изменены;
   - work authorization написан exactly: Authorized to work in Germany.

4. Page and formatting quality — 0–20
   - цель 2 страницы выполнена или честно объяснено, почему нет;
   - нет обрезанного текста;
   - нет orphan headings;
   - нет слишком мелкого шрифта;
   - ссылки не перенесены некрасиво.

5. File readiness — 0–20
   - PDF открывается;
   - текст selectable;
   - links work;
   - file name correct;
   - визуальная проверка выполнена перед выдачей ссылки.

Формат вывода:

| Quality criterion | Score | Comment |
|---|---:|---|
| Layout match and readability | /20 | |
| Contact and ATS line validation | /20 | |
| Content integrity | /20 | |
| Page and formatting quality | /20 | |
| File readiness | /20 | |

Total Output Quality Score: /100

Quality verdict:
- excellent / good / risky / not acceptable

PDF status:
- ready to upload for final check
- needs regeneration
- blocked

If score <90:
- do not present it as final;
- explain what was fixed or what still needs fixing.