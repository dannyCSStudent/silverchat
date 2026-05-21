"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ModerationAdminHealth } from "./data";

const HEALTH_REFRESH_INTERVAL_MS = 30_000;

export type LiveAdminHealthState = {
  currentHealth: ModerationAdminHealth;
  isAutoRefreshEnabled: boolean;
  isRefreshing: boolean;
  lastFailedRefreshAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  refreshError: string | null;
  refreshHealth: () => Promise<void>;
  setIsAutoRefreshEnabled: (value: boolean | ((currentValue: boolean) => boolean)) => void;
};

const LiveAdminHealthContext = createContext<LiveAdminHealthState | null>(null);

async function fetchHealthSample() {
  const response = await fetch("/api/admin/health", {
    cache: "no-store",
  });
  const text = await response.text();

  let payload: ModerationAdminHealth | null = null;
  try {
    payload = JSON.parse(text) as ModerationAdminHealth;
  } catch {
    throw new Error(text || `Health request failed with ${response.status}.`);
  }

  return payload;
}

function useCreateLiveAdminHealth(initialHealth: ModerationAdminHealth): LiveAdminHealthState {
  const [currentHealth, setCurrentHealth] = useState(initialHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = useState<string | null>(
    initialHealth.sampledAt,
  );
  const [lastFailedRefreshAt, setLastFailedRefreshAt] = useState<string | null>(null);

  useEffect(() => {
    setCurrentHealth(initialHealth);
    setRefreshError(null);
    setLastSuccessfulRefreshAt(initialHealth.sampledAt);
  }, [initialHealth]);

  async function refreshHealth() {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const payload = await fetchHealthSample();
      setCurrentHealth(payload);
      setLastSuccessfulRefreshAt(payload.sampledAt);
    } catch (error) {
      setLastFailedRefreshAt(new Date().toISOString());
      setRefreshError(
        error instanceof Error ? error.message : "Unable to refresh admin health.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!isAutoRefreshEnabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshHealth();
    }, HEALTH_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isAutoRefreshEnabled]);

  return useMemo(
    () => ({
      currentHealth,
      isAutoRefreshEnabled,
      isRefreshing,
      lastFailedRefreshAt,
      lastSuccessfulRefreshAt,
      refreshError,
      refreshHealth,
      setIsAutoRefreshEnabled,
    }),
    [
      currentHealth,
      isAutoRefreshEnabled,
      isRefreshing,
      lastFailedRefreshAt,
      lastSuccessfulRefreshAt,
      refreshError,
    ],
  );
}

export function LiveAdminHealthProvider({
  children,
  initialHealth,
}: {
  children: ReactNode;
  initialHealth: ModerationAdminHealth;
}) {
  const value = useCreateLiveAdminHealth(initialHealth);

  return (
    <LiveAdminHealthContext.Provider value={value}>
      {children}
    </LiveAdminHealthContext.Provider>
  );
}

export function useLiveAdminHealth() {
  const context = useContext(LiveAdminHealthContext);
  if (!context) {
    throw new Error("useLiveAdminHealth must be used within LiveAdminHealthProvider");
  }

  return context;
}
