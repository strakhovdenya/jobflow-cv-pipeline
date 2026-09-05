import { buildCvDownloadFileName } from './cv-download-filename';

describe('buildCvDownloadFileName', () => {
  it('builds design CV PDF filename with surname first', () => {
    expect(
      buildCvDownloadFileName('Acme_Corp', 'Backend_Developer', {
        variant: 'design',
        extension: 'pdf',
      }),
    ).toBe('Strakhov_Denys_Acme_Corp_Backend_Developer_CV.pdf');
  });

  it('builds ATS CV PDF filename with _CV_ATS suffix', () => {
    expect(
      buildCvDownloadFileName('Acme_Corp', 'Backend_Developer', {
        variant: 'ats',
        extension: 'pdf',
      }),
    ).toBe('Strakhov_Denys_Acme_Corp_Backend_Developer_CV_ATS.pdf');
  });

  it('builds design CV HTML filename with .html extension', () => {
    expect(
      buildCvDownloadFileName('Jobgether', 'Software_Engineer_Backend', {
        variant: 'design',
        extension: 'html',
      }),
    ).toBe('Strakhov_Denys_Jobgether_Software_Engineer_Backend_CV.html');
  });

  it('builds ATS CV HTML filename with _CV_ATS suffix and .html extension', () => {
    expect(
      buildCvDownloadFileName('Jobgether', 'Software_Engineer_Backend', {
        variant: 'ats',
        extension: 'html',
      }),
    ).toBe('Strakhov_Denys_Jobgether_Software_Engineer_Backend_CV_ATS.html');
  });

  it('passes companySlug and roleSlug through verbatim (no extra slugification)', () => {
    expect(
      buildCvDownloadFileName('Газпром_Нефть', 'Бэкенд_Разработчик', {
        variant: 'design',
        extension: 'pdf',
      }),
    ).toBe('Strakhov_Denys_Газпром_Нефть_Бэкенд_Разработчик_CV.pdf');
  });

  it('builds cover letter PDF filename with _CoverLetter suffix', () => {
    expect(
      buildCvDownloadFileName('Acme_Corp', 'Backend_Developer', {
        variant: 'cover_letter',
        extension: 'pdf',
      }),
    ).toBe('Strakhov_Denys_Acme_Corp_Backend_Developer_CoverLetter.pdf');
  });

  it('builds cover letter MD filename with _CoverLetter suffix and .md extension', () => {
    expect(
      buildCvDownloadFileName('Jobgether', 'Software_Engineer_Backend', {
        variant: 'cover_letter',
        extension: 'md',
      }),
    ).toBe('Strakhov_Denys_Jobgether_Software_Engineer_Backend_CoverLetter.md');
  });

  it('builds cover letter JSON filename with _CoverLetter suffix and .json extension', () => {
    expect(
      buildCvDownloadFileName('Acme_Corp', 'Backend_Developer', {
        variant: 'cover_letter',
        extension: 'json',
      }),
    ).toBe('Strakhov_Denys_Acme_Corp_Backend_Developer_CoverLetter.json');
  });
});
