import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { ImportConfirmResultDto } from './dto/import-confirm.dto';
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
      confirmImport: jest.fn(),
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

  describe('confirm', () => {
    it('delegates to ImportService.confirmImport with folderPath and options', async () => {
      const result: ImportConfirmResultDto = {
        workspaceId: 'ws-1',
        companyId: 'company-1',
        jobVacancyId: 'vacancy-1',
        workspaceSlug: '2026_06_23_Action1_Backend_Developer',
        companySlug: 'Action1',
        roleSlug: 'Backend_Developer',
        status: WorkspaceStatus.source_saved,
        registeredArtifactIds: ['artifact-1'],
      };
      service.confirmImport.mockResolvedValue(result);

      const response = await controller.confirm({
        folderPath: '/import/Action1/2026.06.23',
        companyNameOverride: 'Action One Corp',
        roleTitleOverride: 'Senior Backend Engineer',
        selectedVacancySourcePath: '/import/Action1/2026.06.23/vacancy.txt',
        copyVacancySourceToCanonical: true,
      });

      expect(service.confirmImport).toHaveBeenCalledWith(
        '/import/Action1/2026.06.23',
        {
          companyNameOverride: 'Action One Corp',
          roleTitleOverride: 'Senior Backend Engineer',
          selectedVacancySourcePath: '/import/Action1/2026.06.23/vacancy.txt',
          copyVacancySourceToCanonical: true,
        },
      );
      expect(response).toBe(result);
    });
  });
});
