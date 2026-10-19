"use client";

import { useEffect, useRef, useState } from "react";

const CONFIRMATION_MS = 2000;

type CopyState = "idle" | "copied" | "failed";

const CONFIRMATION_TEXT: Record<CopyState, string> = {
  idle: "",
  copied: "Link copied",
  failed: "Copy failed",
};

const CONFIRMATION_CLASS: Record<CopyState, string> = {
  idle: "",
  copied:
    "rounded-md bg-green-100 px-2 py-1 text-green-700 shadow-sm dark:bg-green-950 dark:text-green-300",
  failed:
    "rounded-md bg-red-100 px-2 py-1 text-red-700 shadow-sm dark:bg-red-950 dark:text-red-300",
};

interface CopyLinkButtonProps {
  url: string | null | undefined;
}

// The url is untrusted (user/import supplied), so it is only ever written to the clipboard,
// never turned into a link.
export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const value = url?.trim() ?? "";
  if (value === "") {
    return null;
  }

  const showConfirmation = (next: CopyState) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    setState(next);
    timerRef.current = setTimeout(() => setState("idle"), CONFIRMATION_MS);
  };

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      showConfirmation("copied");
    } catch {
      showConfirmation("failed");
    }
  };

  return (
    <span className="relative -my-0.5 inline-flex shrink-0">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Copy vacancy link"
        title="Copy vacancy link"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        {state === "copied" ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
      {/* Always mounted so screen readers announce the text change; absolutely positioned to the
          right so showing it never shifts the surrounding row/header layout. */}
      <span
        role="status"
        className={`pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 text-xs font-medium whitespace-nowrap ${CONFIRMATION_CLASS[state]}`}
      >
        {CONFIRMATION_TEXT[state]}
      </span>
    </span>
  );
}
