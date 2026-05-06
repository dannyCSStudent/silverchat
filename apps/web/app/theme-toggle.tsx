"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "northstar-web-theme-preference";
const THEME_PREFERENCE_EVENT = "northstar-theme-preference-change";

function applyTheme(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", preference);
  }
}

function subscribeToThemePreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handlePreferenceChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_PREFERENCE_EVENT, handlePreferenceChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_PREFERENCE_EVENT, handlePreferenceChange);
  };
}

function getThemePreferenceSnapshot(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeToggle() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToThemePreference,
    getThemePreferenceSnapshot,
    (): ThemePreference => "system"
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    applyTheme(preference);

    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolvedTheme = () => {
      const nextResolvedTheme: "light" | "dark" =
        preference === "system" ? (media.matches ? "dark" : "light") : preference;

      setResolvedTheme(nextResolvedTheme);
    };

    updateResolvedTheme();
    media.addEventListener("change", updateResolvedTheme);

    return () => {
      media.removeEventListener("change", updateResolvedTheme);
    };
  }, [preference]);

  function updatePreference(nextPreference: ThemePreference) {
    window.localStorage.setItem(STORAGE_KEY, nextPreference);
    applyTheme(nextPreference);
    window.dispatchEvent(new Event(THEME_PREFERENCE_EVENT));
  }

  return (
    <div className="mt-8 w-full max-w-full overflow-hidden rounded-[26px] border border-white/8 bg-white/6 p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">Appearance</p>
          <p className="mt-2 text-lg font-semibold leading-tight text-white">Theme</p>
        </div>

        <div className="self-start rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">
          {preference === "system" ? `Following ${resolvedTheme}` : `${preference} locked`}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/62">
        Match the OS, or lock the interface for design review and QA.
      </p>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <div className="min-w-0 rounded-3xl border border-white/8 bg-white/8 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Current Mode
          </p>
          <p className="mt-2 text-base font-semibold leading-snug text-white">
            {resolvedTheme === "dark" ? "Dark slate surfaces" : "Warm paper surfaces"}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/58">
            {preference === "system" ? "System preference" : "Manual override"}
          </p>
        </div>

        <div className="min-w-0 rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(184,92,56,0.22),rgba(39,86,107,0.12))] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Palette
          </p>
          <div className="mt-3 flex gap-2">
            <span className="h-9 min-w-0 flex-1 rounded-2xl bg-[#D98A62]" />
            <span className="h-9 min-w-0 flex-1 rounded-2xl bg-[#27566B]" />
            <span className="h-9 min-w-0 flex-1 rounded-2xl bg-[#C9B8A3]" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["system", "light", "dark"] as ThemePreference[]).map((option) => {
          const active = preference === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => updatePreference(option)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                active
                  ? "border-white/20 bg-white text-slate-950"
                  : "border-white/10 bg-white/6 text-white/72 hover:bg-white/10"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
