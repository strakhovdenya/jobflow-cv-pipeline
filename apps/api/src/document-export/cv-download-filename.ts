export function buildCvDownloadFileName(
  companySlug: string,
  roleSlug: string,
  options: { variant: 'design' | 'ats'; extension: 'pdf' | 'html' },
): string {
  const typeSuffix = options.variant === 'ats' ? '_CV_ATS' : '_CV';
  return `Strakhov_Denys_${companySlug}_${roleSlug}${typeSuffix}.${options.extension}`;
}
