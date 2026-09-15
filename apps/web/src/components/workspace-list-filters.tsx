"use client";

import { useState } from "react";
import type { WorkspaceListItem } from "@/lib/api";
import { WorkspaceList, ALL_WORKSPACE_STATUSES } from "@/components/workspace-list";
import { ActionButton } from "@/components/main-action-card";
import { statusLabel } from "@/lib/pipeline-view-model";
import {
  EMPTY_WORKSPACE_LIST_FILTERS,
  filterWorkspaces,
  hasActiveWorkspaceListFilters,
  type WorkspaceFilters,
} from "@/lib/workspace-filters";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

interface WorkspaceListFiltersProps {
  workspaces: WorkspaceListItem[];
}

export function WorkspaceListFilters({ workspaces }: WorkspaceListFiltersProps) {
  const [filters, setFilters] = useState<WorkspaceFilters>(EMPTY_WORKSPACE_LIST_FILTERS);

  if (workspaces.length === 0) {
    return <WorkspaceList workspaces={[]} />;
  }

  const filtered = filterWorkspaces(workspaces, filters);
  const hasFilters = hasActiveWorkspaceListFilters(filters);

  function clearFilters() {
    setFilters(EMPTY_WORKSPACE_LIST_FILTERS);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="wl-query"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Search
          </label>
          <input
            id="wl-query"
            type="text"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Company or role…"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="wl-status"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Status
          </label>
          <select
            id="wl-status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className={inputClass}
          >
            <option value="">All statuses</option>
            {ALL_WORKSPACE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="wl-updated-from"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Updated from
          </label>
          <input
            id="wl-updated-from"
            type="date"
            value={filters.updatedFrom}
            onChange={(e) => setFilters((f) => ({ ...f, updatedFrom: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="wl-updated-to"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Updated to
          </label>
          <input
            id="wl-updated-to"
            type="date"
            value={filters.updatedTo}
            onChange={(e) => setFilters((f) => ({ ...f, updatedTo: e.target.value }))}
            className={inputClass}
          />
        </div>

        {hasFilters && (
          <ActionButton label="Clear filters" kind="secondary" onAction={() => clearFilters()} />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No workspaces match these filters.
          </p>
          <ActionButton label="Clear filters" kind="secondary" onAction={() => clearFilters()} />
        </div>
      ) : (
        <WorkspaceList workspaces={filtered} />
      )}
    </div>
  );
}
