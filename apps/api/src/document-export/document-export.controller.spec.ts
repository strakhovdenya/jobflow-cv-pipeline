import { WorkspaceStatus } from '@prisma/client';
import { DocumentExportController } from './document-export.controller';
import { DocumentExportService } from './document-export.service';

const WORKSPACE_ID = 'ws-controller-1';

describe('DocumentExportController', () => {
  let controller: DocumentExportController;
  let documentExportServiceMock: jest.Mocked<DocumentExportService>;

  beforeEach(() => {
    documentExportServiceMock = {
      exportCv: jest.fn(),
    } as unknown as jest.Mocked<DocumentExportService>;

    controller = new DocumentExportController(documentExportServiceMock);
  });

  it('POST :id/export-cv delegates to DocumentExportService.exportCv', async () => {
    const expected = {
      workspaceId: WORKSPACE_ID,
      status: WorkspaceStatus.cv_pdf_generated,
      htmlPath: '/storage/ws/04_cv_export.html',
      pdfPath: '/storage/ws/04_cv_export.pdf',
      atsPdfPath: '/storage/ws/04_cv_export_ats.pdf',
    };
    documentExportServiceMock.exportCv.mockResolvedValue(expected);

    const result = await controller.exportCv(WORKSPACE_ID);

    expect(documentExportServiceMock.exportCv).toHaveBeenCalledWith(
      WORKSPACE_ID,
    );
    expect(result).toBe(expected);
  });
});
