import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FreshnessLine } from '@/components/freshness-line';
import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

export default function MatchHistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { recentMatches } = useAuth();

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Match history</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Recent sessions
        </ThemedText>
        <ThemedText style={styles.copy}>
          Review past matches, reopen a session, or follow up with report and block actions when needed.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">History</ThemedText>
          <ThemedText style={styles.cardCopy}>{recentMatches.length} session{recentMatches.length === 1 ? '' : 's'}</ThemedText>
        </View>

        {recentMatches.length > 0 ? (
          recentMatches.map((session) => (
            <Link key={session.id} href={`/(private)/sessions/${session.id}`} style={styles.linkCard}>
              <SessionOutcomeCard
                title="Recent match"
                sessionId={session.id}
                status={session.status}
                currentUserRole={session.current_user_role ?? 'initiator'}
                createdAt={session.created_at ?? null}
                endedAt={session.ended_at ?? null}
                otherMember={{
                  user_id: session.other_profile?.user_id ?? session.id,
                  display_name: session.other_profile?.display_name ?? 'Another member',
                  avatar_url: session.other_profile?.avatar_url ?? null,
                  country_code: session.other_profile?.country_code ?? 'unknown country',
                }}
              />
            </Link>
          ))
        ) : (
          <ThemedText style={styles.cardCopy}>No recent sessions yet. Your future matches will appear here.</ThemedText>
        )}
      </ThemedView>

      {recentMatches[0] ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Most recent</ThemedText>
          <SessionOutcomeCard
            title="Latest session"
            sessionId={recentMatches[0].id}
            status={recentMatches[0].status}
            currentUserRole={recentMatches[0].current_user_role ?? 'initiator'}
            createdAt={recentMatches[0].created_at ?? null}
            endedAt={recentMatches[0].ended_at ?? null}
            otherMember={{
              user_id: recentMatches[0].other_profile?.user_id ?? recentMatches[0].id,
              display_name: recentMatches[0].other_profile?.display_name ?? 'Another member',
              avatar_url: recentMatches[0].other_profile?.avatar_url ?? null,
              country_code: recentMatches[0].other_profile?.country_code ?? 'unknown country',
            }}
          />
          <Link href={`/(private)/sessions/${recentMatches[0].id}`} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Open session detail</ThemedText>
          </Link>
          <FreshnessLine prefix="Updated" timestamp={recentMatches[0].created_at ?? null} />
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
  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  linkCard: { borderRadius: 24 },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
});
