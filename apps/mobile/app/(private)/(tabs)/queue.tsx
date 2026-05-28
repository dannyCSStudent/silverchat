import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

export default function QueueScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { joinQueue, loading, matchPreview, message, onboardingChecklist, profile, queueEligible, refreshData } = useAuth();
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<{
    user_id: string;
    display_name: string;
    avatar_url?: string;
    country_code?: string;
  } | null>(null);
  const [matchContext, setMatchContext] = useState<{
    pool: 'preferred' | 'fallback';
    reason: string;
    shared_interests: string[];
  } | null>(null);
  const [refreshingPreview, setRefreshingPreview] = useState(false);

  async function handleQueueAttempt() {
    if (!queueEligible) {
      setLocalMessage('Finish the remaining onboarding steps before joining the queue.');
      return;
    }

    setLocalMessage(null);

    try {
      const response = await joinQueue();
      setMatchedProfile(response.matched_profile ?? null);
      setMatchContext(response.match_context ?? null);
      setLocalMessage(
        response.status === 'matched'
          ? `Matched with ${response.matched_profile?.display_name ?? 'another member'}.`
          : 'You are in queue. Stay available while we look for a conversation.',
      );
    } catch (error) {
      setMatchedProfile(null);
      setMatchContext(null);
      setLocalMessage(error instanceof Error ? error.message : 'Unable to join matchmaking.');
    }
  }

  async function handleRefreshSignals() {
    setRefreshingPreview(true);
    try {
      await refreshData();
      setLocalMessage('Match signals refreshed.');
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Unable to refresh match signals.');
    } finally {
      setRefreshingPreview(false);
    }
  }

  const incompleteSteps = onboardingChecklist.filter((item) => !item.complete);
  const matchPoolLabel =
    matchPreview?.recommended_pool === 'preferred'
      ? 'Preferred pool'
      : matchPreview?.recommended_pool === 'fallback'
        ? 'Fallback pool'
        : matchPreview?.recommended_pool === 'queue'
          ? 'Waiting queue'
          : null;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Readiness</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Matchmaking gate
        </ThemedText>
        <ThemedText style={styles.copy}>
          This screen decides whether the current account can enter random video matchmaking.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardLabel}>Eligibility</ThemedText>
        <ThemedText style={styles.statusText}>
          {queueEligible ? 'Ready for matchmaking' : 'Not ready yet'}
        </ThemedText>
        <ThemedText style={styles.cardCopy}>
          Profile status: {profile?.profile_status ?? 'pending'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Checklist</ThemedText>
        <View style={styles.checklist}>
          {onboardingChecklist.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <View style={[styles.checkIndicator, item.complete && styles.checkIndicatorComplete]} />
              <ThemedText style={styles.checkText}>{item.label}</ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>

      {!queueEligible ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Next actions</ThemedText>
          {incompleteSteps.map((item) => (
            <ThemedText key={item.id} style={styles.cardCopy}>
              - {item.label}
            </ThemedText>
          ))}
          <View style={styles.linkGroup}>
            <Link href="/(private)/(tabs)" style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Complete profile</ThemedText>
            </Link>
            <Link href="/(private)/(tabs)/setup" style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Finish interests</ThemedText>
            </Link>
          </View>
        </ThemedView>
      ) : (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Queue unlock state</ThemedText>
          <ThemedText style={styles.cardCopy}>
            Your account passes the current client-side gate and can call the matchmaking join endpoint.
          </ThemedText>
        </ThemedView>
      )}

      {queueEligible && matchPreview ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Match signals</ThemedText>
          <ThemedText style={styles.cardCopy}>{matchPreview.recommendation}</ThemedText>
          <ThemedText style={styles.cardCopy}>{matchPreview.recommendation_reason}</ThemedText>
          {matchPreview.top_shared_category || matchPreview.top_shared_interest ? (
            <ThemedText style={styles.cardCopy}>
              Strongest overlap: {matchPreview.top_shared_category ?? 'Interest'} · {matchPreview.top_shared_interest ?? 'shared interest'}
            </ThemedText>
          ) : null}
          <ThemedText style={styles.cardCopy}>
            Updated {new Date(matchPreview.generated_at).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </ThemedText>
          <View style={styles.signalGrid}>
            <View style={styles.signalChip}>
              <ThemedText style={styles.signalValue}>{matchPreview.available_candidates}</ThemedText>
              <ThemedText style={styles.signalLabel}>Available</ThemedText>
            </View>
            <View style={styles.signalChip}>
              <ThemedText style={styles.signalValue}>{matchPreview.preferred_candidates}</ThemedText>
              <ThemedText style={styles.signalLabel}>Preferred</ThemedText>
            </View>
            <View style={styles.signalChip}>
              <ThemedText style={styles.signalValue}>{matchPreview.fallback_candidates}</ThemedText>
              <ThemedText style={styles.signalLabel}>Fallback</ThemedText>
            </View>
          </View>
          {matchPreview.shared_interests.length > 0 ? (
            <ThemedText style={styles.cardCopy}>
              Shared interests: {matchPreview.shared_interests.join(', ')}
            </ThemedText>
          ) : null}
          {matchPoolLabel ? <ThemedText style={styles.cardCopy}>Match pool: {matchPoolLabel}</ThemedText> : null}
          <Pressable
            disabled={refreshingPreview}
            onPress={() => void handleRefreshSignals()}
            style={[styles.secondaryActionButton, refreshingPreview && styles.secondaryActionButtonMuted]}>
            <ThemedText style={styles.secondaryActionButtonText}>
              {refreshingPreview ? 'Refreshing...' : 'Refresh signals'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}

      {matchedProfile ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Latest match</ThemedText>
          <View style={styles.matchCard}>
            {matchedProfile.avatar_url ? (
              <Image source={{ uri: matchedProfile.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <ThemedText style={styles.avatarFallbackText}>
                  {matchedProfile.display_name.slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <View style={styles.matchCopy}>
              <ThemedText style={styles.matchName}>{matchedProfile.display_name}</ThemedText>
              <ThemedText style={styles.cardCopy}>
                {matchedProfile.country_code ?? 'Country not set'}
              </ThemedText>
            </View>
          </View>
          {matchContext ? (
            <View style={styles.matchContextCard}>
              <ThemedText style={styles.cardLabel}>Why this match</ThemedText>
              <ThemedText style={styles.cardCopy}>{matchContext.reason}</ThemedText>
              {matchContext.shared_interests.length > 0 ? (
                <ThemedText style={styles.cardCopy}>
                  Shared interests: {matchContext.shared_interests.join(', ')}
                </ThemedText>
              ) : null}
              <ThemedText style={styles.cardCopy}>
                Match pool: {matchContext.pool === 'preferred' ? 'preferred' : 'fallback'}
              </ThemedText>
            </View>
          ) : null}
        </ThemedView>
      ) : null}

      <Pressable
        disabled={loading}
        onPress={() => void handleQueueAttempt()}
        style={[styles.primaryButton, (!queueEligible || loading) && styles.primaryButtonMuted]}>
        <ThemedText style={styles.primaryButtonText}>
          {loading ? 'Joining...' : queueEligible ? 'Join queue' : 'Why can’t I join yet?'}
        </ThemedText>
      </Pressable>

      {localMessage ? <ThemedText style={styles.successText}>{localMessage}</ThemedText> : null}
      {message ? <ThemedText style={styles.successText}>{message}</ThemedText> : null}
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
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  statusText: { fontSize: 22, fontWeight: '700' },
  checklist: { gap: 12 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(183,68,68,0.7)' },
  checkIndicatorComplete: { backgroundColor: '#1F7A61' },
  checkText: { fontSize: 15, lineHeight: 22 },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  signalChip: {
    minWidth: 92,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(24,33,43,0.06)',
    gap: 2,
  },
  signalLabel: { fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.7 },
  signalValue: { fontSize: 20, fontWeight: '700' },
  matchCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  matchCopy: { flex: 1, gap: 4 },
  matchContextCard: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
    backgroundColor: 'rgba(39,86,107,0.08)',
  },
  matchName: { fontSize: 18, fontWeight: '700' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(24,33,43,0.08)' },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27566B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { color: '#FFF8F2', fontSize: 22, fontWeight: '700' },
  linkGroup: { gap: 10 },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#1F7A61',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonMuted: { backgroundColor: '#62707F' },
  primaryButtonText: { color: '#FFF8F2', fontWeight: '700' },
  secondaryActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionButtonMuted: { opacity: 0.6 },
  secondaryActionButtonText: { color: '#27566B', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
