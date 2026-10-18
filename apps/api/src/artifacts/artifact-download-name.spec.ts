import { DOWNLOAD_NAME_PREFIX } from '../document-export/cv-download-filename';
import {
  buildArtifactDownloadFileName,
  resolveArtifactDownloadFileName,
} from './artifact-download-name';

const input = (artifactType: string, canonicalFileName: string) => ({
  artifactType,
  canonicalFileName,
  companySlug: 'Acme',
  roleSlug: 'Backend_Engineer',
});

describe('buildArtifactDownloadFileName', () => {
  it('builds readable name for vacancy_analysis_md', () => {
    expect(
      buildArtifactDownloadFileName(
        input('vacancy_analysis_md', '01_vacancy_analysis.md'),
      ),
    ).toBe(`${DOWNLOAD_NAME_PREFIX}Acme_Backend_Engineer_VacancyAnalysis.md`);
  });

  it.each([
    ['vacancy_source', '00_vacancy_source.txt', '_VacancySource.txt'],
    [
      'vacancy_analysis_json',
      '01_vacancy_analysis.json',
      '_VacancyAnalysis.json',
    ],
    ['targeted_cv_content_md', '02_targeted_cv_content.md', '_CVContent.md'],
    [
      'targeted_cv_content_json',
      '02_targeted_cv_content.json',
      '_CVContent.json',
    ],
    ['pre_pdf_check_md', '03_pre_pdf_check.md', '_PrePdfCheck.md'],
    ['pre_pdf_check_json', '03_pre_pdf_check.json', '_PrePdfCheck.json'],
    ['final_check_md', '05_final_check.md', '_FinalCheck.md'],
    ['final_check_json', '05_final_check.json', '_FinalCheck.json'],
    ['rejection_feedback', 'rejection_feedback.md', '_RejectionFeedback.md'],
    ['skip_reason_md', '01_skip_reason.md', '_SkipReason.md'],
    ['skip_reason_json', '01_skip_reason.json', '_SkipReason.json'],
  ])('takes extension from canonical file name (%s)', (type, file, tail) => {
    expect(buildArtifactDownloadFileName(input(type, file))).toBe(
      `${DOWNLOAD_NAME_PREFIX}Acme_Backend_Engineer${tail}`,
    );
  });

  it('falls back to canonical name for unknown type', () => {
    expect(buildArtifactDownloadFileName(input('mystery', 'x.bin'))).toBe(
      'x.bin',
    );
  });

  it('preserves cyrillic slug', () => {
    expect(
      buildArtifactDownloadFileName({
        ...input('vacancy_source', '00_vacancy_source.txt'),
        companySlug: 'Яндекс',
        roleSlug: 'Бэкенд_Разработчик',
      }),
    ).toBe(
      `${DOWNLOAD_NAME_PREFIX}Яндекс_Бэкенд_Разработчик_VacancySource.txt`,
    );
  });

  it('rejects path separators in slugs', () => {
    const name = buildArtifactDownloadFileName({
      ...input('vacancy_source', '00_vacancy_source.txt'),
      companySlug: 'a/b',
      roleSlug: 'c\\d',
    });
    expect(name).toBe(`${DOWNLOAD_NAME_PREFIX}a_b_c_d_VacancySource.txt`);
    expect(name).not.toMatch(/[/\\]/);
  });

  it('falls back to canonical name without slugs', () => {
    expect(
      buildArtifactDownloadFileName({
        ...input('vacancy_source', '00_vacancy_source.txt'),
        companySlug: null,
      }),
    ).toBe('00_vacancy_source.txt');
  });
});

describe('resolveArtifactDownloadFileName', () => {
  const base = input('vacancy_source', '00_vacancy_source.txt');

  it('keeps registered downloadFileName', () => {
    expect(
      resolveArtifactDownloadFileName({ ...base, downloadFileName: 'my.pdf' }),
    ).toBe('my.pdf');
  });

  it('treats empty downloadFileName as unset', () => {
    expect(
      resolveArtifactDownloadFileName({ ...base, downloadFileName: '' }),
    ).toBe(`${DOWNLOAD_NAME_PREFIX}Acme_Backend_Engineer_VacancySource.txt`);
  });
});
