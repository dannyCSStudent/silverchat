import Link from "next/link";
import type { Client, ClientActivity, ClientTag, ClientTagAssignment } from "@repo/types";
import { ClientDashboard } from "./client-dashboard";
import { ActivityDashboard } from "./activity-dashboard";
import { QuickActions } from "./quick-actions";
import { RecordEditor } from "./record-editor";
import { RecordManager } from "./record-manager";

const apiBaseUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const fallbackClients: Client[] = [
  {
    id: "sample-1",
    name: "Acorn Atelier",
    email: "ops@acornatelier.com",
    profile_image_url: "https://randomuser.me/api/portraits/women/44.jpg",
    banner_image_url: "https://picsum.photos/id/1011/1200/360",
    status: "active",
    notes: "Priority account focused on onboarding and expansion scope.",
    last_contacted_at: "2026-03-21T10:00:00.000Z",
    tags: [
      { id: "priority", name: "Priority", color: "#f97316" },
      { id: "design", name: "Design", color: "#0ea5e9" },
    ],
  },
  {
    id: "sample-2",
    name: "Blue Peak Logistics",
    phone: "(312) 555-0184",
    profile_image_url: "https://randomuser.me/api/portraits/men/32.jpg",
    banner_image_url: "https://picsum.photos/id/1031/1200/360",
    status: "lead",
    notes: "Waiting on budget confirmation before proposal review.",
    tags: [{ id: "follow-up", name: "Follow Up", color: "#f59e0b" }],
  },
  {
    id: "sample-3",
    name: "Fern Harbor Dental",
    email: "frontdesk@fernharbor.example",
    profile_image_url: "https://randomuser.me/api/portraits/women/68.jpg",
    banner_image_url: "https://picsum.photos/id/1040/1200/360",
    status: "completed",
    notes: "Project completed and handed off successfully.",
    last_contacted_at: "2026-03-14T15:30:00.000Z",
  },
];

const fallbackActivity: ClientActivity[] = [
  {
    id: "activity-1",
    client_id: "sample-1",
    interaction_type: "meeting",
    notes: "Reviewed onboarding checklist and next quarter expansion scope.",
    timestamp: "2026-03-23T16:00:00.000Z",
  },
  {
    id: "activity-2",
    client_id: "sample-1",
    interaction_type: "note",
    notes: "Assigned design and priority tags after kickoff.",
    timestamp: "2026-03-22T11:45:00.000Z",
  },
  {
    id: "activity-3",
    client_id: "sample-2",
    interaction_type: "follow_up",
    notes: "Sent pricing summary and requested budget confirmation.",
    timestamp: "2026-03-22T13:15:00.000Z",
  },
  {
    id: "activity-4",
    client_id: "sample-3",
    interaction_type: "email",
    notes: "Shared handoff notes after project completion.",
    timestamp: "2026-03-19T09:30:00.000Z",
  },
];

const fallbackTags: ClientTag[] = [
  { id: "priority", name: "Priority", color: "#f97316" },
  { id: "design", name: "Design", color: "#0ea5e9" },
  { id: "follow-up", name: "Follow Up", color: "#f59e0b" },
];

const fallbackClientTags: ClientTagAssignment[] = [
  { client_id: "sample-1", tag_id: "priority" },
  { client_id: "sample-1", tag_id: "design" },
  { client_id: "sample-2", tag_id: "follow-up" },
];

async function getDashboardData() {
  try {
    const [clientsResponse, activityResponse, tagsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/clients/`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/activity/`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/tags/`, { cache: "no-store" }),
    ]);

    if (!clientsResponse.ok || !activityResponse.ok || !tagsResponse.ok) {
      throw new Error("Dashboard API request failed");
    }

    const [clients, activity, tags] = (await Promise.all([
      clientsResponse.json(),
      activityResponse.json(),
      tagsResponse.json(),
    ])) as [Client[], ClientActivity[], ClientTag[]];

    const clientTagsResponse = await fetch(`${apiBaseUrl}/client-tags/`, { cache: "no-store" });
    const clientTags = clientTagsResponse.ok
      ? ((await clientTagsResponse.json()) as ClientTagAssignment[])
      : [];

    const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
    const enrichedClients = clients.map((client) => ({
      ...client,
      tags: clientTags
        .filter((assignment) => assignment.client_id === client.id)
        .map((assignment) => tagsById.get(assignment.tag_id))
        .filter((tag): tag is ClientTag => Boolean(tag)),
    }));

    return { clients: enrichedClients, activity, tags, clientTags, isFallback: false };
  } catch {
    return {
      clients: fallbackClients,
      activity: fallbackActivity,
      tags: fallbackTags,
      clientTags: fallbackClientTags,
      isFallback: true,
    };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { clients, activity, tags, clientTags, isFallback } = await getDashboardData();
  const editClientParam = resolvedSearchParams?.editClient;
  const editActivityParam = resolvedSearchParams?.editActivity;
  const initialClientId =
    typeof editClientParam === "string" ? editClientParam : undefined;
  const initialActivityId =
    typeof editActivityParam === "string" ? editActivityParam : undefined;
  const activeClients = clients.filter((client) => client.status === "active").length;
  const leadClients = clients.filter((client) => client.status === "lead").length;
  const completedClients = clients.filter((client) => client.status === "completed").length;
  const followUpCount = activity.filter((item) => item.interaction_type === "follow_up").length;
  const recentActivity = [...activity]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 3);
  const priorityClients = clients
    .filter((client) => client.tags?.some((tag) => tag.name.toLowerCase().includes("priority")))
    .slice(0, 3);
  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <section className="rounded-[40px] border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-7 shadow-(--shadow-lg) backdrop-blur sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500 dark:text-slate-400">
              Operations dashboard
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-stone-100 sm:text-5xl">
              Keep the pipeline visible before it turns reactive.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Northstar is now structured as a timeline-first CRM workspace. The dashboard stays
              useful with live API data, and it degrades to seeded records when the backend is
              offline.
            </p>

            <div className="mt-7 text-amber-500 flex flex-wrap gap-3">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 rounded-full bg-(--color-foreground) px-5 py-3 text-sm font-semibold transition hover:opacity-92"
              >
                View portfolio shell
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#client-dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line-strong)] bg-(--color-chip-surface) px-5 py-3 text-sm font-semibold text-slate-800 transition hover:opacity-92 dark:text-stone-100"
              >
                Jump to client pipeline
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <div className="rounded-[28px] bg-(--color-surface-dark) p-5 text-white">
              <p className="text-sm text-white/58">Active accounts</p>
              <p className="mt-3 text-4xl font-semibold">{activeClients}</p>
              <p className="mt-3 text-sm text-white/62">Current relationships in motion.</p>
            </div>
            <div className="rounded-[28px] border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Leads</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{leadClients}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Prospects waiting for conversion.</p>
            </div>
            <div className="rounded-[28px] border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{completedClients}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Closed loops and finished delivery.</p>
            </div>
            <div className="rounded-[28px] border border-(--color-line) bg-(--color-accent-soft) p-5">
              <p className="text-sm text-slate-600">Follow-ups due</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950">{followUpCount}</p>
              <p className="mt-3 text-sm text-slate-600">Needs attention before momentum slips.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                Overview
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
                Today&apos;s operating picture
              </h2>
            </div>
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                isFallback ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {isFallback ? "Fallback dataset" : "Live API connected"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Recent activity
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{activity.length}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Logged across the visible timeline.</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Shared tags
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{tags.length}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Reusable labels across the pipeline.</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Assignments
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{clientTags.length}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Client-to-tag relationships in play.</p>
            </div>
          </div>
        </div>

        <aside className="rounded-[34px] border border-(--color-line) bg-(--color-surface-dark) p-6 text-white shadow-(--shadow-md)">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
            Watchlist
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Priority clients</h2>
          <div className="mt-5 space-y-3">
            {priorityClients.length ? (
              priorityClients.map((client) => (
                <div key={client.id} className="rounded-3xl border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{client.name}</p>
                      <p className="mt-1 text-sm text-white/58">{client.status}</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                      Priority
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/68">No priority-tagged clients in the current set.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <ClientDashboard
          clients={clients}
          tags={tags}
          apiBaseUrl={apiBaseUrl}
          isFallback={isFallback}
        />

        <aside className="grid gap-6">
          <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Follow-ups
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Next actions
            </h3>
            <div className="mt-5 space-y-3">
              {recentActivity.map((item) => {
                const clientName =
                  clients.find((client) => client.id === item.client_id)?.name ?? "Unknown client";

                return (
                  <div key={item.id} className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {item.interaction_type.replace("_", " ")}
                    </p>
                    <p className="mt-2 font-semibold text-slate-950 dark:text-stone-100">{clientName}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.notes ?? "No notes attached."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
              Tag library
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
              Shared labels
            </h3>
            <div className="mt-5 flex flex-wrap gap-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-(--color-line) px-3 py-2 text-sm font-medium text-slate-700 dark:text-stone-100"
                  style={{ backgroundColor: `${tag.color}20` }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <ActivityDashboard clients={clients} activity={activity} />

        <div className="grid gap-6">
          <QuickActions apiBaseUrl={apiBaseUrl} clients={clients} tags={tags} isFallback={isFallback} />
          <RecordEditor
            apiBaseUrl={apiBaseUrl}
            clients={clients}
            activity={activity}
            isFallback={isFallback}
            initialClientId={initialClientId}
            initialActivityId={initialActivityId}
          />
        </div>
      </section>

      <RecordManager
        apiBaseUrl={apiBaseUrl}
        clients={clients}
        activity={activity}
        tags={tags}
        clientTags={clientTags}
        isFallback={isFallback}
      />
    </main>
  );
}
