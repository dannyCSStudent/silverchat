import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { SessionMemberCard } from '@/components/session-member-card';
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

type MyReportRecord = {
  reported_user_id: string;
  session_id?: string | null;
};

type MyBlockRecord = {
  blocked_user_id: string;
};

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'scam', label: 'Scam' },
  { id: 'other', label: 'Other' },
] as const;

export default function MatchSessionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, recentMatches } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]['id']>('spam');
  const [actionNote, setActionNote] = useState('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'report' | 'block' | null>(null);
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

  const handleReport = useCallback(async () => {
    if (!session || !resolvedSessionId || !otherUserId) {
      setActionStatus('No member is available to report yet.');
      return;
    }

    setBusyAction('report');
    setActionStatus(null);

    try {
      await authorizedApiRequest(session, '/reports', {
        method: 'POST',
        body: JSON.stringify({
          reported_user_id: otherUserId,
          reason: reportReason,
          details: actionNote.trim() || undefined,
          session_id: resolvedSessionId,
        }),
      });
      setActionStatus('Report submitted.');
      void loadDetail();
      void loadRelationshipState();
    } catch (requestError) {
      setActionStatus(requestError instanceof Error ? requestError.message : 'Unable to submit report.');
    } finally {
      setBusyAction(null);
    }
  }, [actionNote, otherUserId, reportReason, resolvedSessionId, session]);

  const handleBlock = useCallback(async () => {
    if (!session || !otherUserId) {
      setActionStatus('No member is available to block yet.');
      return;
    }

    setBusyAction('block');
    setActionStatus(null);

    try {
      await authorizedApiRequest(session, '/blocks', {
        method: 'POST',
        body: JSON.stringify({
          blocked_user_id: otherUserId,
          reason: actionNote.trim() || undefined,
        }),
      });
      setActionStatus('Block saved.');
      void loadDetail();
      void loadRelationshipState();
    } catch (requestError) {
      setActionStatus(requestError instanceof Error ? requestError.message : 'Unable to block member.');
    } finally {
      setBusyAction(null);
    }
  }, [actionNote, otherUserId, session]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    void loadRelationshipState();
  }, [loadRelationshipState]);

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

  const actionStateCopy = useMemo(() => {
    if (relationshipState.alreadyBlocked && relationshipState.alreadyReported) {
      return 'You already reported and blocked this member from this session.';
    }

    if (relationshipState.alreadyBlocked) {
      return 'You already blocked this member.';
    }

    if (relationshipState.alreadyReported) {
      return 'You already reported this member from this session.';
    }

    return null;
  }, [relationshipState.alreadyBlocked, relationshipState.alreadyReported]);

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
              { label: 'Length', value: sessionDurationLabel ?? '—' },
            ]}
          />
        </ThemedView>
      ) : null}

      {summary?.other_profile ? (
        <SessionMemberCard title="Other member" member={summary.other_profile} />
      ) : null}

      {summary?.other_profile ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Follow up</ThemedText>
          <ThemedText style={styles.cardCopy}>
            Block the member or file a report from this session detail.
          </ThemedText>
          <ThemedText style={styles.cardCopy}>{followUpHint}</ThemedText>
          {actionStateCopy ? <ThemedText style={styles.cardCopy}>{actionStateCopy}</ThemedText> : null}

          <View style={styles.reasonRow}>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason.id}
                onPress={() => setReportReason(reason.id)}
                style={[
                  styles.reasonChip,
                  reportReason === reason.id ? styles.reasonChipActive : undefined,
                ]}
              >
                <ThemedText
                  style={[
                    styles.reasonChipText,
                    reportReason === reason.id ? styles.reasonChipTextActive : undefined,
                  ]}
                >
                  {reason.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <TextInput
            placeholder="Optional note for the report or block"
            placeholderTextColor="rgba(39,86,107,0.52)"
            value={actionNote}
            onChangeText={setActionNote}
            style={[
              styles.input,
              {
                borderColor: colors.tint,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            multiline
          />

          {actionStatus ? (
            <ThemedText style={styles.cardCopy}>{actionStatus}</ThemedText>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => void handleReport()}
              disabled={busyAction !== null || relationshipState.alreadyReported}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : undefined,
                busyAction === 'report' ? styles.buttonDisabled : undefined,
                relationshipState.alreadyReported ? styles.buttonDisabled : undefined,
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                {relationshipState.alreadyReported
                  ? 'Already reported'
                  : busyAction === 'report'
                    ? 'Submitting...'
                    : `Report ${reportReason}`}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void handleBlock()}
              disabled={busyAction !== null || relationshipState.alreadyBlocked}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : undefined,
                busyAction === 'block' ? styles.buttonDisabled : undefined,
                relationshipState.alreadyBlocked ? styles.buttonDisabled : undefined,
              ]}
            >
              <ThemedText style={styles.secondaryButtonText}>
                {relationshipState.alreadyBlocked
                  ? 'Already blocked'
                  : busyAction === 'block'
                    ? 'Blocking...'
                    : 'Block member'}
              </ThemedText>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace('/(private)/(tabs)/queue')}
            style={({ pressed }) => [
              styles.inlineLink,
              pressed ? styles.inlineLinkPressed : undefined,
            ]}
          >
            <ThemedText style={styles.inlineLinkText}>Back to queue</ThemedText>
          </Pressable>
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
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reasonChipActive: {
    backgroundColor: 'rgba(39,86,107,0.12)',
    borderColor: 'rgba(39,86,107,0.4)',
  },
  reasonChipText: { color: '#27566B', fontWeight: '600' },
  reasonChipTextActive: { fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  actionRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#27566B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  inlineLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  inlineLinkPressed: { opacity: 0.7 },
  inlineLinkText: { color: '#27566B', fontWeight: '700' },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
});
