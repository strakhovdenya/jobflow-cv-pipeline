import { scanImportFolders } from "@/lib/api";
import { ImportPreview } from "./import-preview";

export default async function ImportPage() {
  const scanResults = await scanImportFolders();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Import from existing folder
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Scans the configured legacy <code>Company/YYYY.MM.DD</code> folder tree. Selecting a
        folder previews it — no records are created until you confirm.
      </p>
      <ImportPreview scanResults={scanResults} />
    </div>
  );
}
