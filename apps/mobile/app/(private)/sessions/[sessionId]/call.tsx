import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authorizedApiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { MatchSessionDetailResponse } from '@/lib/match-sessions';
import { buildSignalingUrl, type SignalingMessage } from '@/lib/signaling';

type CallState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

export default function MatchSessionCallScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, recentMatches } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const [detail, setDetail] = useState<MatchSessionDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [events, setEvents] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

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
      setLoadingDetail(false);
      return;
    }

    setLoadingDetail(true);
    setError(null);

    try {
      const response = await authorizedApiRequest<MatchSessionDetailResponse>(
        session,
        `/match/sessions/${resolvedSessionId}`,
      );
      setDetail(response);
    } catch {
      if (cachedSession) {
        setDetail({
          current_user_role: cachedSession.current_user_role ?? 'initiator',
          session: cachedSession,
        });
      } else {
        setError('Unable to load session detail for the call room.');
      }
    } finally {
      setLoadingDetail(false);
    }
  }, [cachedSession, resolvedSessionId, session]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!session || !resolvedSessionId) {
      return;
    }

    const socket = new WebSocket(buildSignalingUrl(resolvedSessionId, session.access_token));
    socketRef.current = socket;
    setCallState('connecting');
    setEvents((current) => [...current.slice(-10), `Connecting to session ${resolvedSessionId}...`]);

    socket.onopen = () => {
      setCallState('connected');
      setEvents((current) => [...current.slice(-10), 'Signaling socket connected.']);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as SignalingMessage;
        setEvents((current) => [
          ...current.slice(-10),
          `${payload.type}${payload.from_user_id ? ` from ${payload.from_user_id}` : ''}`,
        ]);
      } catch {
        setEvents((current) => [...current.slice(-10), 'Received a signaling event.']);
      }
    };

    socket.onerror = () => {
      setCallState('error');
      setEvents((current) => [...current.slice(-10), 'Signaling error.']);
    };

    socket.onclose = () => {
      setCallState((current) => (current === 'error' ? current : 'closed'));
      setEvents((current) => [...current.slice(-10), 'Signaling socket closed.']);
    };

    return () => {
      try {
        socket.close(1000, 'Leaving call room');
      } catch {
        // Ignore close failures during teardown.
      }
      socketRef.current = null;
    };
  }, [resolvedSessionId, session]);

  async function sendPing() {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(JSON.stringify({ type: 'ping', payload: { ts: Date.now() } }));
  }

  async function leaveRoom() {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(JSON.stringify({ type: 'leave' }));
  }

  const summary = detail?.session ?? cachedSession;
  const callStatusLabel =
    callState === 'connected'
      ? 'Ready'
      : callState === 'connecting'
        ? 'Connecting'
        : callState === 'error'
          ? 'Error'
          : callState === 'closed'
            ? 'Closed'
            : 'Idle';

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Match room</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Call room
        </ThemedText>
        <ThemedText style={styles.copy}>
          This route opens the signaling room for the matched session. The media layer is not wired
          yet, so this screen is currently the signaling testbed.
        </ThemedText>
        <Link href={summary ? `/(private)/sessions/${summary.id}` : '/(private)/(tabs)/queue'} style={styles.inlineLink}>
          <ThemedText style={styles.inlineLinkText}>Back to session</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardLabel}>Connection</ThemedText>
        <ThemedText type="subtitle">{callStatusLabel}</ThemedText>
        <ThemedText style={styles.cardCopy}>
          {resolvedSessionId
            ? `Session ${resolvedSessionId}`
            : 'No session id available for the call room.'}
        </ThemedText>
        <View style={styles.buttonRow}>
          <Pressable onPress={() => void sendPing()} style={styles.button}>
            <ThemedText style={styles.buttonText}>Send ping</ThemedText>
          </Pressable>
          <Pressable onPress={() => void leaveRoom()} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Leave room</ThemedText>
          </Pressable>
        </View>
        <ThemedText style={styles.cardCopy}>
          This is the backend signaling layer only. Video and audio streams still need a WebRTC
          media library before you can test a real call.
        </ThemedText>
      </ThemedView>

      {summary ? (
        <SessionOutcomeCard
          sessionId={summary.id}
          status={summary.status}
          currentUserRole={detail?.current_user_role ?? summary.current_user_role ?? 'initiator'}
          createdAt={summary.created_at ?? null}
          endedAt={summary.ended_at ?? null}
          otherMember={{
            user_id: summary.other_profile?.user_id ?? 'unknown',
            display_name: summary.other_profile?.display_name ?? 'Another member',
            avatar_url: summary.other_profile?.avatar_url ?? null,
            country_code: summary.other_profile?.country_code ?? null,
          }}
        />
      ) : loadingDetail ? (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardCopy}>Loading session detail...</ThemedText>
        </ThemedView>
      ) : error ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Session unavailable</ThemedText>
          <ThemedText style={styles.cardCopy}>{error}</ThemedText>
        </ThemedView>
      ) : null}

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Signaling log</ThemedText>
        {events.length > 0 ? (
          <View style={styles.logList}>
            {events.map((event, index) => (
              <ThemedText key={`${event}-${index}`} style={styles.logLine}>
                {event}
              </ThemedText>
            ))}
          </View>
        ) : (
          <ThemedText style={styles.cardCopy}>Waiting for signaling events.</ThemedText>
        )}
      </ThemedView>
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
  inlineLink: { alignSelf: 'flex-start' },
  inlineLinkText: { color: '#27566B', fontWeight: '700' },
  card: { borderRadius: 24, padding: 18, gap: 10 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  buttonRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  button: {
    borderRadius: 999,
    backgroundColor: '#1F7A61',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF8F2', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  logList: { gap: 6 },
  logLine: { fontSize: 13, lineHeight: 18, opacity: 0.72 },
});
