// ATS-friendly CV rendering — single-column, plain HTML, no CSS columns or floats.
// Pure rendering function: no file I/O, no DB, no NestJS services.
// Peer of cv-template-renderer.ts; kept in its own module per ADR-017.
//
// Implements all 25 ATS formatting rules from analysis-ats-dual-export-scoping.md §3:
// - Single-column layout, no sidebar/float/grid-multicolumn (rules 1-2)
// - Section order: Name → Headline → Contact → Summary → Current Work →
//   Professional Experience → Education → Top Skills → Languages →
//   Certifications → Selected Projects (rule 3)
// - Contact block with visible labels, pipe separators, clickable links (rules 4-9)
// - stable_intro as plain prose without bullet prefix (rule 10)
// - Typography 10-12pt, minimum 9.5pt (rule 13)
// - Plain-text section headings with page-break-after:avoid (rules 14, 18)
// - A4 page size via @page rule (rule 16)
// - break-inside:avoid on content blocks (rules 18-19)
// - Skills as pipe-separated line (rule 25)

import Handlebars from 'handlebars';
import { CvContent } from '../pipeline/schemas/cv-content.schema';
import { PrePdfCheckCorrection } from '../pipeline/schemas/pre-pdf-check.schema';

// ─── Embedded ATS template (single-column, ATS-parseable) ────────────────────
const ATS_CV_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CV &mdash; {{candidate.name}}</title>
  <style>
    @page{size:A4;margin:20mm 20mm 20mm 20mm}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000;background:#fff;max-width:800px;margin:0 auto;padding:24px 32px}
    h1{font-size:18pt;font-weight:700;margin-bottom:4px}
    .headline{font-size:12pt;font-weight:400;margin-bottom:8px}
    .contact-block{margin-bottom:14px}
    .contact-line{font-size:10pt;line-height:1.6;margin-bottom:2px}
    .contact-location{font-size:10pt;margin-bottom:0}
    h2{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #000;padding-bottom:2px;margin:14px 0 6px;page-break-after:avoid}
    p{font-size:10.5pt;line-height:1.5;margin-bottom:4px}
    .block{margin-bottom:12px;break-inside:avoid}
    .block-header{display:flex;justify-content:space-between;align-items:baseline}
    .block-title{font-weight:700;font-size:10.5pt}
    .block-sub{font-size:10pt;color:#333;margin-top:1px}
    .block-dates{font-size:10pt;color:#333;white-space:nowrap;margin-left:8px}
    .block-context{font-size:10pt;font-style:italic;color:#555;margin-top:1px}
    .stable-intro{font-size:10pt;line-height:1.5;margin:4px 0}
    ul{margin:4px 0 0 18px}
    ul li{font-size:10pt;line-height:1.5;margin-bottom:2px}
    .tech-line{font-size:9.5pt;color:#333;margin-top:3px}
    .skills-line{font-size:10pt;margin-bottom:4px}
    .lang-line{font-size:10pt;margin-bottom:3px}
    .cert-line{font-size:10pt;margin-bottom:3px}
    .edu-block{margin-bottom:8px;break-inside:avoid}
    a{color:#000;text-decoration:none}
  </style>
</head>
<body>

  <h1>{{candidate.name}}</h1>

  {{#if headline}}<div class="headline">{{headline}}</div>{{/if}}

  <div class="contact-block">
    <p class="contact-line">{{#if candidate.contact.phone}}Phone: {{candidate.contact.phone}}{{/if}}{{#if candidate.contact.email}} | Email: <a href="mailto:{{candidate.contact.email}}">{{candidate.contact.email}}</a>{{/if}}{{#if candidate.contact.linkedin}} | LinkedIn: <a href="{{candidate.contact.linkedin}}">{{candidate.contact.linkedin}}</a>{{/if}}{{#if candidate.contact.github}} | GitHub: <a href="{{candidate.contact.github}}">{{candidate.contact.github}}</a>{{/if}}</p>
    {{#if candidate.location}}<p class="contact-location">{{candidate.location}}{{#if candidate.work_authorization}} | {{candidate.work_authorization}}{{/if}}</p>{{/if}}
  </div>

  <h2>Summary</h2>
  {{#each summary}}<p>{{this}}</p>{{/each}}

  {{#if current_work_block.include}}
  <h2>{{current_work_block.safe_label}}</h2>
  <div class="block">
    <div class="block-header">
      <span class="block-title">{{current_work_block.role_line}}</span>
      <span class="block-dates">{{current_work_block.dates}}</span>
    </div>
    {{#if current_work_block.location}}<div class="block-sub">{{current_work_block.location}}</div>{{/if}}
    <div class="stable-intro">{{current_work_block.stable_intro}}</div>
    <ul>{{#each current_work_block.bullets}}<li>{{text}}</li>{{/each}}</ul>
    {{#if current_work_block.tech_stack}}
    <div class="tech-line">Tech: {{#each current_work_block.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</div>
    {{/if}}
  </div>
  {{/if}}

  <h2>Professional Experience</h2>
  {{#each experience}}
  <div class="block">
    <div class="block-header">
      <span class="block-title">{{company}}</span>
      <span class="block-dates">{{dates}}</span>
    </div>
    <div class="block-sub">{{role}}</div>
    {{#if context}}<div class="block-context">{{context}}</div>{{/if}}
    <ul>{{#each bullets}}<li>{{text}}</li>{{/each}}</ul>
    {{#if tech_stack}}
    <div class="tech-line">Tech: {{#each tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</div>
    {{/if}}
  </div>
  {{/each}}

  {{#if education}}
  <h2>Education</h2>
  {{#each education}}
  <div class="edu-block">
    <div class="block-title">{{institution}}</div>
    <div class="block-sub">{{degree}}{{#if dates}} &mdash; {{dates}}{{/if}}</div>
    {{#if notes}}<div class="block-sub">{{notes}}</div>{{/if}}
  </div>
  {{/each}}
  {{/if}}

  {{#if top_skills}}
  <h2>Top Skills</h2>
  <p class="skills-line">{{#each top_skills}}{{this}}{{#unless @last}} | {{/unless}}{{/each}}</p>
  {{/if}}

  {{#if languages}}
  <h2>Languages</h2>
  {{#each languages}}
  <div class="lang-line"><strong>{{language}}</strong> &mdash; {{level}}{{#if notes}} ({{notes}}){{/if}}</div>
  {{/each}}
  {{/if}}

  {{#if certifications}}
  <h2>Certifications</h2>
  {{#each certifications}}
  <div class="cert-line">{{name}}{{#if issuer}} &mdash; {{issuer}}{{/if}}{{#if date}} ({{date}}){{/if}}</div>
  {{/each}}
  {{/if}}

  {{#if selected_projects}}
  <h2>Selected Projects</h2>
  {{#each selected_projects}}
  <div class="block">
    <div class="block-title">{{safe_label}} &mdash; {{title}}</div>
    <ul>{{#each bullets}}<li>{{text}}</li>{{/each}}</ul>
    {{#if tech_stack}}
    <div class="tech-line">Tech: {{#each tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</div>
    {{/if}}
  </div>
  {{/each}}
  {{/if}}

  {{#if volunteering}}
  <h2>Volunteering</h2>
  {{#each volunteering}}
  <div class="block">
    {{#if organization}}<div class="block-title">{{organization}}</div>{{/if}}
    {{#if role}}<div class="block-sub">{{role}}</div>{{/if}}
    <p>{{description}}</p>
    {{#if dates}}<div class="block-sub">{{dates}}</div>{{/if}}
  </div>
  {{/each}}
  {{/if}}

  {{#if links}}
  <h2>Links</h2>
  {{#each links}}<div class="cert-line"><a href="{{url}}">{{url}}</a>{{#if label}} &mdash; {{label}}{{/if}}</div>{{/each}}
  {{/if}}

</body>
</html>`;

const compiledAtsTemplate = Handlebars.compile(ATS_CV_TEMPLATE_SOURCE);

// ─── Corrections helpers (private — no cross-module import per ADR-017) ──────

type PathSegment =
  { type: 'key'; key: string } | { type: 'index'; index: number };

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

function applyCorrectionsToCvContent(
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders CV content to an ATS-friendly single-column HTML string.
 * Optionally applies Prompt 3 field-level corrections before rendering.
 * Pure function: no file I/O, no DB access, no side effects.
 */
export function renderAtsCvTemplate(
  content: CvContent,
  corrections?: PrePdfCheckCorrection[],
): string {
  const effectiveContent =
    corrections && corrections.length > 0
      ? applyCorrectionsToCvContent(content, corrections)
      : content;

  const renderData = {
    ...effectiveContent,
    selected_projects: effectiveContent.selected_projects.filter(
      (p) => p.include,
    ),
  };

  return compiledAtsTemplate(renderData);
}
