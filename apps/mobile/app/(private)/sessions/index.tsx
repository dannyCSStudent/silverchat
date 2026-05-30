import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FreshnessLine } from '@/components/freshness-line';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

export default function MatchHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { recentMatches } = useAuth();
  const [roleFilter, setRoleFilter] = useState<'all' | 'initiator' | 'recipient'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'ended'>('all');
  const [sessionLookup, setSessionLookup] = useState('');
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

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
  const durationSummary = useMemo(() => {
    const lengthsInMinutes = orderedMatches
      .map((session) => {
        if (!session.created_at || !session.ended_at) {
          return null;
        }

        const startedAt = new Date(session.created_at).getTime();
        const endedAt = new Date(session.ended_at).getTime();
        if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt <= startedAt) {
          return null;
        }

        return Math.round((endedAt - startedAt) / 60000);
      })
      .filter((length): length is number => length !== null);

    if (lengthsInMinutes.length === 0) {
      return {
        average: '—',
        longest: '—',
      };
    }

    const totalMinutes = lengthsInMinutes.reduce((sum, length) => sum + length, 0);
    const averageMinutes = Math.max(1, Math.round(totalMinutes / lengthsInMinutes.length));
    const longestMinutes = Math.max(...lengthsInMinutes);

    return {
      average: averageMinutes === 1 ? 'About 1 minute' : `${averageMinutes} minutes`,
      longest: longestMinutes === 1 ? 'About 1 minute' : `${longestMinutes} minutes`,
    };
  }, [orderedMatches]);
  const historyMetrics = [
    { label: 'Total sessions', value: String(recentMatches.length) },
    { label: 'Initiated', value: String(initiatedCount) },
    { label: 'Received', value: String(receivedCount) },
    { label: 'Matched', value: String(matchedCount) },
    { label: 'Ended', value: String(endedCount) },
    { label: 'Avg length', value: durationSummary.average },
    { label: 'Longest', value: durationSummary.longest },
  ];
  const recentActivity = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const buckets = new Map<string, number>();
    const today = new Date();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      buckets.set(date.toDateString(), 0);
    }

    orderedMatches.forEach((session) => {
      if (!session.created_at) {
        return;
      }

      const createdAt = new Date(session.created_at);
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      createdAt.setHours(0, 0, 0, 0);
      const key = createdAt.toDateString();
      if (!buckets.has(key)) {
        return;
      }

      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return Array.from(buckets.entries()).map(([key, count]) => ({
      label: formatter.format(new Date(key)),
      count,
    }));
  }, [orderedMatches]);
  const sessionIdHint = orderedMatches[0]?.id ? `Most recent session id: ${orderedMatches[0].id}` : null;
  const lookupHint = 'Try a session id, member name, country code, initiator, recipient, matched, or ended.';
  const lookupShortcuts = useMemo(
    () => {
      const shortcuts = [
        { label: 'Initiated', value: 'initiator' },
        { label: 'Received', value: 'recipient' },
        { label: 'Matched', value: 'matched' },
        { label: 'Ended', value: 'ended' },
      ];

      const recentCountryCode = orderedMatches[0]?.other_profile?.country_code?.trim().toLowerCase();
      if (recentCountryCode) {
        shortcuts.unshift({
          label: recentCountryCode.toUpperCase(),
          value: recentCountryCode,
        });
      }

      return shortcuts;
    },
    [orderedMatches],
  );
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
  const handleLookupSubmit = () => {
    if (lookupMatches.length === 1) {
      router.push(`/(private)/sessions/${lookupMatches[0].session.id}`);
    }
  };
  const handleCopySessionId = async (sessionId: string) => {
    await Clipboard.setStringAsync(sessionId);
    setCopiedSessionId(sessionId);
  };

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
          <View style={styles.lookupHeader}>
            <ThemedText style={styles.cardLabel}>Jump to a session</ThemedText>
            {sessionLookup.trim() ? (
              <Pressable onPress={() => setSessionLookup('')} style={({ pressed }) => [styles.clearButton, pressed ? styles.filterChipPressed : undefined]}>
                <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            placeholder="Paste a session id or member name"
            placeholderTextColor="rgba(39,86,107,0.52)"
            value={sessionLookup}
            onChangeText={setSessionLookup}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleLookupSubmit}
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
          <View style={styles.shortcutRow}>
            {lookupShortcuts.map((shortcut) => (
              <Pressable
                key={shortcut.value}
                onPress={() => setSessionLookup(shortcut.value)}
                style={({ pressed }) => [
                  styles.shortcutChip,
                  sessionLookup.trim().toLowerCase() === shortcut.value ? styles.shortcutChipActive : undefined,
                  pressed ? styles.filterChipPressed : undefined,
                ]}
              >
                <ThemedText
                  style={[
                    styles.shortcutChipText,
                    sessionLookup.trim().toLowerCase() === shortcut.value ? styles.shortcutChipTextActive : undefined,
                  ]}
                >
                  {shortcut.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {lookupMatches.length > 0 ? (
            <View style={styles.lookupResult}>
              <ThemedText style={styles.cardCopy}>
                Found {lookupMatches.length} matching session{lookupMatches.length === 1 ? '' : 's'}
                {sessionLookup.trim() ? ` for "${sessionLookup.trim()}"` : ''}.
              </ThemedText>
              {lookupMatches.slice(0, 3).map(({ session, matchReasons }) => (
                <View key={session.id} style={styles.lookupMatchCard}>
                  <Link href={`/(private)/sessions/${session.id}`} style={styles.secondaryButton}>
                    <ThemedText style={styles.secondaryButtonText}>
                      Open {session.other_profile?.display_name ?? 'session'} detail
                    </ThemedText>
                    <ThemedText style={styles.lookupMatchReason}>
                      Matched by {matchReasons.join(', ')}
                    </ThemedText>
                  </Link>
                  <Pressable
                    onPress={() => handleCopySessionId(session.id)}
                    style={({ pressed }) => [
                      styles.copyButton,
                      pressed ? styles.filterChipPressed : undefined,
                    ]}
                  >
                    <ThemedText style={styles.copyButtonText}>
                      {copiedSessionId === session.id ? 'Copied session id' : 'Copy session id'}
                    </ThemedText>
                  </Pressable>
                </View>
              ))}
              {lookupMatches.length > 3 ? (
                <ThemedText style={styles.cardCopy}>
                  Showing the first 3 matches. Narrow the name, id, or code to find a specific session.
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
        <ReadinessMetricList metrics={historyMetrics} />
        <View style={styles.activityBlock}>
          <ThemedText style={styles.cardLabel}>Recent activity</ThemedText>
          <View style={styles.activityList}>
            {recentActivity.map((day) => (
              <View key={day.label} style={styles.activityRow}>
                <ThemedText style={styles.activityLabel}>{day.label}</ThemedText>
                <ThemedText style={styles.activityValue}>
                  {day.count} session{day.count === 1 ? '' : 's'}
                </ThemedText>
              </View>
            ))}
          </View>
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
          <Pressable
            onPress={() => handleCopySessionId(orderedMatches[0].id)}
            style={({ pressed }) => [styles.copyButton, pressed ? styles.filterChipPressed : undefined]}
          >
            <ThemedText style={styles.copyButtonText}>
              {copiedSessionId === orderedMatches[0].id ? 'Copied session id' : 'Copy session id'}
            </ThemedText>
          </Pressable>
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
  lookupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lookupInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  lookupHint: { fontSize: 12, lineHeight: 16, opacity: 0.72 },
  shortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcutChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shortcutChipActive: {
    backgroundColor: 'rgba(39,86,107,0.12)',
    borderColor: 'rgba(39,86,107,0.34)',
  },
  shortcutChipText: { color: '#27566B', fontSize: 12, fontWeight: '700' },
  shortcutChipTextActive: { fontWeight: '800' },
  lookupResult: { gap: 10 },
  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  activityBlock: {
    gap: 10,
    paddingTop: 4,
  },
  activityList: {
    gap: 8,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  activityLabel: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.72,
  },
  activityValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    opacity: 0.86,
  },
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
  lookupMatchCard: { gap: 8 },
  clearButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: { color: '#27566B', fontSize: 12, fontWeight: '700' },
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
  copyButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  copyButtonText: { color: '#27566B', fontWeight: '700' },
});
