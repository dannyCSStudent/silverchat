import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'scam', label: 'Scam' },
  { id: 'other', label: 'Other' },
] as const;

export default function MatchSessionScreen() {
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
    } catch (requestError) {
      setActionStatus(requestError instanceof Error ? requestError.message : 'Unable to block member.');
    } finally {
      setBusyAction(null);
    }
  }, [actionNote, otherUserId, session]);

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

      {summary?.other_profile ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Follow up</ThemedText>
          <ThemedText style={styles.cardCopy}>
            Block the member or file a report from this session detail.
          </ThemedText>

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
              disabled={busyAction !== null}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : undefined,
                busyAction === 'report' ? styles.buttonDisabled : undefined,
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                {busyAction === 'report' ? 'Submitting...' : `Report ${reportReason}`}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void handleBlock()}
              disabled={busyAction !== null}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : undefined,
                busyAction === 'block' ? styles.buttonDisabled : undefined,
              ]}
            >
              <ThemedText style={styles.secondaryButtonText}>
                {busyAction === 'block' ? 'Blocking...' : 'Block member'}
              </ThemedText>
            </Pressable>
          </View>
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
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
});
