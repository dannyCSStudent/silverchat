"use client";

type ModerationMemberErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ModerationMemberError({
  error,
  reset,
}: ModerationMemberErrorProps) {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <section className="rounded-4xl border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-10 text-(--color-foreground) shadow-(--shadow-lg)">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
          Member Detail
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Member detail failed to load
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          The member safety case file hit a rendering error.
        </p>
      </section>

      <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-6 shadow-(--shadow-md)">
        <p className="text-sm font-medium text-rose-800">
          {error.message || "Unexpected member detail render failure."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-92 dark:bg-stone-100 dark:text-slate-950"
        >
          Retry member detail
        </button>
      </section>
    </main>
  );
}
