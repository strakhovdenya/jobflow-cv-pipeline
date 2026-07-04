// Pure rendering functions — no file I/O, no DB, no NestJS services.
// Used directly by TASK-035B tests and by HtmlRendererService (TASK-035).
//
// The template content below mirrors src/document-export/templates/cv.template.html,
// which is the canonical readable source used by HtmlRendererService at runtime.

import Handlebars from 'handlebars';
import { CvContent } from '../pipeline/schemas/cv-content.schema';
import { PrePdfCheckCorrection } from '../pipeline/schemas/pre-pdf-check.schema';

// ─── Embedded template (kept in sync with cv.template.html) ──────────────────
// This embedded copy exists so renderCvTemplate() is a pure function with no
// filesystem dependency. TASK-035's HtmlRendererService will read the .html
// file from disk and call Handlebars.compile() itself.
const CV_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CV &mdash; {{candidate.name}}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#222;background:#fff}
    .cv-wrapper{display:grid;grid-template-columns:27% 73%;min-height:100vh}
    .cv-left{background:#f4f6f9;padding:24px 14px 24px 16px;border-right:1px solid #dde2ea}
    .cv-main{padding:24px 28px 28px 22px}
    .section-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2a6496;border-bottom:1.5px solid #2a6496;padding-bottom:3px;margin:16px 0 7px}
    .cv-left .section-title{font-size:7.5pt;margin:14px 0 6px}
    .section-title:first-child{margin-top:0}
    .candidate-name{font-size:22pt;font-weight:700;color:#1a1a2e;line-height:1.1;margin-bottom:3px}
    .candidate-headline{font-size:10.5pt;color:#2a6496;margin-bottom:6px}
    .ats-contact{font-size:7.5pt;color:#444;line-height:1.6;margin-bottom:10px}
    .ats-contact .sep{color:#999;margin:0 4px}
    .left-item{margin-bottom:5px;font-size:8.5pt;line-height:1.4}
    .left-label{font-weight:700;color:#333;font-size:7.5pt;display:block;margin-bottom:1px}
    .skill-tag{display:inline-block;background:#e2e8f0;border-radius:3px;padding:2px 6px;margin:2px 3px 2px 0;font-size:8pt}
    .lang-item{margin-bottom:4px;font-size:8.5pt}
    .lang-note{font-size:7.5pt;color:#777;display:block}
    .summary-paragraph{font-size:9.5pt;line-height:1.55;margin-bottom:5px}
    .section-block{margin-bottom:14px}
    .block-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
    .block-role{font-weight:600;font-size:9.5pt;color:#2a6496}
    .block-dates{font-size:8.5pt;color:#666;white-space:nowrap;margin-left:8px}
    .block-location{font-size:8pt;color:#777;margin-bottom:3px}
    .stable-intro{font-size:8.5pt;color:#555;font-style:italic;margin:3px 0 5px;line-height:1.45}
    .tech-stack{font-size:7.5pt;color:#555;margin-top:4px}
    .tech-stack-label{font-weight:700}
    .exp-item{margin-bottom:13px}
    .exp-header{display:flex;justify-content:space-between;align-items:baseline}
    .exp-company{font-weight:700;font-size:10pt;color:#1a1a2e}
    .exp-dates{font-size:8.5pt;color:#666;white-space:nowrap;margin-left:8px}
    .exp-role{font-size:9.5pt;color:#2a6496;font-weight:600;margin-top:1px}
    .exp-context{font-size:8pt;color:#777;font-style:italic;margin-top:1px}
    ul.bullets{margin:5px 0 0 16px}
    ul.bullets li{font-size:9pt;line-height:1.5;margin-bottom:2px}
    .edu-item{margin-bottom:8px}
    .edu-institution{font-weight:700;font-size:9.5pt}
    .edu-degree{font-size:9pt}
    .edu-dates{font-size:8.5pt;color:#666}
    .edu-notes{font-size:8pt;color:#777}
    .project-item{margin-bottom:10px}
    .project-safe-label{font-size:8pt;color:#2a6496;font-weight:700}
    .project-title{font-size:9.5pt;font-weight:700}
    .vol-item{margin-bottom:8px}
    .vol-org{font-weight:600;font-size:9.5pt}
    .vol-role{font-size:9pt;color:#2a6496}
    .vol-desc{font-size:9pt;line-height:1.45}
    .vol-dates{font-size:8.5pt;color:#666}
    .cert-item{margin-bottom:4px;font-size:8.5pt}
    .cert-date{font-size:7.5pt;color:#888;display:block}
    .link-item{margin-bottom:4px;font-size:8.5pt}
    .link-item a{color:#2a6496;text-decoration:none}
    .density-compact ul.bullets li{margin-bottom:0;line-height:1.4}
    .density-compact .exp-item{margin-bottom:9px}
    .density-extended ul.bullets li{margin-bottom:4px;line-height:1.6}
    .density-extended .exp-item{margin-bottom:18px}
  </style>
</head>
<body class="density-{{rendering_hints.density}}">
<div class="cv-wrapper">
  <aside class="cv-left">
    <h4 class="section-title">Contact</h4>
    {{#with candidate.contact}}
    {{#if phone}}<div class="left-item"><span class="left-label">Phone</span>{{phone}}</div>{{/if}}
    {{#if email}}<div class="left-item"><span class="left-label">Email</span>{{email}}</div>{{/if}}
    {{#if linkedin}}<div class="left-item"><span class="left-label">LinkedIn</span>{{linkedin}}</div>{{/if}}
    {{#if github}}<div class="left-item"><span class="left-label">GitHub</span>{{github}}</div>{{/if}}
    {{/with}}
    <div class="left-item"><span class="left-label">Location</span>{{candidate.location}}</div>
    <h4 class="section-title">Work Authorization</h4>
    <div class="left-item">{{candidate.work_authorization}}</div>
    <h4 class="section-title">Top Skills</h4>
    {{#each top_skills}}<span class="skill-tag">{{this}}</span>{{/each}}
    <h4 class="section-title">Languages</h4>
    {{#each languages}}
    <div class="lang-item">
      <strong>{{language}}</strong> &mdash; <span>{{level}}</span>
      {{#if notes}}<span class="lang-note">{{notes}}</span>{{/if}}
    </div>
    {{/each}}
    {{#if certifications}}
    <h4 class="section-title">Certifications</h4>
    {{#each certifications}}
    <div class="cert-item">{{name}}{{#if issuer}} &mdash; {{issuer}}{{/if}}{{#if date}}<span class="cert-date">{{date}}</span>{{/if}}</div>
    {{/each}}
    {{/if}}
    {{#if links}}
    <h4 class="section-title">Links</h4>
    {{#each links}}<div class="link-item"><a href="{{url}}">{{label}}</a></div>{{/each}}
    {{/if}}
  </aside>
  <main class="cv-main">
    <header>
      <div class="candidate-name">{{candidate.name}}</div>
      <div class="candidate-headline">{{headline}}</div>
      <div class="ats-contact">
        {{#with candidate.contact}}
        {{#if phone}}<span>Phone: {{phone}}</span>{{/if}}
        {{#if email}}<span class="sep">|</span><span>Email: {{email}}</span>{{/if}}
        {{#if linkedin}}<span class="sep">|</span><span>LinkedIn: {{linkedin}}</span>{{/if}}
        {{#if github}}<span class="sep">|</span><span>GitHub: {{github}}</span>{{/if}}
        {{/with}}
      </div>
    </header>
    <section>
      <h3 class="section-title">Summary</h3>
      {{#each summary}}<p class="summary-paragraph">{{this}}</p>{{/each}}
    </section>
    {{#if current_work_block.include}}
    <section class="section-block">
      <h3 class="section-title">{{current_work_block.safe_label}}</h3>
      <div class="block-header">
        <span class="block-role">{{current_work_block.role_line}}</span>
        <span class="block-dates">{{current_work_block.dates}}</span>
      </div>
      {{#if current_work_block.location}}<div class="block-location">{{current_work_block.location}}</div>{{/if}}
      <p class="stable-intro">{{current_work_block.stable_intro}}</p>
      <ul class="bullets">{{#each current_work_block.bullets}}<li>{{text}}</li>{{/each}}</ul>
      {{#if current_work_block.tech_stack}}
      <div class="tech-stack"><span class="tech-stack-label">Tech:</span> {{#each current_work_block.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</div>
      {{/if}}
    </section>
    {{/if}}
    <section>
      <h3 class="section-title">Professional Experience</h3>
      {{#each experience}}
      <div class="exp-item">
        <div class="exp-header">
          <span class="exp-company">{{company}}</span>
          <span class="exp-dates">{{dates}}</span>
        </div>
        <div class="exp-role">{{role}}</div>
        {{#if context}}<div class="exp-context">{{context}}</div>{{/if}}
        <ul class="bullets">{{#each bullets}}<li>{{text}}</li>{{/each}}</ul>
        {{#if tech_stack}}
        <div class="tech-stack"><span class="tech-stack-label">Tech:</span> {{#each tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</div>
        {{/if}}
      </div>
      {{/each}}
    </section>
    <section>
      <h3 class="section-title">Education</h3>
      {{#each education}}
      <div class="edu-item">
        <div class="edu-institution">{{institution}}</div>
        <div class="edu-degree">{{degree}}</div>
        <div class="edu-dates">{{dates}}</div>
        {{#if notes}}<div class="edu-notes">{{notes}}</div>{{/if}}
      </div>
      {{/each}}
    </section>
    {{#if selected_projects}}
    <section>
      <h3 class="section-title">Selected Projects</h3>
      {{#each selected_projects}}
      <div class="project-item">
        <div><span class="project-safe-label">{{safe_label}}</span> <span class="project-title">&mdash; {{title}}</span></div>
        <ul class="bullets">{{#each bullets}}<li>{{text}}</li>{{/each}}</ul>
        {{#if tech_stack}}
        <div class="tech-stack"><span class="tech-stack-label">Tech:</span> {{#each tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</div>
        {{/if}}
      </div>
      {{/each}}
    </section>
    {{/if}}
    {{#if volunteering}}
    <section>
      <h3 class="section-title">Volunteering</h3>
      {{#each volunteering}}
      <div class="vol-item">
        {{#if organization}}<div class="vol-org">{{organization}}</div>{{/if}}
        {{#if role}}<div class="vol-role">{{role}}</div>{{/if}}
        <div class="vol-desc">{{description}}</div>
        {{#if dates}}<div class="vol-dates">{{dates}}</div>{{/if}}
      </div>
      {{/each}}
    </section>
    {{/if}}
  </main>
</div>
</body>
</html>`;

const compiledTemplate = Handlebars.compile(CV_TEMPLATE_SOURCE);

// ─── Path-based field setter for Prompt 3 corrections ────────────────────────

type PathSegment = { type: 'key'; key: string } | { type: 'index'; index: number };

function parsePath(fieldPath: string): PathSegment[] {
  const segments: PathSegment[] = [];
  for (const part of fieldPath.split('.')) {
    const match = part.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      segments.push({ type: 'key', key: match[1] });
      segments.push({ type: 'index', index: parseInt(match[2], 10) });
    } else {
      segments.push({ type: 'key', key: part });
    }
  }
  return segments;
}

function setByPath(
  obj: Record<string, unknown>,
  fieldPath: string,
  value: string,
): void {
  const segments = parsePath(fieldPath);
  let current: unknown = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current == null) return;
    if (seg.type === 'key') {
      current = (current as Record<string, unknown>)[seg.key];
    } else {
      current = (current as unknown[])[seg.index];
    }
  }

  if (current == null) return;
  const last = segments[segments.length - 1];
  if (last.type === 'key') {
    (current as Record<string, unknown>)[last.key] = value;
  } else {
    (current as unknown[])[last.index] = value;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Deep-clones CvContent and applies Prompt 3 corrections in memory.
 * The original content object is never mutated.
 */
export function applyCorrectionsToCvContent(
  content: CvContent,
  corrections: PrePdfCheckCorrection[],
): CvContent {
  const cloned = JSON.parse(JSON.stringify(content)) as CvContent;
  for (const correction of corrections) {
    setByPath(
      cloned as unknown as Record<string, unknown>,
      correction.field_path,
      correction.suggested_text,
    );
  }
  return cloned;
}

/**
 * Renders CV content to an HTML string using the embedded Handlebars template.
 * Optionally applies Prompt 3 field-level corrections before rendering.
 * Pure function: no file I/O, no DB access, no side effects.
 */
export function renderCvTemplate(
  content: CvContent,
  corrections?: PrePdfCheckCorrection[],
): string {
  const effectiveContent =
    corrections && corrections.length > 0
      ? applyCorrectionsToCvContent(content, corrections)
      : content;

  // Pre-filter selected_projects to only include:true before passing to template
  const renderData = {
    ...effectiveContent,
    selected_projects: effectiveContent.selected_projects.filter((p) => p.include),
  };

  return compiledTemplate(renderData);
}
