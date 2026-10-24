export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans text-sm text-zinc-600 dark:bg-black dark:text-zinc-400"
    >
      Loading…
    </div>
  );
}
