import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

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
  const [roleFilter, setRoleFilter] = useState<'all' | 'initiator' | 'recipient'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'ended'>('all');
  const [sessionLookup, setSessionLookup] = useState('');

  const orderedMatches = useMemo(
    () =>
      [...recentMatches].sort((left, right) => {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightTime - leftTime;
      }),
    [recentMatches],
  );

  const filteredMatches = useMemo(() => {
    return orderedMatches.filter((session) => {
      const roleMatches = roleFilter === 'all' || session.current_user_role === roleFilter;
      const sessionStatus = session.ended_at ? 'ended' : 'matched';
      const statusMatches = statusFilter === 'all' || sessionStatus === statusFilter;
      return roleMatches && statusMatches;
    });
  }, [orderedMatches, roleFilter, statusFilter]);

  const initiatedCount = useMemo(
    () => recentMatches.filter((session) => session.current_user_role === 'initiator').length,
    [recentMatches],
  );
  const receivedCount = useMemo(
    () => recentMatches.filter((session) => session.current_user_role === 'recipient').length,
    [recentMatches],
  );
  const matchedCount = useMemo(
    () => recentMatches.filter((session) => !session.ended_at).length,
    [recentMatches],
  );
  const endedCount = useMemo(
    () => recentMatches.filter((session) => Boolean(session.ended_at)).length,
    [recentMatches],
  );
  const sessionIdHint = orderedMatches[0]?.id ? `Most recent session id: ${orderedMatches[0].id}` : null;
  const lookupHint = 'Try a session id, member name, country code, initiator, recipient, matched, or ended.';
  const lookupMatches = useMemo(() => {
    const value = sessionLookup.trim().toLowerCase();
    if (!value) {
      return [];
    }

    return orderedMatches
      .map((session) => {
      const sessionId = session.id.toLowerCase();
      const memberName = session.other_profile?.display_name?.toLowerCase() ?? '';
      const countryCode = session.other_profile?.country_code?.toLowerCase() ?? '';
      const roleKeywords =
        session.current_user_role === 'initiator'
          ? ['initiator', 'initiated', 'start']
          : session.current_user_role === 'recipient'
            ? ['recipient', 'received', 'receive']
          : [];
      const statusKeywords = session.ended_at ? ['ended', 'closed'] : ['matched', 'active', 'open'];

      const matchReasons = [
        sessionId.includes(value) ? 'session id' : null,
        memberName.includes(value) ? 'member name' : null,
        countryCode.includes(value) ? 'country code' : null,
        roleKeywords.some((keyword) => keyword.includes(value) || value.includes(keyword)) ? 'role' : null,
        statusKeywords.some((keyword) => keyword.includes(value) || value.includes(keyword)) ? 'status' : null,
      ].filter(Boolean) as string[];

      const score = [
        sessionId === value ? 10 : sessionId.includes(value) ? 8 : 0,
        memberName === value ? 7 : memberName.includes(value) ? 5 : 0,
        countryCode === value ? 4 : countryCode.includes(value) ? 3 : 0,
        roleKeywords.some((keyword) => keyword === value) ? 2 : roleKeywords.some((keyword) => keyword.includes(value) || value.includes(keyword)) ? 1 : 0,
        statusKeywords.some((keyword) => keyword === value) ? 2 : statusKeywords.some((keyword) => keyword.includes(value) || value.includes(keyword)) ? 1 : 0,
      ].reduce((total, part) => total + part, 0);

      return {
        session,
        matchReasons,
        score,
      };
    })
      .filter(({ matchReasons }) => matchReasons.length > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const leftTime = left.session.created_at ? new Date(left.session.created_at).getTime() : 0;
        const rightTime = right.session.created_at ? new Date(right.session.created_at).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [orderedMatches, sessionLookup]);

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
        {sessionIdHint ? <ThemedText style={styles.hint}>{sessionIdHint}</ThemedText> : null}

        <View style={styles.lookupCard}>
          <ThemedText style={styles.cardLabel}>Jump to a session</ThemedText>
          <TextInput
            placeholder="Paste a session id or member name"
            placeholderTextColor="rgba(39,86,107,0.52)"
            value={sessionLookup}
            onChangeText={setSessionLookup}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.lookupInput,
              {
                borderColor: colors.tint,
                color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          />
          <ThemedText style={styles.lookupHint}>{lookupHint}</ThemedText>
          {lookupMatches.length > 0 ? (
            <View style={styles.lookupResult}>
              <ThemedText style={styles.cardCopy}>
                Found {lookupMatches.length} matching session{lookupMatches.length === 1 ? '' : 's'}.
              </ThemedText>
              {lookupMatches.slice(0, 3).map(({ session, matchReasons }) => (
                <Link key={session.id} href={`/(private)/sessions/${session.id}`} style={styles.secondaryButton}>
                  <ThemedText style={styles.secondaryButtonText}>
                    Open {session.other_profile?.display_name ?? 'session'} detail
                  </ThemedText>
                  <ThemedText style={styles.lookupMatchReason}>
                    Matched by {matchReasons.join(', ')}
                  </ThemedText>
                </Link>
              ))}
              {lookupMatches.length > 3 ? (
                <ThemedText style={styles.cardCopy}>
                  Showing the first 3 matches. Narrow the name or id to find a specific session.
                </ThemedText>
              ) : null}
            </View>
          ) : sessionLookup.trim() ? (
            <ThemedText style={styles.cardCopy}>No recent session matches that id, name, or country code.</ThemedText>
          ) : null}
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">History</ThemedText>
          <ThemedText style={styles.cardCopy}>
            {recentMatches.length} session{recentMatches.length === 1 ? '' : 's'}
          </ThemedText>
        </View>

        <View style={styles.filterRow}>
          {[
            { id: 'all' as const, label: 'All', count: recentMatches.length },
            { id: 'initiator' as const, label: 'Initiated', count: initiatedCount },
            { id: 'recipient' as const, label: 'Received', count: receivedCount },
          ].map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setRoleFilter(filter.id)}
              style={({ pressed }) => [
                styles.filterChip,
                roleFilter === filter.id ? styles.filterChipActive : undefined,
                pressed ? styles.filterChipPressed : undefined,
              ]}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  roleFilter === filter.id ? styles.filterChipTextActive : undefined,
                ]}
              >
                {filter.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.filterChipCount,
                  roleFilter === filter.id ? styles.filterChipCountActive : undefined,
                ]}
              >
                {filter.count}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          {[
            { id: 'all' as const, label: 'Any status', count: recentMatches.length },
            { id: 'matched' as const, label: 'Matched', count: matchedCount },
            { id: 'ended' as const, label: 'Ended', count: endedCount },
          ].map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setStatusFilter(filter.id)}
              style={({ pressed }) => [
                styles.filterChip,
                statusFilter === filter.id ? styles.filterChipActive : undefined,
                pressed ? styles.filterChipPressed : undefined,
              ]}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  statusFilter === filter.id ? styles.filterChipTextActive : undefined,
                ]}
              >
                {filter.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.filterChipCount,
                  statusFilter === filter.id ? styles.filterChipCountActive : undefined,
                ]}
              >
                {filter.count}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {filteredMatches.length > 0 ? (
          filteredMatches.map((session) => (
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
          <ThemedText style={styles.cardCopy}>
            {recentMatches.length > 0
              ? 'No sessions match this filter yet.'
              : 'No recent sessions yet. Your future matches will appear here.'}
          </ThemedText>
        )}
      </ThemedView>

      {orderedMatches[0] ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Most recent</ThemedText>
          <SessionOutcomeCard
            title="Latest session"
            sessionId={orderedMatches[0].id}
            status={orderedMatches[0].status}
            currentUserRole={orderedMatches[0].current_user_role ?? 'initiator'}
            createdAt={orderedMatches[0].created_at ?? null}
            endedAt={orderedMatches[0].ended_at ?? null}
            otherMember={{
              user_id: orderedMatches[0].other_profile?.user_id ?? orderedMatches[0].id,
              display_name: orderedMatches[0].other_profile?.display_name ?? 'Another member',
              avatar_url: orderedMatches[0].other_profile?.avatar_url ?? null,
              country_code: orderedMatches[0].other_profile?.country_code ?? 'unknown country',
            }}
          />
          <Link href={`/(private)/sessions/${orderedMatches[0].id}`} style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>Open session detail</ThemedText>
          </Link>
          <FreshnessLine prefix="Updated" timestamp={orderedMatches[0].created_at ?? null} />
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
  hint: { fontSize: 13, lineHeight: 18, opacity: 0.62 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  lookupCard: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    backgroundColor: 'rgba(39,86,107,0.06)',
  },
  lookupInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  lookupHint: { fontSize: 12, lineHeight: 16, opacity: 0.72 },
  lookupResult: { gap: 10 },
  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: 'rgba(39,86,107,0.12)',
    borderColor: 'rgba(39,86,107,0.4)',
  },
  filterChipPressed: { opacity: 0.85 },
  filterChipText: { color: '#27566B', fontWeight: '700' },
  filterChipTextActive: { fontWeight: '800' },
  filterChipCount: { color: '#27566B', opacity: 0.72, fontWeight: '700' },
  filterChipCountActive: { opacity: 1 },
  linkCard: { borderRadius: 24 },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 4,
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  lookupMatchReason: { color: '#27566B', opacity: 0.72, fontSize: 12, lineHeight: 16 },
});
