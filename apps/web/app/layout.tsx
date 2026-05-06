import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "./theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Northstar CRM",
  description: "Client pipeline dashboard for the business app starter",
};

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/health", label: "Health" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-transparent text-(--color-foreground)">
        <div className="mx-auto flex min-h-screen w-full max-w-400 flex-col gap-4 p-4 lg:flex-row lg:items-start lg:gap-5 lg:p-5">
          <aside className="w-full min-w-0 overflow-x-hidden rounded-4xl border border-(--color-line) bg-(--color-surface-dark) px-5 py-5 text-white shadow-(--shadow-lg) lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-70 lg:flex-none lg:overflow-y-auto lg:px-6 lg:py-6">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/45">
                  Northstar
                </p>
                <Link
                  href="/"
                  className="mt-3 block wrap-break-word text-2xl font-semibold tracking-tight"
                >
                  CRM
                </Link>
              </div>

              <div className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/65">
                V1
              </div>
            </div>

            <div className="mt-8 rounded-[26px] border border-white/8 bg-white/6 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Workspace</p>
              <p className="mt-2 text-xl font-semibold text-white">Client Ops</p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                Timeline-first workflow for keeping active accounts visible and calm.
              </p>
            </div>

            <nav className="mt-8 min-w-0 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-w-0 items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="ml-3 shrink-0 text-white/30">→</span>
                </Link>
              ))}
            </nav>

            <ThemeToggle />

            <div className="mt-8 grid gap-3">
              <div className="rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(184,92,56,0.22),rgba(255,255,255,0.04))] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Focus</p>
                <p className="mt-2 text-base font-semibold">Follow-up discipline</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Keep overdue work obvious without turning the dashboard into an alarm wall.
                </p>
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">System</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Shared data model across web, mobile, and API. Design decisions here should scale
                  to both surfaces.
                </p>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
