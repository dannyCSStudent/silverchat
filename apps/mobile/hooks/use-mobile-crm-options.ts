import { useCallback, useMemo } from 'react';

import { useFallbackRefresh } from '@/hooks/use-fallback-refresh';
import {
  Client,
  ClientTag,
  ClientTagAssignment,
  fallbackAssignments,
  fallbackClients,
  fallbackTags,
  fetchJson,
} from '@/lib/crm';

export function useClientOptions() {
  const loadClients = useCallback(() => fetchJson<Client[]>('/clients/'), []);
  const { data, error, isFallback, isRefreshing, refresh } = useFallbackRefresh({
    autoLoad: true,
    errorMessage: 'Unable to refresh clients. Showing fallback data.',
    fallbackData: fallbackClients,
    load: loadClients,
  });

  return {
    clients: data,
    error,
    isFallback,
    isRefreshing,
    refresh,
  };
}

export function useTagOptions() {
  const fallbackData = useMemo(
    () => ({
      assignments: fallbackAssignments,
      tags: fallbackTags,
    }),
    [],
  );
  const loadTags = useCallback(
    async () => ({
      assignments: await fetchJson<ClientTagAssignment[]>('/client-tags/'),
      tags: await fetchJson<ClientTag[]>('/tags/'),
    }),
    [],
  );
  const { data, error, isFallback, refresh } = useFallbackRefresh({
    autoLoad: true,
    errorMessage: 'Unable to refresh tags. Showing fallback tag data.',
    fallbackData,
    load: loadTags,
  });

  return {
    assignments: data.assignments,
    error,
    isFallback,
    refresh,
    tags: data.tags,
  };
}
