import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreference, useThemePreference } from '@/lib/theme-preference';

export default function PreferencesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const themePreference = useThemePreference();

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
          Keep display controls in one place while the onboarding flow is being built.
        </ThemedText>
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
