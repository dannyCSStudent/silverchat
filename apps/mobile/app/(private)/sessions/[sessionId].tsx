import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { authorizedApiRequest } from '@/lib/api';

type SessionDetailResponse = {
  current_user_role: 'initiator' | 'recipient';
  session: {
    id: string;
    status?: string | null;
    created_at?: string | null;
    ended_at?: string | null;
    other_profile?: {
      user_id: string;
      display_name: string;
      avatar_url?: string | null;
      country_code?: string | null;
    } | null;
  };
};

export default function MatchSessionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, recentMatches } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedSessionId = useMemo(() => {
    if (!sessionId) {
      return null;
    }

    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }, [sessionId]);

  const cachedSession = useMemo(
    () => recentMatches.find((item) => item.id === resolvedSessionId) ?? null,
    [recentMatches, resolvedSessionId],
  );

  const loadDetail = useCallback(async () => {
    if (!session || !resolvedSessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authorizedApiRequest<SessionDetailResponse>(
        session,
        `/match/sessions/${resolvedSessionId}`,
      );
      setDetail(response);
    } catch (requestError) {
      if (cachedSession) {
        setDetail({
          current_user_role: 'initiator',
          session: {
            id: cachedSession.id,
            status: cachedSession.status ?? null,
            created_at: cachedSession.created_at ?? null,
            ended_at: cachedSession.ended_at ?? null,
            other_profile: cachedSession.other_profile ?? null,
          },
        });
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load session.');
      }
    } finally {
      setLoading(false);
    }
  }, [cachedSession, resolvedSessionId, session]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const summary = detail?.session;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Match history</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Session detail
        </ThemedText>
        <ThemedText style={styles.copy}>
          Review the outcome of a past match and open the member again if you need to follow up.
        </ThemedText>
      </ThemedView>

      {loading ? (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardCopy}>Loading session detail...</ThemedText>
        </ThemedView>
      ) : null}

      {error ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Session unavailable</ThemedText>
          <ThemedText style={styles.cardCopy}>{error}</ThemedText>
          <Pressable onPress={() => void loadDetail()} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Retry</ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}

      {summary ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">
            {summary.other_profile?.display_name ?? 'Another member'}
          </ThemedText>
          <ThemedText style={styles.cardCopy}>
            {summary.other_profile?.country_code ?? 'Country not set'}
          </ThemedText>
          <FreshnessLine prefix="Started" timestamp={summary.created_at ?? null} />
          <FreshnessLine prefix="Ended" timestamp={summary.ended_at ?? null} />
          <ReadinessMetricList
            metrics={[
              { label: 'Session id', value: summary.id },
              { label: 'Status', value: summary.status ?? 'matched' },
              { label: 'Role', value: detail?.current_user_role ?? 'initiator' },
            ]}
          />
        </ThemedView>
      ) : null}

      {summary?.other_profile ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Other member</ThemedText>
          <ThemedText style={styles.cardCopy}>{summary.other_profile.display_name}</ThemedText>
          <ThemedText style={styles.cardCopy}>
            {summary.other_profile.country_code ?? 'Country not set'}
          </ThemedText>
        </ThemedView>
      ) : null}

      {!loading && !summary && !error ? (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardCopy}>No session details are available yet.</ThemedText>
        </ThemedView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 18, paddingBottom: 36 },
  hero: { borderRadius: 28, padding: 22, gap: 10 },
  eyebrow: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.3, opacity: 0.62 },
  title: { fontSize: 30, lineHeight: 34 },
  copy: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  card: { borderRadius: 24, padding: 18, gap: 12 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
});
