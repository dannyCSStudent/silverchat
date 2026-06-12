import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

export default function MatchSessionCallWebFallback() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { recentMatches } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const resolvedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId ?? null;
  const summary = recentMatches.find((item) => item.id === resolvedSessionId) ?? null;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Match room</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Call room
        </ThemedText>
        <ThemedText style={styles.copy}>
          Video calling is available only in the native dev client or a device build. The browser route
          stays here as a safe fallback so the app can still open cleanly on web.
        </ThemedText>
        <Link href={summary ? `/(private)/sessions/${summary.id}` : '/(private)/(tabs)/queue'} style={styles.inlineLink}>
          <ThemedText style={styles.inlineLinkText}>Back to session</ThemedText>
        </Link>
      </ThemedView>

      {summary ? (
        <SessionOutcomeCard
          sessionId={summary.id}
          status={summary.status}
          currentUserRole={summary.current_user_role ?? 'initiator'}
          createdAt={summary.created_at ?? null}
          endedAt={summary.ended_at ?? null}
          otherMember={{
            user_id: summary.other_profile?.user_id ?? 'unknown',
            display_name: summary.other_profile?.display_name ?? 'Another member',
            avatar_url: summary.other_profile?.avatar_url ?? null,
            country_code: summary.other_profile?.country_code ?? null,
          }}
        />
      ) : (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Session unavailable</ThemedText>
          <ThemedText style={styles.cardCopy}>
            No recent session summary is available for this call room.
          </ThemedText>
        </ThemedView>
      )}
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
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
});
