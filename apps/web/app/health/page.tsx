const apiBaseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function fetchHealth() {
  try {
    const [healthResponse, dbResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/health`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/health/db`, { cache: "no-store" }),
    ]);

    return {
      api: healthResponse.ok
        ? await healthResponse.json()
        : { status: "unhealthy", error: `Request failed with ${healthResponse.status}` },
      db: dbResponse.ok
        ? await dbResponse.json()
        : { status: "unhealthy", error: `Request failed with ${dbResponse.status}` },
      error: null,
    };
  } catch (error) {
    return {
      api: { status: "unreachable", error: "Unable to reach API health endpoint." },
      db: { status: "unreachable", error: "Unable to reach DB health endpoint." },
      error: error instanceof Error ? error.message : "Unknown health check failure",
    };
  }
}

export default async function HealthPage() {
  const { api, db, error } = await fetchHealth();

  const renderStatus = (label: string, payload: { status: string; [key: string]: unknown }) => (
    <div className="flex flex-col rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{payload.status}</p>
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
            Run this page before your pitch to confirm the FastAPI app and Supabase connection are up to date.
            Refresh after running `pnpm seed` so the CRM data stays aligned with the demo script.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {renderStatus("API Health", api)}
          {renderStatus("DB Health", db)}
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
            Save this page URL and refresh it when you want to verify the demo stack before a call. It hits
            `/health` and `/health/db` directly, which is exactly what the mobile diagnostics show per screen.
          </p>
        </div>
      </div>
    </main>
  );
}
