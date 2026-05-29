import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { SessionFollowUpCard } from '@/components/session-follow-up-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { authorizedApiRequest } from '@/lib/api';
import type { MatchSessionDetailResponse } from '@/lib/match-sessions';

type MyReportRecord = {
  reported_user_id: string;
  session_id?: string | null;
};

type MyBlockRecord = {
  blocked_user_id: string;
};

export default function MatchSessionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, recentMatches } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const [detail, setDetail] = useState<MatchSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [relationshipState, setRelationshipState] = useState<{
    alreadyReported: boolean;
    alreadyBlocked: boolean;
  }>({
    alreadyReported: false,
    alreadyBlocked: false,
  });

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
      const response = await authorizedApiRequest<MatchSessionDetailResponse>(
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

  const otherUserId = detail?.session.other_profile?.user_id ?? cachedSession?.other_profile?.user_id ?? null;

  const loadRelationshipState = useCallback(async () => {
    if (!session || !otherUserId) {
      setRelationshipState({
        alreadyReported: false,
        alreadyBlocked: false,
      });
      return;
    }

    try {
      const [myReports, myBlocks] = await Promise.all([
        authorizedApiRequest<MyReportRecord[]>(session, '/reports/me'),
        authorizedApiRequest<MyBlockRecord[]>(session, '/blocks/me'),
      ]);

      setRelationshipState({
        alreadyReported: myReports.some(
          (record) => record.reported_user_id === otherUserId && record.session_id === resolvedSessionId,
        ),
        alreadyBlocked: myBlocks.some((record) => record.blocked_user_id === otherUserId),
      });
    } catch {
      setRelationshipState({
        alreadyReported: false,
        alreadyBlocked: false,
      });
    }
  }, [otherUserId, resolvedSessionId, session]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    void loadRelationshipState();
  }, [loadRelationshipState]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
      void loadRelationshipState();
    }, [loadDetail, loadRelationshipState]),
  );

  const handleRefreshSession = useCallback(async () => {
    setRefreshingSession(true);
    try {
      await loadDetail();
      await loadRelationshipState();
    } finally {
      setRefreshingSession(false);
    }
  }, [loadDetail, loadRelationshipState]);

  const summary = detail?.session;
  const sessionDurationLabel = useMemo(() => {
    if (!summary?.created_at || !summary?.ended_at) {
      return null;
    }

    const startedAt = new Date(summary.created_at).getTime();
    const endedAt = new Date(summary.ended_at).getTime();
    if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt <= startedAt) {
      return null;
    }

    const durationMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    return durationMinutes === 1
      ? 'About 1 minute'
      : `${durationMinutes} minutes`;
  }, [summary?.created_at, summary?.ended_at]);

  const followUpHint = useMemo(() => {
    if (!summary) {
      return null;
    }

    if (!summary.ended_at) {
      return 'This match is still open or has not fully closed yet. Wait for it to finish before filing a follow-up unless safety is urgent.';
    }

    if (!sessionDurationLabel) {
      return 'Use the report or block actions if you need to follow up on this session.';
    }

    const shortMatch = sessionDurationLabel === 'About 1 minute';
    if (shortMatch) {
      return 'This was a very short match. If it ended abruptly or felt suspicious, report or block now while the details are fresh.';
    }

    return 'This match had enough time to develop. Use the follow-up actions only if something specific happened.';
  }, [sessionDurationLabel, summary]);

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
        <Link href="/(private)/(tabs)/queue" style={styles.inlineLink}>
          <ThemedText style={styles.inlineLinkText}>Back to queue</ThemedText>
        </Link>
        <Pressable
          onPress={() => void handleRefreshSession()}
          style={({ pressed }) => [styles.refreshButton, pressed ? styles.buttonPressed : undefined]}
        >
          <ThemedText style={styles.refreshButtonText}>
            {refreshingSession ? 'Refreshing...' : 'Refresh session'}
          </ThemedText>
        </Pressable>
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
        <SessionOutcomeCard
          sessionId={summary.id}
          status={summary.status}
          currentUserRole={detail?.current_user_role ?? 'initiator'}
          createdAt={summary.created_at ?? null}
          endedAt={summary.ended_at ?? null}
          durationLabel={sessionDurationLabel}
          otherMember={{
            user_id: summary.other_profile?.user_id ?? 'unknown',
            display_name: summary.other_profile?.display_name ?? 'Another member',
            avatar_url: summary.other_profile?.avatar_url ?? null,
            country_code: summary.other_profile?.country_code ?? null,
          }}
        />
      ) : null}

      {session && summary?.other_profile ? (
        <SessionFollowUpCard
          session={session}
          sessionId={summary.id}
          otherUserId={summary.other_profile.user_id}
          alreadyReported={relationshipState.alreadyReported}
          alreadyBlocked={relationshipState.alreadyBlocked}
          contextHint={followUpHint}
          footerHint="Back to queue if you want to look for the next conversation."
          onSubmitted={() => {
            void loadDetail();
            void loadRelationshipState();
          }}
        />
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
  inlineLink: { alignSelf: 'flex-start' },
  inlineLinkText: { color: '#27566B', fontWeight: '700' },
  refreshButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  refreshButtonText: { color: '#27566B', fontWeight: '700' },
  buttonPressed: { opacity: 0.85 },
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
