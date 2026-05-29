import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OnboardingPathPreview } from '@/components/onboarding-path-preview';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { mobileEnv } from '@/lib/env';
import { ONBOARDING_PATH_STEPS } from '@/lib/onboarding';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { envError, loading, message, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    setLocalError(null);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Email and password are required.');
      }

      await signIn(email.trim(), password);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to sign in.');
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>SilverChat</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Sign in to continue
        </ThemedText>
        <ThemedText style={styles.copy}>
          Safe random video chat for adults 40+, built around onboarding and trust signals first.
        </ThemedText>
      </ThemedView>

      <OnboardingPathPreview
        body="Sign in, verify email if needed, then continue through profile setup, interests, and queue access."
        steps={ONBOARDING_PATH_STEPS}
        title="Your onboarding path"
      />

      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardLabel}>Connection</ThemedText>
        <ThemedText style={styles.cardCopy}>API: {mobileEnv.apiBaseUrl}</ThemedText>
        {envError ? <ThemedText style={styles.errorText}>{envError}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Welcome back</ThemedText>
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
        <Pressable disabled={loading || !!envError} onPress={() => void submit()} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>
            {loading ? 'Signing in...' : 'Sign in'}
          </ThemedText>
        </Pressable>
        <View style={styles.linkRow}>
          <Link href="/(public)/signup" style={styles.inlineLink}>
            <ThemedText style={styles.linkText}>Create account</ThemedText>
          </Link>
          <Link href="/(public)/forgot-password" style={styles.inlineLink}>
            <ThemedText style={styles.linkText}>Forgot password</ThemedText>
          </Link>
        </View>
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
  title: { fontSize: 32, lineHeight: 36 },
  copy: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  card: { borderRadius: 24, padding: 18, gap: 12 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
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
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  inlineLink: { paddingVertical: 4 },
  linkText: { color: '#27566B', fontWeight: '700' },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
