import { promises as fs } from 'fs';
import { statSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PdfExportService } from './pdf-export.service';

describe('PdfExportService', () => {
  let service: PdfExportService;
  let tempDir: string;

  beforeEach(async () => {
    service = new PdfExportService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-export-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('converts a real HTML file into a non-empty PDF file using Puppeteer', async () => {
    const htmlFilePath = path.join(tempDir, 'input.html');
    const pdfOutputPath = path.join(tempDir, 'output.pdf');

    await fs.writeFile(
      htmlFilePath,
      '<html><body><h1>PdfExportService test</h1></body></html>',
      'utf-8',
    );

    await service.htmlFileToPdf(htmlFilePath, pdfOutputPath);

    const stats = statSync(pdfOutputPath);
    expect(stats.size).toBeGreaterThan(0);
  }, 30000);
});
