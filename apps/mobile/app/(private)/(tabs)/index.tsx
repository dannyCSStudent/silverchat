import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { getMatchSignalGuidance, getMatchSignalSuggestion } from '@/lib/match-signals';
import { pickAvatarAsset, uploadAvatar } from '@/lib/storage';
import { formatRelativeTimestamp } from '@repo/types';

function formatDateInput(value: string) {
  return value.trim();
}

export default function AccountScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const {
    onboardingChecklist,
    loading,
    message,
    profile,
    queueEligible,
    sessionState,
    signOut,
    user,
    saveProfile,
    lastSyncedAt,
    refreshData,
  } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const [countryCode, setCountryCode] = useState(profile?.country_code ?? 'US');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const profileMatchSuggestion = profile ? getMatchSignalSuggestion([], [], profile) : null;
  const profileGuidance = getMatchSignalGuidance({
    surface: 'account',
    suggestion: profileMatchSuggestion,
  });
  const scrollViewRef = useRef<ScrollView | null>(null);
  const displayNameRef = useRef<TextInput | null>(null);
  const dateOfBirthRef = useRef<TextInput | null>(null);
  const countryCodeRef = useRef<TextInput | null>(null);
  const bioRef = useRef<TextInput | null>(null);
  const profileCardOffsetRef = useRef(0);
  const fieldOffsetsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setDateOfBirth(profile?.date_of_birth ?? '');
    setCountryCode(profile?.country_code ?? 'US');
    setBio(profile?.bio ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void refreshData();
    }, [refreshData]),
  );

  function focusProfileField(field: 'displayName' | 'dateOfBirth' | 'countryCode' | 'bio') {
    const fieldRefMap = {
      bio: bioRef,
      countryCode: countryCodeRef,
      dateOfBirth: dateOfBirthRef,
      displayName: displayNameRef,
    } as const;
    const inputRef = fieldRefMap[field];
    const scrollOffset = profileCardOffsetRef.current + (fieldOffsetsRef.current[field] ?? 0) - 24;

    scrollViewRef.current?.scrollTo({ animated: true, y: Math.max(0, scrollOffset) });
    inputRef.current?.focus();
  }

  async function handlePickAvatar() {
    if (!user) {
      setLocalError('You must be signed in first.');
      return;
    }

    setLocalError(null);
    setAvatarUploading(true);

    try {
      const asset = await pickAvatarAsset();
      if (!asset) {
        return;
      }

      const result = await uploadAvatar({
        file: 'file' in asset ? ((asset as typeof asset & { file?: File | null }).file ?? null) : null,
        mimeType: asset.mimeType,
        uri: asset.uri,
        userId: user.id,
      });

      setAvatarUrl(result.publicUrl);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function submitProfile() {
    setLocalError(null);

    try {
      if (!displayName.trim()) {
        throw new Error('Display name is required.');
      }

      if (!dateOfBirth.trim()) {
        throw new Error('Date of birth is required.');
      }

      await saveProfile({
        avatar_url: avatarUrl.trim(),
        bio: bio.trim(),
        country_code: countryCode.trim().toUpperCase(),
        date_of_birth: formatDateInput(dateOfBirth),
        display_name: displayName.trim(),
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to save profile.');
    }
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Account</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Profile and trust setup
        </ThemedText>
        <ThemedText style={styles.copy}>
          This screen owns the 40+ product gate inputs and the core onboarding identity fields.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.copyGroup}>
            <ThemedText type="subtitle">{user?.email ?? 'Signed in user'}</ThemedText>
            <ThemedText style={styles.cardCopy}>
              {sessionState?.user.email_confirmed_at ? 'Email confirmed' : 'Email confirmation pending'}
            </ThemedText>
            {lastSyncedAt ? (
              <ThemedText style={styles.cardCopy}>{formatRelativeTimestamp(lastSyncedAt)}</ThemedText>
            ) : null}
          </View>
          <Pressable disabled={loading} onPress={() => void signOut()}>
            <ThemedText style={styles.linkText}>Sign out</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {profileMatchSuggestion?.kind === 'profile' ? (
        <ThemedView style={[styles.card, styles.attentionCard]}>
          <ThemedText style={styles.attentionLabel}>{profileGuidance?.title ?? 'Match readiness'}</ThemedText>
          <ThemedText type="subtitle">Finish profile basics first</ThemedText>
          <ThemedText style={styles.cardCopy}>
            {profileGuidance?.hint ?? 'Complete the remaining editable profile fields before joining matchmaking.'}
          </ThemedText>
          <View style={styles.missingFieldList}>
            {profileMatchSuggestion.missingProfileFields?.map((field) => {
              const fieldKey =
                field === 'display name'
                  ? 'displayName'
                  : field === 'date of birth'
                    ? 'dateOfBirth'
                    : field === 'country code'
                      ? 'countryCode'
                      : null;

              return fieldKey ? (
                <Pressable key={field} onPress={() => focusProfileField(fieldKey)} style={styles.missingFieldChip}>
                  <ThemedText style={styles.missingFieldText}>{field}</ThemedText>
                </Pressable>
              ) : (
                <View key={field} style={styles.missingFieldChip}>
                  <ThemedText style={styles.missingFieldText}>{field}</ThemedText>
                </View>
              );
            })}
          </View>
          {profileMatchSuggestion.missingFlowSteps?.length ? (
            <Link href="/(private)/(tabs)/setup" style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                {profileGuidance?.actionLabel ?? 'Finish onboarding'}
              </ThemedText>
            </Link>
          ) : null}
        </ThemedView>
      ) : null}

      <ThemedView
        onLayout={(event) => {
          profileCardOffsetRef.current = event.nativeEvent.layout.y;
        }}
        style={styles.card}>
        <ThemedText style={styles.cardLabel}>Profile</ThemedText>
        <View
          onLayout={(event) => {
            fieldOffsetsRef.current.displayName = event.nativeEvent.layout.y;
          }}>
          <TextInput
            ref={displayNameRef}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor="#94A3B8"
            style={[styles.input, { color: colors.text }]}
            value={displayName}
          />
        </View>
        <View
          onLayout={(event) => {
            fieldOffsetsRef.current.dateOfBirth = event.nativeEvent.layout.y;
          }}>
          <TextInput
            ref={dateOfBirthRef}
            onChangeText={setDateOfBirth}
            placeholder="Date of birth (YYYY-MM-DD)"
            placeholderTextColor="#94A3B8"
            style={[styles.input, { color: colors.text }]}
            value={dateOfBirth}
          />
        </View>
        <View
          onLayout={(event) => {
            fieldOffsetsRef.current.countryCode = event.nativeEvent.layout.y;
          }}>
          <TextInput
            ref={countryCodeRef}
            autoCapitalize="characters"
            maxLength={2}
            onChangeText={setCountryCode}
            placeholder="Country code"
            placeholderTextColor="#94A3B8"
            style={[styles.input, { color: colors.text }]}
            value={countryCode}
          />
        </View>
        <View style={styles.avatarSection}>
          <ThemedText style={styles.avatarLabel}>Avatar</ThemedText>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarPreview} resizeMode="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarPlaceholderText}>No photo selected</ThemedText>
            </View>
          )}
          <View style={styles.avatarActions}>
            <Pressable disabled={avatarUploading || loading} onPress={() => void handlePickAvatar()} style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                {avatarUploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Choose photo'}
              </ThemedText>
            </Pressable>
            {avatarUrl ? (
              <Pressable disabled={avatarUploading || loading} onPress={() => setAvatarUrl('')} style={styles.secondaryLink}>
                <ThemedText style={styles.linkText}>Remove photo</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View
          onLayout={(event) => {
            fieldOffsetsRef.current.bio = event.nativeEvent.layout.y;
          }}>
          <TextInput
            ref={bioRef}
            multiline
            onChangeText={setBio}
            placeholder="Short bio"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textarea, { color: colors.text }]}
            value={bio}
          />
        </View>

        <Pressable disabled={loading || avatarUploading} onPress={() => void submitProfile()} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>
            {loading ? 'Saving...' : 'Save profile'}
          </ThemedText>
        </Pressable>

        <Link href="/(private)/(tabs)/setup" style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>Continue to interests</ThemedText>
        </Link>
        <Link href="/(private)/preferences" style={styles.secondaryLink}>
          <ThemedText style={styles.linkText}>Open preferences</ThemedText>
        </Link>
      </ThemedView>

      {profile ? (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardLabel}>Current status</ThemedText>
          <ThemedText style={styles.cardCopy}>Profile status: {profile.profile_status}</ThemedText>
          <ThemedText style={styles.cardCopy}>Age verification: {profile.age_verified_status}</ThemedText>
          <ThemedText style={styles.cardCopy}>
            Onboarding: {sessionState?.onboarding_complete ? 'Complete' : 'In progress'}
          </ThemedText>
          <ThemedText style={styles.cardCopy}>
            Queue eligible: {queueEligible ? 'Yes' : 'No'}
          </ThemedText>
          {onboardingChecklist.map((item) => (
            <ThemedText key={item.id} style={styles.cardCopy}>
              {item.complete ? 'Complete' : 'Pending'}: {item.label}
            </ThemedText>
          ))}
        </ThemedView>
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
  attentionCard: {
    borderWidth: 1,
    borderColor: 'rgba(183,68,68,0.18)',
    backgroundColor: 'rgba(183,68,68,0.06)',
  },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.62 },
  attentionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#B74444' },
  cardCopy: { fontSize: 15, lineHeight: 22, opacity: 0.8 },
  copyGroup: { flex: 1, gap: 4 },
  rowBetween: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' },
  missingFieldList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  missingFieldChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  missingFieldText: { fontSize: 13, fontWeight: '700', color: '#B74444' },
  avatarSection: { gap: 10 },
  avatarLabel: { fontSize: 13, fontWeight: '700', opacity: 0.7, textTransform: 'uppercase' },
  avatarPreview: { width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(24,33,43,0.08)' },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(24,33,43,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  avatarPlaceholderText: { fontSize: 12, lineHeight: 16, textAlign: 'center', opacity: 0.65 },
  avatarActions: { gap: 8, alignItems: 'flex-start' },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.12)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textarea: { minHeight: 112, textAlignVertical: 'top' },
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
  secondaryLink: { paddingVertical: 4 },
  linkText: { color: '#27566B', fontWeight: '700' },
  errorText: { color: '#B74444', fontSize: 14, lineHeight: 20 },
  successText: { color: '#1F7A61', fontSize: 14, lineHeight: 20 },
});
