import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FlowStepChipList } from '@/components/flow-step-chip-list';
import { FreshnessLine } from '@/components/freshness-line';
import { OnboardingChecklistSummary } from '@/components/onboarding-checklist-summary';
import { OnboardingNextStepCard } from '@/components/onboarding-next-step-card';
import { SessionMemberCard } from '@/components/session-member-card';
import { SessionOutcomeCard } from '@/components/session-outcome-card';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authorizedApiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getOnboardingNextAction } from '@/lib/onboarding';
import {
  getMatchPoolExplanation,
  getMatchPoolMessage,
  getMatchPreviewGuidance,
  getMatchSignalGuidance,
  getMatchSignalSuggestion,
} from '@/lib/match-signals';

export default function QueueScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const {
    availableInterests,
    interests,
    joinQueue,
    loading,
    matchPreview,
    message,
    onboardingChecklist,
    profile,
    session,
    queueEntry,
    queueEligible,
    refreshData,
    lastSyncedAt,
    queuePosition,
    queueSize,
    membersAhead,
    recentMatches,
  } = useAuth();
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<{
    user_id: string;
    display_name: string;
    avatar_url?: string;
    country_code?: string;
  } | null>(null);
  const [matchedSessionId, setMatchedSessionId] = useState<string | null>(null);
  const [matchedSessionDetail, setMatchedSessionDetail] = useState<{
    id: string;
    status?: string | null;
    current_user_role: 'initiator' | 'recipient';
    created_at?: string | null;
    ended_at?: string | null;
    other_profile?: {
      user_id: string;
      display_name: string;
      avatar_url?: string | null;
      country_code?: string | null;
    } | null;
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
      setMatchedSessionId(response.session_id ?? null);
      setMatchContext(response.match_context ?? null);
      setMatchedSessionDetail(null);
      setLocalMessage(
        response.status === 'matched'
          ? `Matched with ${response.matched_profile?.display_name ?? 'another member'}.`
          : 'You are in queue. Stay available while we look for a conversation.',
      );
      if (response.status === 'matched' && response.session_id) {
        if (!session) {
          return;
        }

        try {
          const detail = await authorizedApiRequest<{
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
          }>(session, `/match/sessions/${response.session_id}`);
          setMatchedSessionDetail({
            id: detail.session.id,
            status: detail.session.status ?? null,
            current_user_role: detail.current_user_role,
            created_at: detail.session.created_at ?? null,
            ended_at: detail.session.ended_at ?? null,
            other_profile: detail.session.other_profile ?? null,
          });
        } catch {
          // Ignore snapshot refresh issues here; the queue can still render with the match payload.
        }
      }
    } catch (error) {
      setMatchedProfile(null);
      setMatchedSessionId(null);
      setMatchedSessionDetail(null);
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

  useFocusEffect(
    useCallback(() => {
      if (!queueEligible) {
        return;
      }

      void refreshData();
    }, [queueEligible, refreshData]),
  );

  useEffect(() => {
    if (!queueEligible) {
      return;
    }

    const interval = setInterval(() => {
      void refreshData();
    }, 15000);

    return () => clearInterval(interval);
  }, [queueEligible, refreshData]);

  const incompleteSteps = onboardingChecklist.filter((item) => !item.complete);
  const queueBlockerSuggestion = getMatchSignalSuggestion(availableInterests, interests, profile);
  const queueBlockerGuidance = getMatchSignalGuidance({
    surface: 'queue',
    suggestion: queueBlockerSuggestion,
  });
  const nextAction = getOnboardingNextAction(onboardingChecklist);
  const queueBlockerTitle = queueBlockerGuidance?.title ?? 'Next actions';
  const queueBlockerActionLabel = queueBlockerGuidance?.actionLabel ?? null;
  const matchPreviewGuidance = getMatchPreviewGuidance({
    availableInterests,
    interests,
    matchPreview,
    profile,
  });
  const matchPoolLabel =
    matchPreview?.recommended_pool === 'preferred'
      ? 'Preferred pool'
      : matchPreview?.recommended_pool === 'fallback'
        ? 'Fallback pool'
        : matchPreview?.recommended_pool === 'queue'
          ? 'Waiting queue'
          : null;
  const matchPoolMessage = getMatchPoolMessage(matchPreview?.recommended_pool ?? null);
  const matchPoolExplanation = getMatchPoolExplanation(matchPreview?.recommended_pool ?? null);
  const matchImprovementTitle = !queueEligible
    ? queueBlockerTitle
    : matchPreviewGuidance?.title ?? null;
  const matchImprovementHint = !queueEligible ? null : matchPreviewGuidance?.hint ?? null;
  const queueWaitSummary = (() => {
    if (!queueEntry) {
      return null;
    }

    if (queuePosition === null) {
      return 'Your place in line will update as the queue refreshes.';
    }

    if (queuePosition <= 1) {
      return 'You are first in line. Stay available for an immediate match.';
    }

    if (membersAhead !== null) {
      if (membersAhead <= 2) {
        return `${membersAhead} member${membersAhead === 1 ? '' : 's'} ahead of you.`;
      }

      return `${membersAhead} members ahead of you, so the wait may be longer.`;
    }

    return `You are number ${queuePosition} in line.`;
  })();

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
        <ReadinessMetricList
          metrics={[{ label: 'Profile status', value: profile?.profile_status ?? 'pending' }]}
        />
        <FreshnessLine prefix="Last synced" timestamp={lastSyncedAt} />
      </ThemedView>

      {nextAction ? (
        <OnboardingNextStepCard
          action={nextAction}
          body="Finish the next onboarding step before returning to the queue."
        />
      ) : null}

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Checklist</ThemedText>
        <View style={styles.checklist}>
          <OnboardingChecklistSummary items={onboardingChecklist} />
        </View>
      </ThemedView>

      {!queueEligible ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{queueBlockerTitle}</ThemedText>
          {incompleteSteps.map((item) => (
            <ThemedText key={item.id} style={styles.cardCopy}>
              - {item.label}
            </ThemedText>
          ))}
          <FlowStepChipList
            accentColor="#27566B"
            steps={queueBlockerSuggestion?.missingFlowSteps ?? []}
          />
          <View style={styles.linkGroup}>
            {queueBlockerSuggestion?.kind === 'profile' && queueBlockerActionLabel ? (
              <Link href="/(private)/(tabs)" style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{queueBlockerActionLabel}</ThemedText>
              </Link>
            ) : null}
            {queueBlockerSuggestion?.kind !== 'profile' && queueBlockerActionLabel ? (
              <Link href="/(private)/(tabs)/setup" style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>{queueBlockerActionLabel}</ThemedText>
              </Link>
            ) : null}
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
              Strongest overlap: {matchPreview.top_shared_category ?? 'Interest'}
              {matchPreview.top_shared_category_count ? ` (${matchPreview.top_shared_category_count})` : ''}
              {matchPreview.top_shared_interest ? ` · ${matchPreview.top_shared_interest}` : ''}
            </ThemedText>
          ) : null}
          <FreshnessLine timestamp={matchPreview.generated_at} />
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
          {matchPoolMessage ? <ThemedText style={styles.cardCopy}>{matchPoolMessage}</ThemedText> : null}
          {matchPoolExplanation ? <ThemedText style={styles.cardCopy}>{matchPoolExplanation}</ThemedText> : null}
          {queueWaitSummary ? <ThemedText style={styles.cardCopy}>{queueWaitSummary}</ThemedText> : null}
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

      {queueEntry && !matchedProfile ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Waiting in queue</ThemedText>
          <ThemedText style={styles.cardCopy}>
            You are currently waiting for the best available match. Keep the app open and stay available.
          </ThemedText>
          <FreshnessLine prefix="Queue updated" timestamp={lastSyncedAt} />
          <FreshnessLine prefix="Queued" timestamp={queueEntry.queued_at ?? null} />
          <FreshnessLine prefix="Last active" timestamp={queueEntry.last_active_at ?? null} />
          {matchPoolExplanation ? <ThemedText style={styles.cardCopy}>{matchPoolExplanation}</ThemedText> : null}
          {queueWaitSummary ? <ThemedText style={styles.cardCopy}>{queueWaitSummary}</ThemedText> : null}
          <ReadinessMetricList
            metrics={[
              { label: 'Status', value: queueEntry.is_available ? 'Available' : 'Unavailable' },
              { label: 'Country', value: queueEntry.country_code ?? 'Not set' },
              { label: 'Language', value: queueEntry.preferred_language ?? 'Any' },
              {
                label: 'Position',
                value:
                  queuePosition && queuePosition > 0 ? `#${queuePosition}` : 'Waiting for position',
              },
              { label: 'Ahead', value: membersAhead !== null ? String(membersAhead) : '—' },
              { label: 'Queue size', value: queueSize > 0 ? String(queueSize) : '—' },
            ]}
          />
        </ThemedView>
      ) : null}

      {matchImprovementHint ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{matchImprovementTitle ?? 'Improve matches'}</ThemedText>
          <ThemedText style={styles.cardCopy}>{matchImprovementHint}</ThemedText>
          {matchPreview?.recommended_pool !== 'queue' && !queueEligible ? (
            <Link href="/(private)/(tabs)" style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                {queueBlockerActionLabel ?? 'Open profile'}
              </ThemedText>
            </Link>
          ) : null}
          <View style={styles.linkGroup}>
            <Link href="/(private)/(tabs)/setup" style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Review interests</ThemedText>
            </Link>
            <Link href="/(private)/(tabs)" style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>Update profile</ThemedText>
            </Link>
          </View>
        </ThemedView>
      ) : null}

      {matchedProfile ? (
        <ThemedView style={styles.card}>
          {matchedSessionDetail ? (
            <SessionOutcomeCard
              title="Latest match"
              sessionId={matchedSessionDetail.id}
              status={matchedSessionDetail.status}
              currentUserRole={matchedSessionDetail.current_user_role}
              createdAt={matchedSessionDetail.created_at ?? null}
              endedAt={matchedSessionDetail.ended_at ?? null}
              otherMember={{
                user_id: matchedSessionDetail.other_profile?.user_id ?? matchedProfile.user_id,
                display_name:
                  matchedSessionDetail.other_profile?.display_name ?? matchedProfile.display_name,
                avatar_url: matchedSessionDetail.other_profile?.avatar_url ?? matchedProfile.avatar_url ?? null,
                country_code:
                  matchedSessionDetail.other_profile?.country_code ?? matchedProfile.country_code ?? 'Country not set',
              }}
            />
          ) : (
            <SessionMemberCard
              title="Latest match"
              member={matchedProfile}
              leading={
                matchedProfile.avatar_url ? (
                  <Image source={{ uri: matchedProfile.avatar_url }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <ThemedText style={styles.avatarFallbackText}>
                      {matchedProfile.display_name.slice(0, 1).toUpperCase()}
                    </ThemedText>
                  </View>
                )
              }
              footer={<ThemedText style={styles.cardCopy}>Matched just now in the active queue.</ThemedText>}
            />
          )}
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
              <ThemedText style={styles.cardCopy}>
                {matchContext.pool === 'preferred'
                  ? 'Preferred pool means same-country members were available.'
                  : 'Fallback pool means the app used the best available overlap.'}
              </ThemedText>
            </View>
          ) : null}
          {matchedSessionId ? (
            <Link href={`/(private)/sessions/${matchedSessionId}`} style={styles.sessionLink}>
              <ThemedText style={styles.sessionLinkText}>Open session detail</ThemedText>
            </Link>
          ) : null}
        </ThemedView>
      ) : null}

      {recentMatches.length > 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Recent matches</ThemedText>
          {recentMatches.slice(0, 3).map((session) => (
            <Link key={session.id} href={`/(private)/sessions/${session.id}`} style={styles.recentMatchLink}>
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
          ))}
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
  matchContextCard: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
    backgroundColor: 'rgba(39,86,107,0.08)',
  },
  sessionLink: {
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  sessionLinkText: { color: '#27566B', fontWeight: '700' },
  recentMatchLink: { borderRadius: 18, padding: 2 },
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
