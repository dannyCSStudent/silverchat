import type { ModerationData } from "./data";

type FallbackWarningPanelProps = {
  configurationError: string | null;
  proxyStatuses: ModerationData["proxyStatuses"];
};

export function FallbackWarningPanel({
  configurationError,
  proxyStatuses,
}: FallbackWarningPanelProps) {
  if (!configurationError) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-(--shadow-md)">
      {configurationError}
      {proxyStatuses.some((proxyStatus) => !proxyStatus.ok) ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {proxyStatuses.map((proxyStatus) => (
            <div
              key={proxyStatus.path}
              className={`rounded-2xl border px-4 py-3 ${
                proxyStatus.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-white text-amber-900"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                {proxyStatus.path}
              </p>
              <p className="mt-2 text-sm font-medium">
                {proxyStatus.ok
                  ? `Healthy (${proxyStatus.status ?? "ok"})`
                  : `Failed (${proxyStatus.status ?? "no status"})`}
              </p>
              {!proxyStatus.ok ? (
                <p className="mt-2 text-xs">{proxyStatus.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
