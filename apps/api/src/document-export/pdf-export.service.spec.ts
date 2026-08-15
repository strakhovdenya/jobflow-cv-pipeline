import { promises as fs } from 'fs';
import { statSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PdfExportService } from './pdf-export.service';

// puppeteer@25+ ships pure ESM with no CJS build (see pdf-export.service.ts's
// comment on the dynamic import) — Jest's CJS module runtime cannot parse it
// directly, unlike Node's own require() (stable require(esm) support, Node
// >=22.12), which is what the compiled app actually runs on. Mocking here is
// a Jest-tooling accommodation, not a doubt about correctness: real,
// unmocked Puppeteer PDF generation is verified via a manual smoke test
// (workspace through export-cv) recorded in TEST_LOG.md (TASK-102), and this
// test still exercises PdfExportService's own real logic — launch args,
// navigation URL, pdf() options, and that the browser is always closed.
const mockPdf = jest.fn();
const mockGoto = jest.fn();
const mockNewPage = jest.fn();
const mockClose = jest.fn();
const mockLaunch = jest.fn();

jest.mock('puppeteer', () => ({
  __esModule: true,
  default: { launch: (...args: unknown[]) => mockLaunch(...args) },
}));

describe('PdfExportService', () => {
  let service: PdfExportService;
  let tempDir: string;

  beforeEach(async () => {
    service = new PdfExportService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-export-test-'));

    mockPdf
      .mockReset()
      .mockImplementation(async (options: { path: string }) => {
        await fs.writeFile(options.path, '%PDF-1.4 fake pdf content', 'utf-8');
      });
    mockGoto.mockReset().mockResolvedValue(undefined);
    mockNewPage.mockReset().mockResolvedValue({ goto: mockGoto, pdf: mockPdf });
    mockClose.mockReset().mockResolvedValue(undefined);
    mockLaunch
      .mockReset()
      .mockResolvedValue({ newPage: mockNewPage, close: mockClose });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('converts an HTML file into a non-empty PDF file via Puppeteer', async () => {
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
    expect(mockLaunch).toHaveBeenCalledWith({ args: ['--no-sandbox'] });
    expect(mockGoto).toHaveBeenCalledWith(
      `file://${path.resolve(htmlFilePath)}`,
      { waitUntil: 'networkidle0' },
    );
    expect(mockPdf).toHaveBeenCalledWith({
      path: pdfOutputPath,
      format: 'A4',
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('closes the browser even when page rendering throws', async () => {
    mockGoto.mockRejectedValue(new Error('navigation failed'));

    const htmlFilePath = path.join(tempDir, 'input.html');
    const pdfOutputPath = path.join(tempDir, 'output.pdf');
    await fs.writeFile(htmlFilePath, '<html></html>', 'utf-8');

    await expect(
      service.htmlFileToPdf(htmlFilePath, pdfOutputPath),
    ).rejects.toThrow('navigation failed');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
