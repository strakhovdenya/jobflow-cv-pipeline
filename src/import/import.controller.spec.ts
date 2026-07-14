import { Test, TestingModule } from '@nestjs/testing';
import { ImportPreviewResultDto } from './dto/import-preview.dto';
import {
  ImportScanResultDto,
  ImportSuggestedStatus,
} from './dto/import-scan-result.dto';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

describe('ImportController', () => {
  let controller: ImportController;
  let service: jest.Mocked<ImportService>;

  beforeEach(async () => {
    const mockService = {
      scanRoot: jest.fn(),
      previewImport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [{ provide: ImportService, useValue: mockService }],
    }).compile();

    controller = module.get<ImportController>(ImportController);
    service = module.get(ImportService);
  });

  describe('scan', () => {
    it('delegates to ImportService.scanRoot', async () => {
      const results: ImportScanResultDto[] = [];
      service.scanRoot.mockResolvedValue(results);

      const response = await controller.scan();

      expect(service.scanRoot).toHaveBeenCalledWith();
      expect(response).toBe(results);
    });
  });

  describe('preview', () => {
    it('delegates to ImportService.previewImport with folderPath and overrides', async () => {
      const preview: ImportPreviewResultDto = {
        folderPath: '/import/Action1/2026.06.23',
        companyNameOriginal: 'Action1',
        companySlug: 'Action1',
        legacyDateConfidence: 'high',
        vacancySourceCandidates: [],
        detectedArtifacts: [],
        suggestedStatus: ImportSuggestedStatus.source_saved,
        warnings: [],
        isDuplicate: false,
      };
      service.previewImport.mockResolvedValue(preview);

      const response = await controller.preview({
        folderPath: '/import/Action1/2026.06.23',
        companyNameOverride: 'Action One Corp',
        roleTitleOverride: 'Senior Backend Engineer',
      });

      expect(service.previewImport).toHaveBeenCalledWith(
        '/import/Action1/2026.06.23',
        {
          companyNameOverride: 'Action One Corp',
          roleTitleOverride: 'Senior Backend Engineer',
        },
      );
      expect(response).toBe(preview);
    });
  });
});
