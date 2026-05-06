import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ConnectionDiagnosticsProps = {
  apiBaseUrl: string;
  isFallback: boolean;
  label: string;
};

export function ConnectionDiagnostics({
  apiBaseUrl,
  isFallback,
  label,
}: ConnectionDiagnosticsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const [healthStatus, setHealthStatus] = useState('Checking /health...');
  const [healthOk, setHealthOk] = useState(false);
  const [dbHealthStatus, setDbHealthStatus] = useState('Checking /health/db...');
  const [dbHealthOk, setDbHealthOk] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const pointsToLoopback =
    apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1');

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      if (!cancelled) {
        setIsChecking(true);
        setHealthStatus('Checking /health...');
        setDbHealthStatus('Checking /health/db...');
      }

      try {
        const response = await fetch(`${apiBaseUrl}/health`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { status?: string };

        if (!cancelled) {
          setHealthOk(true);
          setHealthStatus(`Health: ${payload.status ?? 'ok'}`);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'unreachable';
          setHealthOk(false);
          setHealthStatus(`Health: ${message}`);
        }
      }

      try {
        const response = await fetch(`${apiBaseUrl}/health/db`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          sample_count?: number;
          status?: string;
        };

        if (!cancelled) {
          setDbHealthOk(true);
          setDbHealthStatus(
            `DB: ${payload.status ?? 'ok'}${typeof payload.sample_count === 'number' ? ` (sample_count=${payload.sample_count})` : ''}`,
          );
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'unreachable';
          setDbHealthOk(false);
          setDbHealthStatus(`DB: ${message}`);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const showWarning = isFallback || !healthOk || !dbHealthOk;

  return (
    <ThemedView style={[styles.card, isDark && styles.cardDark]}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      {showWarning ? (
        <ThemedView style={styles.warningCard}>
          <ThemedText style={styles.warningTitle}>Mobile backend disconnected</ThemedText>
          <ThemedText style={styles.warningText}>
            Set `EXPO_PUBLIC_API_URL` to your reachable API host, then restart Expo.
          </ThemedText>
          {pointsToLoopback ? (
            <ThemedText style={styles.warningText}>
              `localhost` and `127.0.0.1` point to the device itself. Use your computer&apos;s LAN IP
              instead, or `10.0.2.2` for Android emulator.
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}
      <ThemedText style={styles.value}>
        Mode: {isFallback ? 'Fallback data' : 'Live API'}
      </ThemedText>
      <ThemedText style={styles.value}>{healthStatus}</ThemedText>
      <ThemedText style={styles.value}>{dbHealthStatus}</ThemedText>
      <ThemedText numberOfLines={2} style={styles.value}>
        API: {apiBaseUrl}
      </ThemedText>
      <Pressable
        disabled={isChecking}
        onPress={() => {
          setHealthOk(false);
          setHealthStatus('Checking /health...');
          setDbHealthOk(false);
          setDbHealthStatus('Checking /health/db...');
          setIsChecking(true);
          void Promise.all([
            fetch(`${apiBaseUrl}/health`)
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                const payload = (await response.json()) as { status?: string };
                setHealthOk(true);
                setHealthStatus(`Health: ${payload.status ?? 'ok'}`);
              })
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'unreachable';
                setHealthOk(false);
                setHealthStatus(`Health: ${message}`);
              }),
            fetch(`${apiBaseUrl}/health/db`)
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                const payload = (await response.json()) as {
                  sample_count?: number;
                  status?: string;
                };
                setDbHealthOk(true);
                setDbHealthStatus(
                  `DB: ${payload.status ?? 'ok'}${typeof payload.sample_count === 'number' ? ` (sample_count=${payload.sample_count})` : ''}`,
                );
              })
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'unreachable';
                setDbHealthOk(false);
                setDbHealthStatus(`DB: ${message}`);
              }),
          ]).finally(() => {
            setIsChecking(false);
          });
        }}
        style={[styles.retryButton, isChecking && styles.retryButtonDisabled]}>
        <ThemedText style={styles.retryButtonText}>
          {isChecking ? 'Checking...' : 'Retry Health Check'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,251,245,0.82)',
    gap: 8,
  },
  cardDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(24,33,43,0.82)',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#6D7A88',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#18212B',
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    textTransform: 'uppercase',
  },
  warningCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
  },
});
