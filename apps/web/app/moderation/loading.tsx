export default function ModerationLoading() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <section className="rounded-4xl border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-10 text-(--color-foreground) shadow-(--shadow-lg)">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
          Moderation
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Loading moderation workspace
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          Pulling reports, blocks, assignments, and enforcement context for the admin dashboard.
        </p>
      </section>

      <section className="rounded-[32px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-80 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-full max-w-2xl rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-5 shadow-(--shadow-md)"
          >
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
