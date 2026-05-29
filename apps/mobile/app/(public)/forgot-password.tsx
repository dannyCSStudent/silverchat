import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OnboardingPathPreview } from '@/components/onboarding-path-preview';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { envError, loading, message, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    setLocalError(null);

    try {
      if (!email.trim()) {
        throw new Error('Email is required.');
      }

      await requestPasswordReset(email.trim());
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to request a reset.');
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Support</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Reset your password
        </ThemedText>
        <ThemedText style={styles.copy}>
          Supabase will send the recovery email. The app does not yet have a full in-app password reset completion flow.
        </ThemedText>
      </ThemedView>

      <OnboardingPathPreview
        activeIndex={0}
        body="Password recovery is a short detour: send the reset email, sign back in, then continue the same onboarding path."
        steps={['Send reset email', 'Sign in again', 'Verify email if needed', 'Continue onboarding']}
        title="Where reset fits"
      />

      <ThemedView style={styles.card}>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          style={[styles.input, { color: colors.text }]}
          value={email}
        />
        <Pressable disabled={loading || !!envError} onPress={() => void submit()} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>
            {loading ? 'Sending...' : 'Send reset email'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {envError ? <ThemedText style={styles.errorText}>{envError}</ThemedText> : null}
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
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.12)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#1F7A61',
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF8F2', fontWeight: '700' },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
