import { Injectable } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class PdfExportService {
  async htmlFileToPdf(
    htmlFilePath: string,
    pdfOutputPath: string,
  ): Promise<void> {
    // Lazy dynamic import: puppeteer@25+ ships pure ESM with no CJS build,
    // so a static `import puppeteer from 'puppeteer'` at module scope forces
    // every consumer of this file (including AppModule's e2e bootstrap and
    // document-export.service.spec.ts's PdfExportService type-only import) to
    // eagerly require() an ESM-only module — something Jest's CJS runtime
    // cannot parse, unlike Node's own require() (stable require(esm) support,
    // Node >=22.12). Deferring the import to call time confines the ESM
    // boundary to only the code paths that actually invoke Puppeteer.
    const { default: puppeteer } = await import('puppeteer');

    // CI runners (GitHub Actions Linux containers) disable unprivileged user
    // namespaces, so Chromium's sandbox fails to start there even though it
    // works unsandboxed on Windows 11 dev machines.
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

    try {
      const page = await browser.newPage();
      await page.goto(`file://${path.resolve(htmlFilePath)}`, {
        waitUntil: 'networkidle0',
      });
      await page.pdf({ path: pdfOutputPath, format: 'A4' });
    } finally {
      await browser.close();
    }
  }
}
