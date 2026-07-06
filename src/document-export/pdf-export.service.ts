import { Injectable } from '@nestjs/common';
import * as path from 'path';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfExportService {
  async htmlFileToPdf(
    htmlFilePath: string,
    pdfOutputPath: string,
  ): Promise<void> {
    const browser = await puppeteer.launch();

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
