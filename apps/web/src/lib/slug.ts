/**
 * Client-side preview only — mirrors apps/api's SlugService
 * (apps/api/src/common/slug/slug.service.ts) so the form can show a live
 * slug/file preview without a round trip. The backend recomputes the real
 * slugs on submit; this must stay in sync with SlugService (ADR-013).
 */
export function normalizeCompanySlug(name: string): string {
  return name
    .trim()
    .replace(/[^A-Za-z\p{Script=Cyrillic}0-9_]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeRoleSlug(title: string): string {
  return title
    .trim()
    .replace(/[^A-Za-z\p{Script=Cyrillic}_]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDatePrefix(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}_${m}_${d}`;
}

export function previewWorkspaceSlug(
  companyNameOriginal: string,
  roleTitleOriginal: string,
  today: Date = new Date(),
): string {
  const companySlug = normalizeCompanySlug(companyNameOriginal);
  const roleSlug = normalizeRoleSlug(roleTitleOriginal);
  return `${formatDatePrefix(today)}_${companySlug || "…"}_${roleSlug || "…"}`;
}
