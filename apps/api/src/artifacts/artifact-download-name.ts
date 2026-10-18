import { DOWNLOAD_NAME_PREFIX } from '../document-export/cv-download-filename';

const TYPE_SUFFIXES: ReadonlyMap<string, string> = new Map([
  ['vacancy_source', '_VacancySource'],
  ['vacancy_analysis_md', '_VacancyAnalysis'],
  ['vacancy_analysis_json', '_VacancyAnalysis'],
  ['targeted_cv_content_md', '_CVContent'],
  ['targeted_cv_content_json', '_CVContent'],
  ['pre_pdf_check_md', '_PrePdfCheck'],
  ['pre_pdf_check_json', '_PrePdfCheck'],
  ['final_check_md', '_FinalCheck'],
  ['final_check_json', '_FinalCheck'],
  ['rejection_feedback', '_RejectionFeedback'],
  ['skip_reason_md', '_SkipReason'],
  ['skip_reason_json', '_SkipReason'],
]);

export interface ArtifactDownloadNameInput {
  artifactType: string;
  canonicalFileName: string;
  companySlug: string | null;
  roleSlug: string | null;
}

const sanitizeSlug = (slug: string): string => slug.replace(/[/\\]/g, '_');

const extensionOf = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex);
};

export function buildArtifactDownloadFileName({
  artifactType,
  canonicalFileName,
  companySlug,
  roleSlug,
}: ArtifactDownloadNameInput): string {
  const typeSuffix = TYPE_SUFFIXES.get(artifactType);
  if (!typeSuffix || !companySlug || !roleSlug) return canonicalFileName;
  const company = sanitizeSlug(companySlug);
  const role = sanitizeSlug(roleSlug);
  const extension = extensionOf(canonicalFileName);
  return `${DOWNLOAD_NAME_PREFIX}${company}_${role}${typeSuffix}${extension}`;
}

export function resolveArtifactDownloadFileName(
  artifact: ArtifactDownloadNameInput & { downloadFileName: string | null },
): string {
  return artifact.downloadFileName || buildArtifactDownloadFileName(artifact);
}
