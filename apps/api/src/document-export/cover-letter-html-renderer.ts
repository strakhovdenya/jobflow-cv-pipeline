import type { CoverLetterOutput } from '../pipeline/schemas/cover-letter.schema';

export function renderCoverLetterHtml(
  data: CoverLetterOutput,
  companyName: string,
  roleTitle: string,
): string {
  const subjectLine = data.subject
    ? `<p class="subject"><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>`
    : '';

  const bodyParagraphs = data.cover_letter.body_paragraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cover Letter — ${escapeHtml(companyName)} — ${escapeHtml(roleTitle)}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#222;background:#fff;padding:40px 60px;max-width:800px;margin:0 auto;line-height:1.6}
    h1{font-size:14pt;font-weight:700;color:#1a1a2e;margin-bottom:16px;padding-bottom:8px;border-bottom:1.5px solid #2a6496}
    .subject{font-size:11pt;margin-bottom:20px;color:#444}
    .greeting{font-size:11pt;margin-bottom:16px}
    .body p{margin-bottom:14px;font-size:11pt}
    .closing{font-size:11pt;margin-top:20px}
    @media print{body{padding:20px 40px}}
  </style>
</head>
<body>
  <h1>Cover Letter — ${escapeHtml(companyName)} — ${escapeHtml(roleTitle)}</h1>
  ${subjectLine}
  <p class="greeting">${escapeHtml(data.cover_letter.greeting)}</p>
  <div class="body">
      ${bodyParagraphs}
  </div>
  <p class="closing">${escapeHtml(data.cover_letter.closing)}</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
