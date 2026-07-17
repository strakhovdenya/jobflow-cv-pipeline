import { Injectable } from '@nestjs/common';
import * as path from 'path';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfExportService {
  async htmlFileToPdf(
    htmlFilePath: string,
    pdfOutputPath: string,
  ): Promise<void> {
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
