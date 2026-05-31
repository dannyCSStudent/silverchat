import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FlowStepChipList } from '@/components/flow-step-chip-list';
import { FreshnessLine } from '@/components/freshness-line';
import { OnboardingChecklistSummary } from '@/components/onboarding-checklist-summary';
import { OnboardingNextStepCard } from '@/components/onboarding-next-step-card';
import { ReadinessMetricList } from '@/components/readiness-metric-list';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { getOnboardingNextAction } from '@/lib/onboarding';
import { getProfileFieldImpact, getMatchSignalGuidance, getMatchSignalSuggestion } from '@/lib/match-signals';

export default function SetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const {
    availableInterests,
    interests,
    loading,
    message,
    onboardingChecklist,
    profile,
    queueEligible,
    saveInterests,
    refreshData,
    lastSyncedAt,
  } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedInterests(interests);
  }, [interests]);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
    }, [refreshData]),
  );

  const groupedInterests = useMemo(() => {
    return availableInterests.reduce<Record<string, typeof availableInterests>>((groups, interest) => {
      const key = interest.category ?? 'General';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(interest);
      return groups;
    }, {});
  }, [availableInterests]);

  const matchInterestSuggestion = useMemo(
    () => getMatchSignalSuggestion(availableInterests, selectedInterests, profile),
    [availableInterests, profile, selectedInterests],
  );
  const matchBoostGuidance = getMatchSignalGuidance({
    surface: 'setup',
    suggestion: matchInterestSuggestion,
  });
  const nextAction = getOnboardingNextAction(onboardingChecklist);

  function toggleInterest(interestId: string) {
    setSelectedInterests((current) =>
      current.includes(interestId)
        ? current.filter((value) => value !== interestId)
        : [...current, interestId].slice(0, 12),
    );
  }

  async function submitInterests() {
    setLocalError(null);

    try {
      if (!profile) {
        throw new Error('Complete the profile step first.');
      }

      if (selectedInterests.length === 0) {
        throw new Error('Select at least one interest.');
      }

      await saveInterests(selectedInterests);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to save interests.');
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Onboarding</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Choose conversation interests
        </ThemedText>
        <ThemedText style={styles.copy}>
          Matching should not open until the user has a saved profile and at least one interest.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardLabel}>Readiness</ThemedText>
        <ReadinessMetricList
          metrics={[
            { label: 'Profile saved', value: profile ? 'Yes' : 'No' },
            { label: 'Selected interests', value: `${selectedInterests.length}` },
            { label: 'Onboarding complete', value: profile?.onboarding_completed_at ? 'Yes' : 'No' },
            { label: 'Queue eligible', value: queueEligible ? 'Yes' : 'No' },
          ]}
        />
        <FreshnessLine prefix="Last synced" timestamp={lastSyncedAt} />
      </ThemedView>

      {nextAction ? (
        <OnboardingNextStepCard
          action={nextAction}
          body="Continue from the first unfinished onboarding step before choosing interests."
        />
      ) : null}

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Interest selection</ThemedText>
        {matchInterestSuggestion && matchBoostGuidance ? (
          <View style={styles.suggestionCard}>
            <ThemedText style={styles.suggestionLabel}>{matchBoostGuidance.title}</ThemedText>
            <ThemedText style={styles.suggestionCopy}>
              {matchBoostGuidance.hint}
            </ThemedText>
            {matchInterestSuggestion.kind === 'profile' ? (
              <View style={styles.impactList}>
                {matchInterestSuggestion.missingProfileFields?.map((field) => (
                  <View key={`impact-${field}`} style={styles.impactRow}>
                    <ThemedText style={styles.impactLabel}>{field}</ThemedText>
                    <ThemedText style={styles.impactCopy}>{getProfileFieldImpact(field)}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
            <FlowStepChipList
              accentColor="#1F7A61"
              steps={matchInterestSuggestion.kind === 'profile' ? matchInterestSuggestion.missingFlowSteps ?? [] : []}
            />
            {matchInterestSuggestion.kind === 'profile' ? (
              <Link href="/(private)/(tabs)" style={styles.suggestionLink}>
                <ThemedText style={styles.secondaryButtonText}>
                  {matchBoostGuidance.actionLabel}
                </ThemedText>
              </Link>
            ) : null}
          </View>
        ) : null}
        {Object.entries(groupedInterests).map(([category, items]) => (
          <View key={category} style={styles.group}>
            <ThemedText style={styles.groupLabel}>{category}</ThemedText>
            <View style={styles.chipRow}>
              {items.map((interest) => {
                const selected = selectedInterests.includes(interest.id);

                return (
                  <Pressable
                    key={interest.id}
                    onPress={() => toggleInterest(interest.id)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {interest.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable disabled={loading || !profile} onPress={() => void submitInterests()} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>
            {loading ? 'Saving...' : 'Save interests'}
          </ThemedText>
        </Pressable>

        <Link href="/(private)/(tabs)/queue" style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>Review matchmaking gate</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Full onboarding checklist</ThemedText>
        <OnboardingChecklistSummary items={onboardingChecklist} />
      </ThemedView>

      {localError ? <ThemedText style={styles.errorText}>{localError}</ThemedText> : null}
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
  suggestionCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
    backgroundColor: 'rgba(31,122,97,0.08)',
  },
  suggestionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.68 },
  suggestionCopy: { fontSize: 14, lineHeight: 20, opacity: 0.84 },
  suggestionLink: { paddingTop: 6, alignSelf: 'flex-start' },
  impactList: { gap: 10 },
  impactRow: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(31,122,97,0.06)',
  },
  impactLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.9, color: '#1F7A61' },
  impactCopy: { fontSize: 14, lineHeight: 20, opacity: 0.78 },
  group: { gap: 10 },
  groupLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', opacity: 0.64 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.18)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: { borderColor: '#27566B', backgroundColor: '#27566B' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#27566B' },
  chipTextSelected: { color: '#FFF8F2' },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#1F7A61',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF8F2', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(39,86,107,0.24)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#27566B', fontWeight: '700' },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
