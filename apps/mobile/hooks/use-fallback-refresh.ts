import { useCallback, useEffect, useState } from 'react';

type UseFallbackRefreshOptions<T> = {
  autoLoad?: boolean;
  errorMessage: string;
  fallbackData: T;
  load: () => Promise<T>;
};

export function useFallbackRefresh<T>({
  autoLoad = false,
  errorMessage,
  fallbackData,
  load,
}: UseFallbackRefreshOptions<T>) {
  const [data, setData] = useState<T>(fallbackData);
  const [isFallback, setIsFallback] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const nextData = await load();
      setData(nextData);
      setIsFallback(false);
      setError(null);
    } catch {
      setData(fallbackData);
      setIsFallback(true);
      setError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  }, [errorMessage, fallbackData, load]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void refresh();
  }, [autoLoad, refresh]);

  return {
    data,
    error,
    isFallback,
    isRefreshing,
    refresh,
    setData,
    setError,
  };
}
