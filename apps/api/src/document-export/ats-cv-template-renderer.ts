// ATS-friendly CV rendering — single-column, plain HTML, no CSS columns or floats.
// Pure rendering function: no file I/O, no DB, no NestJS services.
// Peer of cv-template-renderer.ts; kept in its own module per ADR-017.

import Handlebars from 'handlebars';
import { CvContent } from '../pipeline/schemas/cv-content.schema';
import { PrePdfCheckCorrection } from '../pipeline/schemas/pre-pdf-check.schema';

// ─── Embedded ATS template (single-column, ATS-parseable) ────────────────────
// Single-column layout: no sidebar, no CSS grid, no floats — maximises ATS
// text extraction accuracy. Minimal inline styles only (no class-based layout
// tricks that confuse plain-text parsers).
const ATS_CV_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CV &mdash; {{candidate.name}}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000;background:#fff;max-width:800px;margin:0 auto;padding:24px 32px}
    h1{font-size:18pt;font-weight:700;margin-bottom:2px}
    h2{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #000;padding-bottom:2px;margin:16px 0 6px}
    .contact-line{font-size:10pt;margin-bottom:12px}
    .contact-line span+span::before{content:" | "}
    p{font-size:10.5pt;line-height:1.5;margin-bottom:4px}
    .block{margin-bottom:12px}
    .block-header{display:flex;justify-content:space-between}
    .block-title{font-weight:700;font-size:10.5pt}
    .block-sub{font-size:10pt;color:#333}
    .block-dates{font-size:10pt;color:#333;white-space:nowrap;margin-left:8px}
    .block-context{font-size:9.5pt;font-style:italic;color:#555;margin:2px 0}
    ul{margin:4px 0 0 18px}
    ul li{font-size:10pt;line-height:1.5;margin-bottom:2px}
    .tech-line{font-size:9.5pt;color:#333;margin-top:3px}
    .skills-line{font-size:10pt;margin-bottom:4px}
    .lang-line{font-size:10pt;margin-bottom:3px}
    .cert-line{font-size:10pt;margin-bottom:3px}
    .link-line{font-size:10pt;margin-bottom:3px}
    .edu-block{margin-bottom:8px}
  </style>
</head>
<body>
  <h1>{{candidate.name}}</h1>
  <div class="contact-line">
    {{#with candidate.contact}}
    {{#if phone}}<span>{{phone}}</span>{{/if}}
    {{#if email}}<span>{{email}}</span>{{/if}}
    {{#if linkedin}}<span>{{linkedin}}</span>{{/if}}
    {{#if github}}<span>{{github}}</span>{{/if}}
    {{/with}}
    {{#if candidate.location}}<span>{{candidate.location}}</span>{{/if}}
    {{#if candidate.work_authorization}}<span>{{candidate.work_authorization}}</span>{{/if}}
  </div>

  <h2>Summary</h2>
  {{#each summary}}<p>{{this}}</p>{{/each}}

  <h2>Top Skills</h2>
  <p class="skills-line">{{#each top_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>

  {{#if current_work_block.include}}
  <h2>{{current_work_block.safe_label}}</h2>
  <div class="block">
    <div class="block-header">
      <span class="block-title">{{current_work_block.role_line}}</span>
      <span class="block-dates">{{current_work_block.dates}}</span>
    </div>
    {{#if current_work_block.location}}<div class="block-sub">{{current_work_block.location}}</div>{{/if}}
    <p class="block-context">{{current_work_block.stable_intro}}</p>
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

  <h2>Education</h2>
  {{#each education}}
  <div class="edu-block">
    <div class="block-title">{{institution}}</div>
    <div class="block-sub">{{degree}} &mdash; {{dates}}</div>
    {{#if notes}}<div class="block-context">{{notes}}</div>{{/if}}
  </div>
  {{/each}}

  {{#if certifications}}
  <h2>Certifications</h2>
  {{#each certifications}}
  <div class="cert-line">{{name}}{{#if issuer}} &mdash; {{issuer}}{{/if}}{{#if date}} ({{date}}){{/if}}</div>
  {{/each}}
  {{/if}}

  <h2>Languages</h2>
  {{#each languages}}
  <div class="lang-line"><strong>{{language}}</strong> &mdash; {{level}}{{#if notes}} ({{notes}}){{/if}}</div>
  {{/each}}

  {{#if volunteering}}
  <h2>Volunteering</h2>
  {{#each volunteering}}
  <div class="block">
    {{#if organization}}<div class="block-title">{{organization}}</div>{{/if}}
    {{#if role}}<div class="block-sub">{{role}}</div>{{/if}}
    <p>{{description}}</p>
    {{#if dates}}<div class="block-dates">{{dates}}</div>{{/if}}
  </div>
  {{/each}}
  {{/if}}

  {{#if links}}
  <h2>Links</h2>
  {{#each links}}<div class="link-line"><a href="{{url}}">{{label}}</a></div>{{/each}}
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
