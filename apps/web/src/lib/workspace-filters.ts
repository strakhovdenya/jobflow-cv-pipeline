import type { WorkspaceListItem } from "@/lib/api";

export interface WorkspaceFilters {
  query: string;
  status: string;
  updatedFrom: string;
  updatedTo: string;
}

export const EMPTY_WORKSPACE_LIST_FILTERS: WorkspaceFilters = {
  query: "",
  status: "",
  updatedFrom: "",
  updatedTo: "",
};

export function hasActiveWorkspaceListFilters(filters: WorkspaceFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.status !== "" ||
    filters.updatedFrom !== "" ||
    filters.updatedTo !== ""
  );
}

export function filterWorkspaces(
  workspaces: WorkspaceListItem[],
  filters: WorkspaceFilters,
): WorkspaceListItem[] {
  const trimmedQuery = filters.query.trim().toLowerCase();

  return workspaces.filter((w) => {
    if (trimmedQuery !== "") {
      const matchesCompany = w.company.nameOriginal.toLowerCase().includes(trimmedQuery);
      const matchesRole = w.jobVacancy.roleTitleOriginal.toLowerCase().includes(trimmedQuery);
      if (!matchesCompany && !matchesRole) return false;
    }

    if (filters.status !== "" && w.status !== filters.status) {
      return false;
    }

    const updatedDate = w.updatedAt.slice(0, 10);
    if (filters.updatedFrom !== "" && updatedDate < filters.updatedFrom) {
      return false;
    }
    if (filters.updatedTo !== "" && updatedDate > filters.updatedTo) {
      return false;
    }

    return true;
  });
}
