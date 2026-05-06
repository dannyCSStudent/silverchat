type HeroProps = {
  eyebrow: string;
  title: string;
  copy: string;
};

export function Hero({ eyebrow, title, copy }: HeroProps) {
  return (
    <div className="rounded-4xl border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-10 text-(--color-foreground) shadow-(--shadow-lg)">
      <p className="text-sm uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight">{title}</h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">{copy}</p>
    </div>
  );
}
