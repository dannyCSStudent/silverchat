import type { Interest, Profile } from "@repo/types";

const apiBaseUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

const fallbackProfiles: Profile[] = [
  {
    user_id: "sample-user-1",
    display_name: "Eleanor",
    date_of_birth: "1974-07-18",
    bio: "Likes gardening, live music, and long conversations.",
    country_code: "US",
    age_verified_status: "self_attested",
    profile_status: "active",
    onboarding_completed_at: "2026-05-05T18:40:00.000Z",
  },
  {
    user_id: "sample-user-2",
    display_name: "Marcus",
    date_of_birth: "1968-11-02",
    bio: "Recently joined and still selecting interests.",
    country_code: "US",
    age_verified_status: "pending",
    profile_status: "pending",
  },
];

const fallbackInterests: Interest[] = [
  { id: "travel", name: "Travel", category: "Lifestyle" },
  { id: "books", name: "Books", category: "Culture" },
  { id: "music", name: "Music", category: "Culture" },
];

async function getOverviewData() {
  try {
    const [profilesResponse, interestsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/profiles/`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/interests/`, { cache: "no-store" }),
    ]);

    if (!profilesResponse.ok || !interestsResponse.ok) {
      throw new Error("Overview API request failed");
    }

    const [profiles, interests] = (await Promise.all([
      profilesResponse.json(),
      interestsResponse.json(),
    ])) as [Profile[], Interest[]];

    return { profiles, interests, isFallback: false };
  } catch {
    return { profiles: fallbackProfiles, interests: fallbackInterests, isFallback: true };
  }
}

export default async function Home() {
  const { profiles, interests, isFallback } = await getOverviewData();
  const activeProfiles = profiles.filter((profile) => profile.profile_status === "active").length;
  const pendingProfiles = profiles.filter((profile) => profile.profile_status === "pending").length;
  const completedOnboarding = profiles.filter((profile) => profile.onboarding_completed_at).length;
  const verifiedProfiles = profiles.filter((profile) => profile.age_verified_status === "verified").length;

  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-2">
      <section className="rounded-[40px] border border-(--color-line) bg-[linear-gradient(135deg,var(--color-hero-start),var(--color-hero-end))] p-7 shadow-(--shadow-lg) backdrop-blur sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="max-w-3xl space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500 dark:text-slate-400">
              Phase 1 foundation
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-stone-100 sm:text-5xl">
              Align auth, onboarding, and safety before building live video.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              This repo now targets SilverChat directly: Supabase Auth for identity, FastAPI for
              typed application logic, and a moderation-aware Postgres schema for older-adult
              onboarding.
            </p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full bg-(--color-foreground) px-5 py-3 text-(--color-background)">
                Supabase Auth boundary
              </span>
              <span className="rounded-full border border-(--color-line-strong) bg-(--color-chip-surface) px-5 py-3 text-slate-800 dark:text-stone-100">
                FastAPI repositories
              </span>
              <span className="rounded-full border border-(--color-line-strong) bg-(--color-chip-surface) px-5 py-3 text-slate-800 dark:text-stone-100">
                Reports + blocks ready
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <div className="rounded-[28px] bg-(--color-surface-dark) p-5 text-white">
              <p className="text-sm text-white/58">Active profiles</p>
              <p className="mt-3 text-4xl font-semibold">{activeProfiles}</p>
              <p className="mt-3 text-sm text-white/62">Users ready for live matching.</p>
            </div>
            <div className="rounded-[28px] border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending profiles</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{pendingProfiles}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Users still in onboarding.</p>
            </div>
            <div className="rounded-[28px] border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Onboarding complete</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950 dark:text-stone-100">{completedOnboarding}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Profiles eligible for queue entry.</p>
            </div>
            <div className="rounded-[28px] border border-(--color-line) bg-(--color-accent-soft) p-5">
              <p className="text-sm text-slate-600">Age verified</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950">{verifiedProfiles}</p>
              <p className="mt-3 text-sm text-slate-600">Ready for stronger trust signals later.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                Build sequence
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
                What this repo is ready for now
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
                Profiles API
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{profiles.length}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Create and update onboarding state per user.</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Interests API
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">{interests.length}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Seeded starter interests for onboarding.</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Moderation APIs
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-stone-100">2</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Reports and blocks ready before video launch.</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5">
            <p className="text-sm font-semibold text-slate-950 dark:text-stone-100">Immediate next implementation</p>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <li>1. Wire Expo sign-up and session restore with Supabase Auth.</li>
              <li>2. Post profile data to `/profiles/me` after login.</li>
              <li>3. Save interest selection through `/interests/me`.</li>
              <li>4. Gate queue entry on onboarding completion and safety status.</li>
            </ol>
          </div>
        </div>

        <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Sample users
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
            Preview the Phase 1 state model
          </h2>
          <div className="mt-6 space-y-4">
            {profiles.map((profile) => (
              <div
                key={profile.user_id}
                className="rounded-3xl border border-(--color-line) bg-(--color-surface-strong) p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950 dark:text-stone-100">
                      {profile.display_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {profile.bio ?? "No bio provided yet."}
                    </p>
                  </div>
                  <div className="rounded-full bg-(--color-accent-soft) px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">
                    {profile.profile_status}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
                    {profile.age_verified_status}
                  </span>
                  <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
                    {profile.country_code ?? "Country pending"}
                  </span>
                  <span className="rounded-full bg-(--color-chip-muted) px-3 py-2">
                    {profile.onboarding_completed_at ? "Onboarding complete" : "Onboarding pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
