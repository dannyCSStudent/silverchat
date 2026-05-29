import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OnboardingPathPreview } from '@/components/onboarding-path-preview';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { ONBOARDING_PATH_STEPS } from '@/lib/onboarding';

export default function SignUpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { envError, loading, message, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    setLocalError(null);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Email and password are required.');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      if (password.length < 8) {
        throw new Error('Use at least 8 characters for the password.');
      }

      const normalizedEmail = email.trim();
      await signUp(normalizedEmail, password);
      router.replace({
        pathname: '/(public)/verify-email',
        params: { email: normalizedEmail },
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to create account.');
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Phase 1</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Create a SilverChat account
        </ThemedText>
        <ThemedText style={styles.copy}>
          The app currently uses email/password auth through Supabase. Profile setup starts after sign-in.
        </ThemedText>
      </ThemedView>

      <OnboardingPathPreview
        activeIndex={0}
        body="Create the account, verify the email address, then continue through profile, interests, and queue access."
        steps={ONBOARDING_PATH_STEPS}
        title="What happens next"
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
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          style={[styles.input, { color: colors.text }]}
          value={password}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          style={[styles.input, { color: colors.text }]}
          value={confirmPassword}
        />

        <Pressable disabled={loading || !!envError} onPress={() => void submit()} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>
            {loading ? 'Creating account...' : 'Create account'}
          </ThemedText>
        </Pressable>

        <Link href="/(public)/login" style={styles.inlineLink}>
          <ThemedText style={styles.linkText}>Already have an account? Sign in</ThemedText>
        </Link>
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
  inlineLink: { paddingVertical: 4 },
  linkText: { color: '#27566B', fontWeight: '700' },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
