interface SpinnerProps {
  className?: string;
}

// Decorative only (aria-hidden) — always paired with visible pending text ("Working…" etc.)
// that already communicates the loading state to screen readers, so the icon itself needs no
// label. Uses currentColor so it inherits whatever text color the surrounding button/kind uses,
// in both light and dark mode, without its own color tokens.
export function Spinner({ className = "h-4 w-4" }: SpinnerProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin motion-reduce:animate-none ${className}`}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
