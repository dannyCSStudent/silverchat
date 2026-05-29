import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OnboardingChecklistSummary } from '@/components/onboarding-checklist-summary';
import { OnboardingNextStepCard } from '@/components/onboarding-next-step-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { getOnboardingNextActionAfterEmail } from '@/lib/onboarding';

export default function VerifyEmailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { email: routeEmail } = useLocalSearchParams<{ email?: string | string[] }>();
  const {
    emailAddress,
    emailVerified,
    initialized,
    loading,
    message,
    onboardingChecklist,
    refreshData,
    resendVerificationEmail,
    session,
    signOut,
  } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const nextAction = emailVerified ? getOnboardingNextActionAfterEmail(onboardingChecklist) : null;
  const expectedEmail = Array.isArray(routeEmail) ? routeEmail[0] : routeEmail;

  async function resend() {
    setLocalError(null);

    try {
      await resendVerificationEmail();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to resend verification email.');
    }
  }

  async function refreshVerification() {
    setLocalError(null);

    try {
      await refreshData();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to refresh verification state.');
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Verification</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Confirm your email before onboarding
        </ThemedText>
        <ThemedText style={styles.copy}>
          SilverChat requires a confirmed email before profile setup and queue access continue.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Current status</ThemedText>
        <ThemedText style={styles.cardCopy}>
          {session
            ? `Signed in as ${emailAddress ?? expectedEmail ?? 'unknown email'}`
            : expectedEmail
              ? `Waiting for ${expectedEmail}`
              : 'Not signed in'}
        </ThemedText>
        <ThemedText style={styles.cardCopy}>
          {initialized && emailVerified ? 'Email verified.' : 'Email verification pending.'}
        </ThemedText>
        <OnboardingChecklistSummary items={onboardingChecklist} />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardLabel}>Next step</ThemedText>
        <ThemedText style={styles.cardCopy}>
          Open the verification email from Supabase, confirm the address, then return here and refresh.
        </ThemedText>

        <Pressable disabled={loading || !session} onPress={() => void refreshVerification()} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>
            {loading ? 'Refreshing...' : 'I verified my email'}
          </ThemedText>
        </Pressable>

        <Pressable disabled={loading || !session} onPress={() => void resend()} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>Resend verification email</ThemedText>
        </Pressable>

        <View style={styles.linkRow}>
          <Link href="/(public)/login" style={styles.inlineLink}>
            <ThemedText style={styles.linkText}>Back to sign in</ThemedText>
          </Link>
          <Pressable disabled={loading || !session} onPress={() => void signOut()}>
            <ThemedText style={styles.linkText}>Use another account</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {nextAction ? (
        <OnboardingNextStepCard
          action={nextAction}
          body="Email is confirmed, so continue onboarding from the next unfinished step."
        />
      ) : null}

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
  title: { fontSize: 32, lineHeight: 36 },
  copy: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  card: { borderRadius: 24, padding: 18, gap: 12 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
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
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  inlineLink: { paddingVertical: 4 },
  linkText: { color: '#27566B', fontWeight: '700' },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
