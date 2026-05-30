import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreference, useThemePreference } from '@/lib/theme-preference';
import { useAuth } from '@/lib/auth';

export default function PreferencesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const themePreference = useThemePreference();
  const { loading, profile, saveProfile } = useAuth();

  const profileStatus = profile?.profile_status ?? 'pending';
  const isPaused = profileStatus === 'paused';
  const isActive = profileStatus === 'active';

  const handleToggleAvailability = async () => {
    if (!profile) {
      return;
    }

    await saveProfile({
      display_name: profile.display_name,
      date_of_birth: profile.date_of_birth,
      bio: profile.bio ?? undefined,
      avatar_url: profile.avatar_url ?? undefined,
      country_code: profile.country_code ?? undefined,
      age_verified_status: profile.age_verified_status,
      profile_status: isPaused ? 'active' : 'paused',
    });
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>Preferences</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Theme and device setup
        </ThemedText>
        <ThemedText style={styles.copy}>
          Keep display and matchmaking controls in one place.
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Availability</ThemedText>
          <ThemedText style={styles.sectionMeta}>
            {isActive ? 'Visible in queue' : isPaused ? 'Paused' : profileStatus}
          </ThemedText>
        </View>
        <ThemedText style={styles.helperText}>
          Pausing hides your profile from matchmaking until you are ready to return.
        </ThemedText>
        <View style={styles.availabilityRow}>
          <View style={styles.availabilityCopy}>
            <ThemedText style={styles.availabilityLabel}>
              {isPaused ? 'You are currently paused.' : 'You are currently available.'}
            </ThemedText>
            <ThemedText style={styles.helperText}>
              {isPaused
                ? 'Resume when you want to show up in the queue again.'
                : 'Pause if you need a break or want to stay out of matchmaking.'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => void handleToggleAvailability()}
            disabled={!profile || loading}
            style={({ pressed }) => [
              styles.availabilityButton,
              isPaused ? styles.availabilityButtonActive : styles.availabilityButtonMuted,
              (pressed || loading) ? styles.buttonPressed : undefined,
            ]}
          >
            <ThemedText
              style={[
                styles.availabilityButtonText,
                !isPaused ? styles.availabilityButtonTextLight : styles.availabilityButtonTextDark,
              ]}
            >
              {loading ? 'Saving...' : isPaused ? 'Resume matchmaking' : 'Pause matchmaking'}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, isDark && styles.sectionDark]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Appearance</ThemedText>
          <ThemedText style={styles.sectionMeta}>
            {themePreference?.preference === 'system'
              ? `Following ${colorScheme}`
              : `${themePreference?.preference ?? colorScheme} locked`}
          </ThemedText>
        </View>
        <ThemedText style={styles.helperText}>
          Choose a fixed light or dark theme, or follow the device setting while testing screens.
        </ThemedText>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => {
            const selected = themePreference?.preference === option;

            return (
              <Pressable
                key={option}
                onPress={() => themePreference?.setPreference(option)}
                style={[
                  styles.themeChip,
                  isDark && styles.themeChipDark,
                  selected && styles.themeChipSelected,
                ]}>
                <ThemedText
                  style={[styles.themeChipText, selected && styles.themeChipTextSelected]}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 18 },
  hero: { borderRadius: 28, padding: 22, gap: 10 },
  eyebrow: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.3, opacity: 0.62 },
  title: { fontSize: 30, lineHeight: 34 },
  copy: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  section: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    backgroundColor: 'rgba(255,251,245,0.82)',
    gap: 14,
  },
  sectionDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: 'rgba(24,33,43,0.82)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  helperText: { fontSize: 13, lineHeight: 20, color: '#64748B' },
  availabilityRow: { gap: 12 },
  availabilityCopy: { gap: 4 },
  availabilityLabel: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  availabilityButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  availabilityButtonActive: {
    backgroundColor: '#27566B',
    borderColor: '#27566B',
  },
  availabilityButtonMuted: {
    borderColor: 'rgba(24,33,43,0.12)',
    backgroundColor: '#FFF8F2',
  },
  buttonPressed: { opacity: 0.85 },
  availabilityButtonText: { fontSize: 14, fontWeight: '700' },
  availabilityButtonTextLight: { color: '#FFF8F2' },
  availabilityButtonTextDark: { color: '#27566B' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8F2',
  },
  themeChipDark: {
    borderColor: 'rgba(244,237,228,0.08)',
    backgroundColor: '#151B22',
  },
  themeChipSelected: {
    backgroundColor: '#27566B',
    borderColor: '#27566B',
  },
  themeChipText: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  themeChipTextSelected: { color: '#FFF8F2' },
});
