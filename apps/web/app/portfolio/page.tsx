import Link from 'next/link';
import { Hero } from '../components/hero';

const projects = [
  {
    title: 'CRM Starter',
    description:
      'Full schedule-ready CRM with FastAPI + Supabase, Next.js dashboard, and Expo mobile shell. Built for ops teams that need full lifecycle visibility.',
    tags: ['FastAPI', 'Supabase', 'Next.js', 'Expo'],
    linkLabel: 'View CRM demo',
    href: '/',
  },
  {
    title: 'Analytics Layer (in progress)',
    description:
      'Prototype analytics portal overlaying the CRM data, showcasing KPI cards, goal tracking, and narrative annotations.',
    tags: ['Supabase', 'Recharts', 'Storybook'],
    linkLabel: 'Coming soon',
    href: '#',
  },
  {
    title: 'Portfolio Hub',
    description:
      'Static portfolio site that links back to the CRM plus the other two demo projects. Includes deploy badges and contact info so you can demo any toggle quickly.',
    tags: ['Next.js', 'Vercel', 'Tailwind'],
    linkLabel: 'Launch soon',
    href: '#',
  },
];

export default function PortfolioPage() {
  const demoSteps = [
    {
      title: "Lead to Launch",
      detail:
        "Show how a lead becomes active and then completed by updating status, notes, and tags from the client deck.",
    },
    {
      title: "Live Activity",
      detail: "Log an interaction, delete it, and edit notes from the client detail right inside the mobile app.",
    },
    {
      title: "Data Ops",
      detail:
        "Point out the API docs + seed command so clients know you can refresh the Supabase data at any time and stay reproducible.",
    },
  ];

  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-5xl space-y-12 px-4 text-[color:var(--color-foreground)]">
        <Hero
          eyebrow="Portfolio"
          title="Three demos that show my energy book with a single click"
          copy="The CRM you see here plus two other spotlighted projects get bundled on this page so a single link can take your client through the stack."
        />

        <div className="grid gap-8 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.title}
              className="transform rounded-3xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-md)] transition hover:-translate-y-1 hover:border-[color:var(--color-line-strong)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950 dark:text-stone-100">{project.title}</h2>
                <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{project.linkLabel}</span>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--color-line)] px-3 py-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href={project.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-accent-cool)] hover:text-[color:var(--color-foreground)]">
                {project.linkLabel}
                <span aria-hidden>→</span>
              </Link>
            </div>
          ))}
        </div>

        <div className="space-y-6 rounded-3xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Demo script
          </p>
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-stone-100">Run through in under five minutes</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {demoSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface-strong)] p-5">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{step.title}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Portfolio Shell",
  description: "Quick links to the CRM demo plus scripted talking points for your pitch",
};
