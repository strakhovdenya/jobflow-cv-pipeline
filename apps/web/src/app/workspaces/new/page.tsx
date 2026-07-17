import { WorkspaceForm } from "./workspace-form";

export default function NewWorkspacePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        New workspace
      </h1>
      <WorkspaceForm />
    </div>
  );
}
