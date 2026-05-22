import { headers } from "next/headers";

import { AdminHealthPanel } from "../moderation/admin-health-panel";
import { getModerationAdminHealth } from "../moderation/data";
import { LiveAdminHealthProvider } from "../moderation/use-live-admin-health";

const apiBaseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

type HealthPayload = {
  status: string;
  service?: string;
  ready?: boolean;
  missing_tables?: string[];
  tables?: Record<string, string>;
  error?: string;
  detail?: string;
  sample_count?: number;
};

type HealthResponse = {
  api: HealthPayload;
  db: HealthPayload;
  error: string | null;
};

async function fetchHealth(): Promise<HealthResponse> {
  try {
    const [healthResponse, dbResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/health`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/health/db`, { cache: "no-store" }),
    ]);

    const apiJson = (await healthResponse.json()) as Record<string, unknown>;
    const dbJson = (await dbResponse.json()) as Record<string, unknown>;

    return {
      api: {
        ...apiJson,
        status: healthResponse.ok ? String(apiJson.status ?? "ok") : "unhealthy",
        error: healthResponse.ok ? undefined : `Request failed with ${healthResponse.status}`,
      } satisfies HealthPayload,
      db: {
        ...dbJson,
        status: dbResponse.ok ? String(dbJson.status ?? "ok") : String(dbJson.status ?? "unhealthy"),
        error: dbResponse.ok ? undefined : `Request failed with ${dbResponse.status}`,
      } satisfies HealthPayload,
      error: null,
    };
  } catch (error) {
    return {
      api: { status: "unreachable", error: "Unable to reach API health endpoint." } satisfies HealthPayload,
      db: { status: "unreachable", error: "Unable to reach DB health endpoint." } satisfies HealthPayload,
      error: error instanceof Error ? error.message : "Unknown health check failure",
    };
  }
}

export default async function HealthPage() {
  const requestHeaders = await headers();
  const adminUsername = requestHeaders.get("x-admin-username") ?? "";
  const authorization = requestHeaders.get("authorization");
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const webBaseUrl = `${proto}://${host}`;
  const { api, db, error } = await fetchHealth();
  const adminHealth = await getModerationAdminHealth(
    adminUsername,
    webBaseUrl,
    authorization,
  );
  const missingTables = db.missing_tables ?? [];
  const tableEntries = Object.entries(db.tables ?? {});
  const dbReady = db.ready === true && db.status === "ok";

  const renderStatus = (label: string, payload: HealthPayload) => (
    <div className="flex flex-col rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{payload.status}</p>
      {typeof payload.error === "string" ? (
        <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{payload.error}</p>
      ) : null}
      <pre className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-3 text-xs text-slate-700 dark:text-slate-200">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );

  return (
    <main className="py-16">
      <div className="mx-auto max-w-5xl space-y-10 px-4">
        <div className="space-y-4 rounded-4xl border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-10 text-(--color-foreground) shadow-(--shadow-lg)">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Health checks</p>
          <h1 className="text-4xl font-semibold">API + DB readiness</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Use this page to confirm the FastAPI service and Supabase connection are reachable before building
            the onboarding flow on mobile.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {renderStatus("API Health", api)}
          {renderStatus("DB Health", db)}
        </div>

        <LiveAdminHealthProvider initialHealth={adminHealth}>
          <AdminHealthPanel />
        </LiveAdminHealthProvider>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">DB Readiness</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">
              {dbReady ? "Ready" : "Blocked"}
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {dbReady
                ? "All required SilverChat Phase 1 tables are available in the connected Supabase project."
                : db.detail ?? "Database setup is incomplete for the current API environment."}
            </p>
            {missingTables.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                <p className="font-semibold">Missing tables</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingTables.map((table) => (
                    <span
                      key={table}
                      className="rounded-full border border-rose-300 bg-white px-3 py-1 font-mono text-xs dark:border-rose-800 dark:bg-rose-950/40"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Table Checks</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {tableEntries.length > 0 ? (
                tableEntries.map(([table, status]) => (
                  <div
                    key={table}
                    className="rounded-2xl border border-(--color-line) bg-(--color-surface-strong) px-4 py-3"
                  >
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{table}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-stone-100">{status}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Table-by-table status will appear here when `/health/db` responds.
                </p>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-(--shadow-md)">
            <p className="font-semibold">Health page warning</p>
            <p className="mt-2">
              The web app could not reach `{apiBaseUrl}` from the server runtime. On Vercel, set
              `API_URL` or `NEXT_PUBLIC_API_URL` to your deployed FastAPI base URL and redeploy.
            </p>
            <p className="mt-2 break-all font-mono text-xs text-amber-950/80">{error}</p>
          </div>
        ) : null}

        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 text-sm text-slate-600 shadow-(--shadow-md) dark:text-slate-300">
          <p className="font-semibold text-slate-950 dark:text-stone-100">Tip</p>
          <p className="mt-2">
            This page hits `/health` and `/health/db` directly. Keep it green before adding auth, onboarding,
            or matchmaking features on top.
          </p>
        </div>
      </div>
    </main>
  );
}
