import { getHealth } from "@/lib/api";

export default async function Home() {
  let backendStatus: string;
  let isHealthy = false;

  try {
    const health = await getHealth();
    backendStatus = health.status;
    isHealthy = health.status === "ok";
  } catch {
    backendStatus = "unreachable";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
        JobFlow CV Pipeline — Dashboard
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Backend status:{" "}
        <span
          className={
            isHealthy
              ? "font-medium text-green-600 dark:text-green-400"
              : "font-medium text-red-600 dark:text-red-400"
          }
        >
          {backendStatus}
        </span>
      </p>
    </div>
  );
}
