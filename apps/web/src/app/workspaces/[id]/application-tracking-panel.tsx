"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceArtifactSummary } from "@/lib/api";
import {
  archiveWorkspaceAction,
  markAppliedAction,
  markReadyToApplyAction,
  markRejectedAction,
} from "./actions";
import { ErrorList } from "./error-list";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";
const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50";
const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const READY_TO_APPLY_VALID_STATUSES = [
  "cv_pdf_generated",
  "final_check_ready",
  "cover_letter_generated",
];

const APPLIED_VALID_STATUSES = [
  "cv_pdf_generated",
  "final_check_ready",
  "cover_letter_generated",
  "ready_to_apply",
];

const REJECTED_VALID_STATUSES = ["applied"];

const ARCHIVED_VALID_STATUSES = [
  "ready_to_apply",
  "cv_pdf_generated",
  "final_check_ready",
  "cover_letter_generated",
  "applied",
  "rejected",
];

const CV_ARTIFACT_TYPES = ["cv_export_pdf", "legacy_cv_pdf"];
const COVER_LETTER_ARTIFACT_TYPES = [
  "cover_letter_md",
  "cover_letter_json",
  "legacy_cover_letter_pdf",
];

interface ApplicationTrackingPanelProps {
  workspaceId: string;
  status: string;
  artifacts: WorkspaceArtifactSummary[];
}

interface ArtifactSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  artifacts: WorkspaceArtifactSummary[];
  allowedTypes: string[];
}

function ArtifactSelect({
  id,
  label,
  value,
  onChange,
  artifacts,
  allowedTypes,
}: ArtifactSelectProps) {
  const options = artifacts.filter((artifact) =>
    allowedTypes.includes(artifact.artifactType),
  );

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label} <span className="text-zinc-400">(optional)</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">—</option>
        {options.map((artifact) => (
          <option key={artifact.id} value={artifact.id}>
            {artifact.downloadFileName}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ApplicationTrackingPanel({
  workspaceId,
  status,
  artifacts,
}: ApplicationTrackingPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [readyErrors, setReadyErrors] = useState<string[]>([]);
  const [appliedErrors, setAppliedErrors] = useState<string[]>([]);
  const [rejectedErrors, setRejectedErrors] = useState<string[]>([]);
  const [archiveErrors, setArchiveErrors] = useState<string[]>([]);

  const [appliedVia, setAppliedVia] = useState("");
  const [appliedNotes, setAppliedNotes] = useState("");
  const [submittedCvArtifactId, setSubmittedCvArtifactId] = useState("");
  const [submittedCoverLetterArtifactId, setSubmittedCoverLetterArtifactId] = useState("");

  const [rejectionSummary, setRejectionSummary] = useState("");
  const [rejectedNotes, setRejectedNotes] = useState("");

  const showReady = READY_TO_APPLY_VALID_STATUSES.includes(status);
  const showApplied = APPLIED_VALID_STATUSES.includes(status);
  const showRejected = REJECTED_VALID_STATUSES.includes(status);
  const showArchive = ARCHIVED_VALID_STATUSES.includes(status);

  if (!showReady && !showApplied && !showRejected && !showArchive) {
    return null;
  }

  function runMarkReadyToApply() {
    setReadyErrors([]);
    startTransition(async () => {
      const result = await markReadyToApplyAction(workspaceId);
      if (result.ok) {
        router.refresh();
      } else {
        setReadyErrors(result.errors);
      }
    });
  }

  function runMarkApplied() {
    setAppliedErrors([]);
    startTransition(async () => {
      const result = await markAppliedAction(workspaceId, {
        appliedVia: appliedVia.trim() === "" ? undefined : appliedVia.trim(),
        notes: appliedNotes.trim() === "" ? undefined : appliedNotes.trim(),
        submittedCvArtifactId:
          submittedCvArtifactId === "" ? undefined : submittedCvArtifactId,
        submittedCoverLetterArtifactId:
          submittedCoverLetterArtifactId === ""
            ? undefined
            : submittedCoverLetterArtifactId,
      });
      if (result.ok) {
        router.refresh();
      } else {
        setAppliedErrors(result.errors);
      }
    });
  }

  function runMarkRejected() {
    setRejectedErrors([]);
    startTransition(async () => {
      const result = await markRejectedAction(workspaceId, {
        rejectionSummary:
          rejectionSummary.trim() === "" ? undefined : rejectionSummary.trim(),
        notes: rejectedNotes.trim() === "" ? undefined : rejectedNotes.trim(),
      });
      if (result.ok) {
        router.refresh();
      } else {
        setRejectedErrors(result.errors);
      }
    });
  }

  function runArchive() {
    setArchiveErrors([]);
    startTransition(async () => {
      const result = await archiveWorkspaceAction(workspaceId);
      if (result.ok) {
        router.refresh();
      } else {
        setArchiveErrors(result.errors);
      }
    });
  }

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Application tracking
      </h2>

      {showReady && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={runMarkReadyToApply}
            className={buttonClass}
          >
            Mark ready to apply
          </button>
          <ErrorList errors={readyErrors} />
        </div>
      )}

      {showApplied && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
            Mark applied
          </h3>
          <div className="flex flex-col gap-1">
            <label htmlFor="appliedVia" className="text-sm font-medium">
              Applied via <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="appliedVia"
              value={appliedVia}
              onChange={(e) => setAppliedVia(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="appliedNotes" className="text-sm font-medium">
              Notes <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="appliedNotes"
              value={appliedNotes}
              onChange={(e) => setAppliedNotes(e.target.value)}
              className={inputClass}
            />
          </div>
          <ArtifactSelect
            id="submittedCvArtifactId"
            label="Submitted CV artifact"
            value={submittedCvArtifactId}
            onChange={setSubmittedCvArtifactId}
            artifacts={artifacts}
            allowedTypes={CV_ARTIFACT_TYPES}
          />
          <ArtifactSelect
            id="submittedCoverLetterArtifactId"
            label="Submitted cover letter artifact"
            value={submittedCoverLetterArtifactId}
            onChange={setSubmittedCoverLetterArtifactId}
            artifacts={artifacts}
            allowedTypes={COVER_LETTER_ARTIFACT_TYPES}
          />
          <div>
            <button
              type="button"
              disabled={isPending}
              onClick={runMarkApplied}
              className={buttonClass}
            >
              Mark applied
            </button>
          </div>
          <ErrorList errors={appliedErrors} />
        </div>
      )}

      {showRejected && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
            Mark rejected
          </h3>
          <div className="flex flex-col gap-1">
            <label htmlFor="rejectionSummary" className="text-sm font-medium">
              Rejection summary <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="rejectionSummary"
              value={rejectionSummary}
              onChange={(e) => setRejectionSummary(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rejectedNotes" className="text-sm font-medium">
              Notes <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="rejectedNotes"
              value={rejectedNotes}
              onChange={(e) => setRejectedNotes(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <button
              type="button"
              disabled={isPending}
              onClick={runMarkRejected}
              className={secondaryButtonClass}
            >
              Mark rejected
            </button>
          </div>
          <ErrorList errors={rejectedErrors} />
        </div>
      )}

      {showArchive && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div>
            <button
              type="button"
              disabled={isPending}
              onClick={runArchive}
              className={secondaryButtonClass}
            >
              Archive
            </button>
          </div>
          <ErrorList errors={archiveErrors} />
        </div>
      )}
    </section>
  );
}
