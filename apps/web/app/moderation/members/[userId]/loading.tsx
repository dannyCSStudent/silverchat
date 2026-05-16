export default function ModerationMemberLoading() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <section className="rounded-4xl border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-10 text-(--color-foreground) shadow-(--shadow-lg)">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
          Member Detail
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Loading member safety profile
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          Pulling reports, blocks, safety state, and moderation history for this member.
        </p>
      </section>

      <section className="rounded-[32px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-72 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-full max-w-2xl rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </section>
    </main>
  );
}
