const VARIANT_SUFFIX: Record<'design' | 'ats' | 'cover_letter', string> = {
  design: '_CV',
  ats: '_CV_ATS',
  cover_letter: '_CoverLetter',
};

export function buildCvDownloadFileName(
  companySlug: string,
  roleSlug: string,
  options: {
    variant: 'design' | 'ats' | 'cover_letter';
    extension: 'pdf' | 'html' | 'md' | 'json';
  },
): string {
  const typeSuffix = VARIANT_SUFFIX[options.variant];
  return `Strakhov_Denys_${companySlug}_${roleSlug}${typeSuffix}.${options.extension}`;
}
