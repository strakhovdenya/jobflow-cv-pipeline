export function downloadUrl(artifactId: string): string {
  return `/api/artifacts/${encodeURIComponent(artifactId)}/download`;
}
